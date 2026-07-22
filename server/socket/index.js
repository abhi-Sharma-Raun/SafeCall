export function registerSocketHandlers(io) {
  const roomPeers = new Map()

  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomId, sessionId, role }) => {
      if (!roomId) {
        return
      }

      const occupants = roomPeers.get(roomId) || new Set()
      const isInitiator = occupants.size === 0

      occupants.add(socket.id)
      roomPeers.set(roomId, occupants)

      socket.data.roomId = roomId
      socket.data.sessionId = sessionId || roomId
      socket.data.role = role || 'guest'
      socket.join(roomId)

      socket.emit('room:joined', {
        roomId,
        sessionId: socket.data.sessionId,
        isInitiator,
        peerCount: occupants.size
      })

      socket.to(roomId).emit('peer:joined', {
        roomId,
        sessionId: socket.data.sessionId,
        peerId: socket.id,
        role: socket.data.role
      })
    })

    socket.on('webrtc:offer', (payload) => {
      if (socket.data.roomId) {
        socket.to(socket.data.roomId).emit('webrtc:offer', payload)
      }
    })

    socket.on('webrtc:answer', (payload) => {
      if (socket.data.roomId) {
        socket.to(socket.data.roomId).emit('webrtc:answer', payload)
      }
    })

    socket.on('webrtc:ice-candidate', (payload) => {
      if (socket.data.roomId) {
        socket.to(socket.data.roomId).emit('webrtc:ice-candidate', payload)
      }
    })

    socket.on('call:transcript', (payload) => {
      if (socket.data.roomId) {
        socket.to(socket.data.roomId).emit('call:transcript', payload)
      }
    })

    socket.on('leave-room', () => {
      const roomId = socket.data.roomId
      if (!roomId) {
        return
      }

      const occupants = roomPeers.get(roomId)
      if (occupants) {
        occupants.delete(socket.id)
        if (occupants.size === 0) {
          roomPeers.delete(roomId)
        }
      }

      socket.leave(roomId)
      socket.to(roomId).emit('peer:left', {
        roomId,
        peerId: socket.id
      })
      socket.data.roomId = undefined
      socket.data.sessionId = undefined
      socket.data.role = undefined
    })

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId
      if (!roomId) {
        return
      }

      const occupants = roomPeers.get(roomId)
      if (occupants) {
        occupants.delete(socket.id)
        if (occupants.size === 0) {
          roomPeers.delete(roomId)
        }
      }

      socket.to(roomId).emit('peer:left', {
        roomId,
        peerId: socket.id
      })
    })
  })
}