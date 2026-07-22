import { useEffect, useMemo, useRef, useState } from 'react'
import { detectTranscript, submitIncidentReport } from '../lib/api'
import { formatDuration } from '../lib/format'
import { splitRiskHighlights } from '../lib/risk'
import RiskMeter from './RiskMeter'
import { useCallSession } from '../hooks/useCallSession'
import { useSpeechTranscriber } from '../hooks/useSpeechTranscriber'

const initialRisk = {
  riskScore: 0,
  riskLevel: 'LOW',
  flaggedSignals: [],
  recommendedAction: 'monitor'
}

function StatusChip({ label, tone = 'teal' }) {
  const toneClasses = {
    institute: 'bg-institute-500/10 text-institute-500 ring-institute-500/20',
    caution: 'bg-caution-500/10 text-caution-500 ring-caution-500/20',
    critical: 'bg-critical-500/10 text-critical-500 ring-critical-500/20',
    graphite: 'bg-graphite-100/80 text-graphite-700 ring-graphite-100'
  }

  return <span className={`inline-flex items-center rounded-[0.95rem] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ring-1 ${toneClasses[tone]}`}>{label}</span>
}

function TranscriptRail({ transcript, interimText, onInjectDemo, speechSupported, listening }) {
  const lines = useMemo(() => transcript.slice(-8), [transcript])

  return (
    <aside className="flex h-full flex-col rounded-[1.8rem] border border-graphite-100 bg-graphite-50/92 shadow-panel backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-graphite-100 px-4 py-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-graphite-500">Live transcript</div>
          <div className="font-mono text-[11px] text-graphite-500">{speechSupported ? (listening ? 'mic engaged' : 'mic idle') : 'manual fallback available'}</div>
        </div>
        <StatusChip label={speechSupported ? 'speech api' : 'fallback'} tone={speechSupported ? 'institute' : 'graphite'} />
      </div>
      <div className="no-scrollbar flex-1 space-y-3 overflow-auto px-4 py-4 font-mono text-sm leading-6 text-graphite-700">
        {lines.length ? lines.map((entry, index) => (
          <div key={`${entry.text}-${index}`} className="rounded-[1.25rem] border border-graphite-100 bg-graphite-50 p-3">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-graphite-500">chunk {String(index + 1).padStart(2, '0')}</div>
            <p>
              {splitRiskHighlights(entry.text).map((piece, pieceIndex) => (
                <span
                  key={`${piece.text}-${pieceIndex}`}
                  className={piece.highlighted ? 'rounded bg-caution-500/18 px-1 font-medium text-graphite-900' : ''}
                >
                  {piece.text}
                </span>
              ))}
            </p>
          </div>
        )) : (
          <div className="rounded-[1.25rem] border border-dashed border-graphite-100 bg-graphite-50 p-4 text-graphite-500">
            Waiting for speech input. The transcript rail stays quiet until the call produces a finalized chunk.
          </div>
        )}
        {interimText ? (
          <div className="rounded-[1.25rem] border border-institute-500/20 bg-institute-500/8 p-3 text-graphite-600">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-institute-500">live draft</div>
            {interimText}
          </div>
        ) : null}
      </div>
      <div className="border-t border-graphite-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-[11px] text-graphite-500">
            {speechSupported ? 'Web Speech API is active when the browser permits it.' : 'Use the demo line below if speech recognition is unavailable.'}
          </div>
          <button
            type="button"
            onClick={() => onInjectDemo('The officer said this is a sealed digital arrest case and I must transfer money immediately.')}
            className="rounded-[0.95rem] border border-graphite-100 bg-white px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-graphite-700 transition hover:border-institute-500/40 hover:text-institute-500"
          >
            Inject demo line
          </button>
        </div>
      </div>
    </aside>
  )
}

