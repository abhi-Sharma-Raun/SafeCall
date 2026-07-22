import { useCallback, useEffect, useRef, useState } from 'react'

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

export function useCallSession({ socket, roomId, sessionId, role = 'citizen' }) {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const roomIdRef = useRef(roomId)
  const sessionIdRef = useRef(sessionId)
  const initiatorRef = useRef(false)
  const offerSentRef = useRef(false)
  const [status, setStatus] = useState('idle')
  const [peerCount, setPeerCount] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [error, setError] = useState('')
  const [peerPresent, setPeerPresent] = useState(false)

  useEffect(() => {
    roomIdRef.current = roomId
    sessionIdRef.current = sessionId
  }, [roomId, sessionId])

  const attachLocalTracks = useCallback((peerConnection) => {
    const localStream = localStreamRef.current
    if (!localStream) {
      return
    }

    const existingTrackIds = new Set(peerConnection.getSenders().map((sender) => sender.track?.id).filter(Boolean))
    localStream.getTracks().forEach((track) => {
      if (!existingTrackIds.has(track.id)) {
        peerConnection.addTrack(track, localStream)
      }
    })
  }, [])

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current
    }

    const peerConnection = new RTCPeerConnection(rtcConfig)

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc:ice-candidate', {
          roomId: roomIdRef.current,
          sessionId: sessionIdRef.current,
          candidate: event.candidate
        })
      }
    }

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream
      }
    }

    peerConnection.onconnectionstatechange = () => {
      setStatus(peerConnection.connectionState)
    }

    peerConnectionRef.current = peerConnection
    attachLocalTracks(peerConnection)
    return peerConnection
  }, [attachLocalTracks, roomId, sessionId, socket])

  const startOffer = useCallback(async () => {
    if (!peerConnectionRef.current || offerSentRef.current) {
      return
    }

    const offer = await peerConnectionRef.current.createOffer()
    await peerConnectionRef.current.setLocalDescription(offer)
    socket?.emit('webrtc:offer', {
      roomId: roomIdRef.current,
      sessionId: sessionIdRef.current,
      sdp: offer
    })
    offerSentRef.current = true
  }, [socket])

  const connect = useCallback(async (nextRoomId = roomIdRef.current) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Media devices are not available in this browser')
    }

    setError('')
    setStatus('requesting-media')
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    })

    localStreamRef.current = localStream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }

    createPeerConnection()
    socket?.emit('join-room', {
      roomId: nextRoomId,
      sessionId: sessionIdRef.current,
      role
    })

    setStatus('joining')
  }, [createPeerConnection, role, socket])

  const disconnect = useCallback(() => {
    if (roomIdRef.current) {
      socket?.emit('leave-room')
    }

    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    offerSentRef.current = false
    initiatorRef.current = false

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    setPeerCount(0)
    setPeerPresent(false)
    setIsMuted(false)
    setCameraOn(true)
    setStatus('idle')
  }, [])

  useEffect(() => {
    if (!socket) {
      return undefined
    }

    const handleRoomJoined = ({ isInitiator, peerCount: count }) => {
      initiatorRef.current = Boolean(isInitiator)
      setPeerCount(count)
      setPeerPresent(count > 1)
      setStatus(count > 1 ? 'connected' : 'waiting-for-peer')
    }

    const handlePeerJoined = async () => {
      setPeerPresent(true)
      setStatus('negotiating')

      if (initiatorRef.current) {
        await startOffer()
      }
    }

    const handleOffer = async ({ sdp }) => {
      const peerConnection = createPeerConnection()
      await peerConnection.setRemoteDescription(sdp)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      socket.emit('webrtc:answer', {
        roomId,
        sessionId,
        sdp: answer
      })
    }

    const handleAnswer = async ({ sdp }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(sdp)
      }
    }

    const handleCandidate = async ({ candidate }) => {
      try {
        if (peerConnectionRef.current && candidate) {
          await peerConnectionRef.current.addIceCandidate(candidate)
        }
      } catch (iceError) {
        setError(iceError.message)
      }
    }

    const handlePeerLeft = () => {
      setPeerPresent(false)
      setStatus('waiting-for-peer')
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
    }

    socket.on('room:joined', handleRoomJoined)
    socket.on('peer:joined', handlePeerJoined)
    socket.on('webrtc:offer', handleOffer)
    socket.on('webrtc:answer', handleAnswer)
    socket.on('webrtc:ice-candidate', handleCandidate)
    socket.on('peer:left', handlePeerLeft)

    return () => {
      socket.off('room:joined', handleRoomJoined)
      socket.off('peer:joined', handlePeerJoined)
      socket.off('webrtc:offer', handleOffer)
      socket.off('webrtc:answer', handleAnswer)
      socket.off('webrtc:ice-candidate', handleCandidate)
      socket.off('peer:left', handlePeerLeft)
    }
  }, [createPeerConnection, roomId, sessionId, socket, startOffer])

  const toggleMute = () => {
    const localStream = localStreamRef.current
    if (!localStream) {
      return
    }

    const nextMuted = !isMuted
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setIsMuted(nextMuted)
  }

  const toggleCamera = () => {
    const localStream = localStreamRef.current
    if (!localStream) {
      return
    }

    const nextCameraOn = !cameraOn
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = nextCameraOn
    })
    setCameraOn(nextCameraOn)
  }

  return {
    localVideoRef,
    remoteVideoRef,
    connect,
    disconnect,
    status,
    error,
    peerCount,
    peerPresent,
    isMuted,
    cameraOn,
    toggleMute,
    toggleCamera,
    setError
  }
}