export default function CallSurface({ socket, sessionId, roomId, setRoomId, onOpenDashboard }) {
  const [draftRoom, setDraftRoom] = useState(roomId)
  const [connected, setConnected] = useState(false)
  const [latestRisk, setLatestRisk] = useState(initialRisk)
  const [transcriptEntries, setTranscriptEntries] = useState([])
  const [callStartedAt, setCallStartedAt] = useState(null)
  const [manualTranscript, setManualTranscript] = useState('')
  const [criticalReport, setCriticalReport] = useState(null)
  const [reportState, setReportState] = useState('idle')
  const fullTranscriptRef = useRef('')
  const latestRiskRef = useRef(latestRisk)

  const {
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
  } = useCallSession({ socket, roomId, sessionId, role: 'citizen' })

  const { supported, isListening, interimText, start, stop, transcriptLines, injectText } = useSpeechTranscriber(async (chunk) => {
    const nextTranscript = [fullTranscriptRef.current, chunk].filter(Boolean).join(' ').trim()
    fullTranscriptRef.current = nextTranscript
    setTranscriptEntries((current) => [...current, { text: chunk, createdAt: new Date().toISOString() }])

    socket?.emit('call:transcript', {
      roomId,
      sessionId,
      transcriptChunk: chunk,
      fullTranscriptSoFar: nextTranscript,
      createdAt: new Date().toISOString()
    })

    try {
      const detection = await detectTranscript({
        sessionId,
        transcriptChunk: chunk,
        fullTranscriptSoFar: nextTranscript,
        callMetadata: {
          durationSeconds: Math.floor((Date.now() - (callStartedAt || Date.now())) / 1000),
          isVideoCall: true,
          callerNumber: roomId,
          roomId
        }
      })

      setLatestRisk(detection)
      latestRiskRef.current = detection

      if (detection.riskLevel === 'CRITICAL') {
        setCriticalReport({
          message: 'This call is showing signs of a digital arrest scam.',
          guidance: 'Do not transfer money, do not share OTPs or screen access, and verify independently through official channels.'
        })
      }
    } catch (transcriptError) {
      setError(transcriptError.message)
    }
  })

  useEffect(() => {
    setDraftRoom(roomId)
  }, [roomId])

  useEffect(() => {
    if (!socket) {
      return undefined
    }

    const handleCriticalIncident = (incidentReport) => {
      if (incidentReport?.sessionId === sessionId) {
        setCriticalReport((current) => current || {
          message: 'This call has crossed the critical threshold.',
          guidance: 'The command center has been notified and an incident record has been generated.'
        })
      }
    }

    socket.on('incident:created', handleCriticalIncident)

    return () => {
      socket.off('incident:created', handleCriticalIncident)
    }
  }, [sessionId, socket])

  const joinCall = async () => {
    const nextRoom = draftRoom.trim() || roomId
    setRoomId(nextRoom)
    try {
      setCallStartedAt(Date.now())
      await connect(nextRoom)
      if (supported) {
        await start()
      }
      setConnected(true)
    } catch (joinError) {
      setCallStartedAt(null)
      setConnected(false)
      setError(joinError.message)
    }
  }

  const leaveCall = () => {
    stop()
    disconnect()
    setConnected(false)
    setCallStartedAt(null)
    fullTranscriptRef.current = ''
    setLatestRisk(initialRisk)
    setTranscriptEntries([])
    setCriticalReport(null)
    setReportState('idle')
  }

  const submitManualTranscript = async () => {
    if (!manualTranscript.trim()) {
      return
    }

    injectText(manualTranscript)
    setManualTranscript('')
  }

  const reportCall = async () => {
    setReportState('submitting')
    try {
      const response = await submitIncidentReport({
        sessionId,
        riskScore: latestRiskRef.current.riskScore || 0,
        riskLevel: latestRiskRef.current.riskLevel || 'CRITICAL',
        flaggedSignals: latestRiskRef.current.flaggedSignals || []
      })

      setCriticalReport((current) => current || {
        message: 'This call has been reported to the command center.',
        guidance: 'The incident record is ready for review on the dashboard.'
      })
      setReportState(response?.incidentReport?.caseId ? 'submitted' : 'submitted')
      onOpenDashboard?.()
    } catch (submissionError) {
      setError(submissionError.message)
      setReportState('idle')
    }
  }

  const elapsedSeconds = callStartedAt ? Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)) : 0
  const callTone = latestRisk.riskLevel === 'CRITICAL' ? 'critical' : latestRisk.riskLevel === 'ELEVATED' ? 'caution' : 'institute'

  return (
    <div className="relative min-h-screen overflow-hidden bg-graphite-50 text-graphite-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(78,127,147,0.18),transparent_34%),linear-gradient(180deg,rgba(237,241,244,0.94),rgba(221,229,234,0.98))]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-3 py-3 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-col gap-3 rounded-[1.8rem] border border-graphite-100 bg-graphite-50/88 px-4 py-3 shadow-panel backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-graphite-500">Citizen call surface</div>
              <div className="text-lg font-semibold tracking-tight text-graphite-900">SafeCall secure intervention room</div>
            </div>
            <StatusChip label={connected ? 'connected' : 'standby'} tone={connected ? 'institute' : 'graphite'} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-graphite-500">
            <div className="rounded-[0.95rem] border border-graphite-100 bg-graphite-50 px-3 py-2 font-mono">room {roomId}</div>
            <div className="rounded-[0.95rem] border border-graphite-100 bg-graphite-50 px-3 py-2 font-mono">elapsed {formatDuration(elapsedSeconds)}</div>
          </div>
        </header>

        {!connected ? (
          <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="relative overflow-hidden rounded-[2rem] border border-graphite-100/80 bg-graphite-50/92 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-sm">
              <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-institute-500/14 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-institute-500/10 blur-3xl" />
              <div className="relative z-10 max-w-2xl space-y-5">
                <div className="text-[11px] uppercase tracking-[0.28em] text-graphite-500">Join or create room</div>
                <h1 className="text-4xl font-semibold tracking-tight text-graphite-900">A restrained call interface that becomes assertive only when the risk rises.</h1>
                <p className="max-w-xl text-sm leading-6 text-graphite-600">
                  The call stays calm and readable until the risk ladder asks for more attention.
                </p>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    value={draftRoom}
                    onChange={(event) => setDraftRoom(event.target.value.toUpperCase())}
                    placeholder="Enter or create room code"
                    className="rounded-[1.05rem] border border-graphite-100 bg-graphite-50 px-4 py-3 font-mono text-sm uppercase tracking-[0.18em] outline-none transition focus:border-institute-500/40 focus:ring-4 focus:ring-institute-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setDraftRoom(`SC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)}
                    className="rounded-[1.05rem] border border-graphite-100 bg-white px-4 py-3 text-sm font-medium text-graphite-700 transition hover:border-institute-500/30 hover:text-institute-500"
                  >
                    Create room
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={joinCall}
                    className="rounded-[1.05rem] bg-institute-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(78,127,147,0.35)] transition hover:bg-institute-600"
                  >
                    Enter call
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomId(draftRoom.trim() || roomId)}
                    className="rounded-[1.05rem] border border-graphite-100 bg-white px-5 py-3 text-sm font-medium text-graphite-700 transition hover:border-institute-500/30 hover:text-institute-500"
                  >
                    Save room code
                  </button>
                </div>
              </div>
            </section>

            <aside className="space-y-4 rounded-[2rem] border border-graphite-100 bg-graphite-50/92 p-5 shadow-panel backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-[0.28em] text-graphite-500">Risk signature</div>
              <RiskMeter level={latestRisk.riskLevel} score={latestRisk.riskScore} />
              <div className="rounded-[1.25rem] border border-graphite-100 bg-graphite-50 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-graphite-400">status</div>
                <div className={`mt-2 text-base font-semibold ${callTone === 'critical' ? 'text-critical-500' : callTone === 'caution' ? 'text-caution-500' : 'text-institute-500'}`}>
                  {connected ? 'Monitoring active' : 'Waiting to start'}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="relative min-h-[66vh] overflow-hidden rounded-[2rem] border border-graphite-100 bg-graphite-900 shadow-panel">
              <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover opacity-92" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,21,26,0.18),rgba(18,21,26,0.48))]" />

              <div className="absolute left-4 right-4 top-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-white/10 bg-graphite-900/78 px-4 py-3 text-white backdrop-blur-md">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/60">call posture</div>
                  <div className="font-semibold">{peerPresent ? 'Peer connected' : 'Waiting for second participant'}</div>
                </div>
                <div className="w-full max-w-[460px]"><RiskMeter level={latestRisk.riskLevel} score={latestRisk.riskScore} compact /></div>
                <div className="text-right text-[11px] uppercase tracking-[0.2em] text-white/60">
                  {status}
                  <div className="font-mono normal-case tracking-normal text-white/80">{peerCount} participant{peerCount === 1 ? '' : 's'}</div>
                </div>
              </div>

              <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-4 right-4 h-32 w-48 rounded-[1.15rem] border border-white/15 object-cover shadow-panel ring-1 ring-white/10 sm:h-36 sm:w-52" />

              <div className="absolute inset-x-4 bottom-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl rounded-[1.5rem] border border-white/10 bg-graphite-900/78 px-4 py-3 text-white backdrop-blur-md">
                  <div className="mb-1 text-[11px] uppercase tracking-[0.24em] text-white/60">risk strip</div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="w-full sm:max-w-[460px]"><RiskMeter level={latestRisk.riskLevel} score={latestRisk.riskScore} compact /></div>
                    <div className="text-sm text-white/80">
                      {latestRisk.riskLevel === 'CRITICAL' ? 'Critical intervention standing by.' : latestRisk.riskLevel === 'ELEVATED' ? 'Risk is elevated. Keep the user on screen and watch the transcript.' : 'Call remains under quiet monitoring.'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-[1.35rem] border border-white/10 bg-graphite-900/78 px-3 py-3 text-white backdrop-blur-md">
                  <button type="button" onClick={toggleMute} className="rounded-[0.95rem] border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/90 transition hover:bg-white/10">
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                  <button type="button" onClick={toggleCamera} className="rounded-[0.95rem] border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/90 transition hover:bg-white/10">
                    {cameraOn ? 'Stop video' : 'Start video'}
                  </button>
                  <button type="button" onClick={leaveCall} className="rounded-[0.95rem] border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/90 transition hover:bg-critical-500/60">
                    End call
                  </button>
                  <button type="button" onClick={onOpenDashboard} className="rounded-[0.95rem] border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/90 transition hover:bg-white/10">
                    Open dashboard
                  </button>
                </div>
              </div>

              {latestRisk.riskLevel === 'CRITICAL' ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-graphite-900/78 px-6 backdrop-blur-sm transition-opacity duration-300">
                  <div className="max-w-2xl rounded-[2rem] border border-critical-500/30 bg-graphite-900/94 p-6 text-white shadow-panel transition duration-300">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/50">Critical intervention</div>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight">This call is showing signs of a digital arrest scam.</h2>
                    <p className="mt-4 text-sm leading-6 text-white/78">
                      Do not transfer money. Do not share OTPs, screen access, or banking credentials. Real agencies do not demand immediate payment over a video call.
                    </p>
                    <div className="mt-4 rounded-[1.25rem] border border-critical-500/20 bg-critical-500/10 p-4 text-sm leading-6 text-white/85">
                      {criticalReport?.guidance || 'Verify independently through official public numbers or a trusted contact. The command center can now review the incident record.'}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={reportCall} className="rounded-[1rem] bg-white px-5 py-3 text-sm font-medium text-graphite-950 transition hover:bg-caution-500">
                        {reportState === 'submitting' ? 'Reporting...' : 'Report this call'}
                      </button>
                      <button type="button" onClick={onOpenDashboard} className="rounded-[1rem] border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                        Review dashboard
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <TranscriptRail
              transcript={transcriptEntries}
              interimText={interimText}
              onInjectDemo={(text) => {
                setManualTranscript(text)
                injectText(text)
              }}
              speechSupported={supported}
              listening={isListening}
            />
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[1.5rem] border border-graphite-100 bg-graphite-50/88 p-4 shadow-panel backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-graphite-500">Pipeline state</div>
                <div className="mt-1 text-sm text-graphite-600">
                  {connected ? 'Transcript chunks stream into detection and update the live risk state.' : 'Join the room to start the call and capture speech.'}
                </div>
              </div>
            </div>
            {error ? <div className="mt-3 rounded-[1.1rem] border border-critical-500/20 bg-critical-500/10 px-4 py-3 text-sm text-critical-500">{error}</div> : null}
          </div>

          <div className="rounded-[1.5rem] border border-graphite-100 bg-graphite-50/88 p-4 shadow-panel backdrop-blur-sm">
            <div className="text-[11px] uppercase tracking-[0.24em] text-graphite-500">Manual transcript</div>
            <div className="mt-3 flex gap-2">
              <input
                value={manualTranscript}
                onChange={(event) => setManualTranscript(event.target.value)}
                placeholder="Inject a demo speech chunk"
                className="min-w-0 flex-1 rounded-[1rem] border border-graphite-100 bg-white px-3 py-2 text-sm font-mono outline-none transition focus:border-institute-500/40 focus:ring-4 focus:ring-institute-500/10"
              />
              <button type="button" onClick={submitManualTranscript} className="rounded-[1rem] bg-institute-500 px-4 py-2 text-sm font-medium text-white shadow-[0_2px_10px_rgba(78,127,147,0.25)] transition hover:bg-institute-600">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}