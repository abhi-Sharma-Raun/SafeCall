import { useEffect, useMemo, useState } from 'react'
import { fetchAlerts, fetchIncidents, fetchSessions } from '../lib/api'
import { formatDuration, formatTimestamp, shortId } from '../lib/format'
import { getStatusLabel, levelReached, splitRiskHighlights } from '../lib/risk'
import RiskMeter from './RiskMeter'

function StatusTag({ level }) {
  const tone = level === 'CRITICAL' ? 'text-critical-500' : level === 'ELEVATED' ? 'text-caution-500' : 'text-institute-500'

  return <span className={`rounded-[0.95rem] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ring-1 ring-inset ${tone} bg-graphite-900/30`}>{getStatusLabel(level)}</span>
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-graphite-700 bg-graphite-900/55 p-6 text-sm text-graphite-400">
      <div className="text-base font-medium text-graphite-100">{title}</div>
      <div className="mt-2 leading-6">{body}</div>
    </div>
  )
}

function DataBox({ label, value }) {
  return (
    <div className="rounded-[1.2rem] border border-graphite-700 bg-graphite-900/70 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-graphite-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-graphite-50">{value}</div>
    </div>
  )
}

function TranscriptLine({ entry }) {
  const pieces = splitRiskHighlights(entry.text)

  return (
    <div className={`rounded-[1.2rem] border p-3 ${entry.flagged ? 'border-caution-500/30 bg-caution-500/8' : 'border-graphite-700 bg-graphite-900/60'}`}>
      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-graphite-400">
        <span className="font-mono">{formatTimestamp(entry.createdAt)}</span>
        <span>{entry.flagged ? 'flagged' : 'observed'}</span>
      </div>
      <p className="font-mono text-sm leading-6 text-graphite-100">
        {pieces.map((piece, index) => (
          <span
            key={`${piece.text}-${index}`}
            className={piece.highlighted ? 'rounded bg-caution-500/18 px-1 font-medium text-graphite-50' : ''}
          >
            {piece.text}
          </span>
        ))}
      </p>
    </div>
  )
}

function IncidentCard({ incident }) {
  if (!incident) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-graphite-700 bg-graphite-900/55 p-4 text-sm text-graphite-400">
        No incident report has been generated for this session yet.
      </div>
    )
  }

  return (
    <div className="rounded-[1.35rem] border border-critical-500/25 bg-graphite-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-graphite-400">incident report</div>
          <div className="mt-1 text-lg font-semibold text-graphite-50">{incident.caseId}</div>
        </div>
        <StatusTag level={incident.riskLevel || 'CRITICAL'} />
      </div>
      <div className="mt-3 space-y-3 text-sm text-graphite-200">
        <div>{incident.summary}</div>
        <div className="rounded-[1.2rem] border border-graphite-700 bg-black/20 p-3 font-mono text-xs leading-6 text-graphite-300">
          {incident.transcriptExcerpt || 'Transcript excerpt unavailable.'}
        </div>
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-graphite-400">risk factors</div>
          <div className="flex flex-wrap gap-2">
            {(incident.riskFactors || []).map((factor, index) => (
              <span key={`${factor.type || factor.detail}-${index}`} className="rounded-[0.95rem] border border-graphite-700 bg-graphite-900 px-2 py-1 text-[11px] text-graphite-200">
                {factor.detail || factor.type}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CommandDashboard({ socket, onFocusCall }) {
  const [sessions, setSessions] = useState([])
  const [incidents, setIncidents] = useState([])
  const [alerts, setAlerts] = useState([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        const [sessionPayload, incidentPayload, alertPayload] = await Promise.all([
          fetchSessions(),
          fetchIncidents(),
          fetchAlerts()
        ])

        if (!mounted) {
          return
        }

        setSessions(sessionPayload.sessions || [])
        setIncidents(incidentPayload.incidents || [])
        setAlerts(alertPayload.alerts || [])
        setActiveSessionId((current) => current || sessionPayload.sessions?.[0]?.sessionId || '')
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!socket) {
      return undefined
    }

    const upsertSession = (incoming) => {
      if (!incoming?.sessionId) {
        return
      }

      setSessions((current) => {
        const index = current.findIndex((item) => item.sessionId === incoming.sessionId)
        if (index === -1) {
          return [incoming.snapshot || incoming, ...current]
        }

        const next = [...current]
        next[index] = {
          ...next[index],
          ...(incoming.snapshot || incoming)
        }
        return next.sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))
      })
    }

    const handleSessionUpdate = ({ snapshot }) => {
      if (snapshot) {
        upsertSession(snapshot)
      }
    }

    const handleRiskUpdate = ({ sessionId, riskScore, riskLevel, flaggedSignals, recommendedAction }) => {
      if (!sessionId) {
        return
      }

      setSessions((current) => current.map((session) => session.sessionId === sessionId ? {
        ...session,
        riskScore,
        riskLevel,
        flaggedSignalCount: Math.max(session.flaggedSignalCount || 0, flaggedSignals?.length || 0),
        status: getStatusLabel(riskLevel),
        recommendedAction,
        updatedAt: new Date().toISOString()
      } : session))
    }

    const handleIncidentCreated = (incident) => {
      if (!incident?.sessionId) {
        return
      }

      setIncidents((current) => {
        const exists = current.some((item) => item.sessionId === incident.sessionId)
        if (exists) {
          return current.map((item) => item.sessionId === incident.sessionId ? incident : item)
        }

        return [incident, ...current]
      })
    }

    const handleTranscript = (payload) => {
      if (!payload?.sessionId) {
        return
      }

      setSessions((current) => current.map((session) => session.sessionId === payload.sessionId ? {
        ...session,
        transcript: [
          ...(session.transcript || []),
          {
            text: payload.transcriptChunk,
            createdAt: payload.createdAt || new Date().toISOString(),
            flagged: false,
            riskScore: session.riskScore || 0
          }
        ],
        updatedAt: new Date().toISOString()
      } : session))
    }

    socket.on('session:update', handleSessionUpdate)
    socket.on('call:risk-update', handleRiskUpdate)
    socket.on('incident:created', handleIncidentCreated)
    socket.on('call:transcript', handleTranscript)

    return () => {
      socket.off('session:update', handleSessionUpdate)
      socket.off('call:risk-update', handleRiskUpdate)
      socket.off('incident:created', handleIncidentCreated)
      socket.off('call:transcript', handleTranscript)
    }
  }, [socket])

  useEffect(() => {
    if (!activeSessionId && sessions[0]?.sessionId) {
      setActiveSessionId(sessions[0].sessionId)
    }
  }, [activeSessionId, sessions])

  const selectedSession = useMemo(() => sessions.find((session) => session.sessionId === activeSessionId) || sessions[0] || null, [activeSessionId, sessions])
  const selectedIncident = useMemo(() => incidents.find((incident) => incident.sessionId === selectedSession?.sessionId) || null, [incidents, selectedSession?.sessionId])

  const timelinePoints = selectedSession?.riskTimeline || []
  const hasCritical = levelReached(selectedSession?.riskLevel || 'LOW', 'CRITICAL')

  const exportIncident = async () => {
    if (!selectedIncident) {
      return
    }

    await navigator.clipboard.writeText(JSON.stringify(selectedIncident, null, 2))
  }

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_50%_0%,#18222d_0%,#0d1117_85%)] text-graphite-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="relative z-10 border-b border-white/5 bg-graphite-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-graphite-400">MHA / telecom command dashboard</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Digital arrest alert console</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-graphite-300">
            <div className="rounded-[0.95rem] border border-graphite-700 bg-graphite-900/80 px-3 py-2 font-mono">sessions {sessions.length}</div>
            <div className="rounded-[0.95rem] border border-graphite-700 bg-graphite-900/80 px-3 py-2 font-mono">incidents {incidents.length}</div>
            <div className="rounded-[0.95rem] border border-graphite-700 bg-graphite-900/80 px-3 py-2 font-mono">alerts {alerts.length}</div>
            <button type="button" onClick={onFocusCall} className="rounded-[0.95rem] bg-institute-500 px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white shadow-[0_4px_14px_rgba(78,127,147,0.3)] transition hover:bg-institute-600">
              Focus call surface
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[2rem] border border-graphite-700/80 bg-graphite-800/90 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          <div className="border-b border-graphite-700/80 px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.24em] text-graphite-400">Active sessions</div>
            <div className="mt-1 text-sm text-graphite-300">Ordered by latest update and risk posture.</div>
          </div>
          <div className="no-scrollbar max-h-[calc(100vh-170px)] overflow-auto p-2">
            {loading ? (
              <EmptyState title="Loading sessions" body="Fetching the latest case queue and risk state from the backend." />
            ) : sessions.length ? sessions.map((session) => {
              const selected = session.sessionId === selectedSession?.sessionId
              return (
                <button
                  key={session.sessionId}
                  type="button"
                  onClick={() => setActiveSessionId(session.sessionId)}
                  className={`mb-2 w-full rounded-[1.35rem] border p-3 text-left transition ${selected ? 'border-institute-500/50 bg-institute-500/12 shadow-[0_4px_20px_rgba(78,127,147,0.15)]' : 'border-graphite-700/80 bg-graphite-900/70 hover:border-graphite-500/70 hover:bg-graphite-900'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-graphite-400">{shortId(session.sessionId)}</div>
                      <div className="mt-1 text-sm font-medium text-white">{session.roomId}</div>
                    </div>
                    <StatusTag level={session.riskLevel || 'LOW'} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-graphite-400">
                    <span>{session.status || getStatusLabel(session.riskLevel)}</span>
                    <span>{formatDuration(session.durationSeconds || 0)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-[0.95rem] border border-graphite-700/60 bg-black/25 px-3 py-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${session.riskLevel === 'CRITICAL' ? 'bg-critical-500 animate-pulse' : session.riskLevel === 'ELEVATED' ? 'bg-caution-500' : 'bg-institute-500'}`} />
                      <span className={`text-[11px] uppercase tracking-wider ${session.riskLevel === 'CRITICAL' ? 'text-critical-500 font-semibold' : session.riskLevel === 'ELEVATED' ? 'text-caution-500 font-semibold' : 'text-institute-500'}`}>
                        {session.riskLevel || 'LOW'}
                      </span>
                    </div>
                    <span className="text-graphite-400 font-medium">score {(session.riskScore || 0).toFixed(2)}</span>
                  </div>
                </button>
              )
            }) : (
              <EmptyState title="No sessions yet" body="Start a call on the citizen surface, or seed the demo dataset, and the console will populate here." />
            )}
          </div>
        </aside>

        <main className="rounded-[2rem] border border-graphite-700 bg-graphite-800 shadow-panel">
          {selectedSession ? (
            <div className="flex h-full min-h-[calc(100vh-120px)] flex-col">
              <div className="border-b border-graphite-700 px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-graphite-400">Case detail</div>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-white">{selectedSession.roomId}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-graphite-300">
                      <span className="font-mono">session {shortId(selectedSession.sessionId)}</span>
                      <span className="font-mono">caller {selectedSession.callerNumber || 'simulated'}</span>
                      <span className="font-mono">updated {formatTimestamp(selectedSession.updatedAt || selectedSession.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <RiskMeter level={selectedSession.riskLevel || 'LOW'} score={selectedSession.riskScore || 0} compact />
                    <button type="button" onClick={() => setActiveSessionId(selectedSession.sessionId)} className="rounded-[0.95rem] border border-graphite-700 bg-graphite-900 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-graphite-200">
                      Pin session
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DataBox label="risk score" value={Number(selectedSession.riskScore || 0).toFixed(2)} />
                    <DataBox label="status" value={selectedSession.status || getStatusLabel(selectedSession.riskLevel)} />
                    <DataBox label="flagged signals" value={selectedSession.flaggedSignalCount || 0} />
                    <DataBox label="duration" value={formatDuration(selectedSession.durationSeconds || 0)} />
                  </div>

                  <div className="rounded-[1.35rem] border border-graphite-700 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-graphite-400">Risk timeline</div>
                        <div className="mt-1 text-sm text-graphite-300">The stepped posture changes as chunks are scored.</div>
                      </div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-graphite-500">{timelinePoints.length} points</div>
                    </div>
                    <div className="mt-4 flex h-28 items-end gap-1">
                      {timelinePoints.length ? timelinePoints.map((point, index) => (
                        <div key={`${point.createdAt}-${index}`} className="flex-1 rounded-t-md bg-graphite-700/60">
                          <div
                            className={`rounded-t-md ${point.riskLevel === 'CRITICAL' ? 'bg-critical-500' : point.riskLevel === 'ELEVATED' ? 'bg-caution-500' : 'bg-institute-500'}`}
                            style={{ height: `${Math.max(16, Math.round((point.riskScore || 0) * 100))}%` }}
                          />
                        </div>
                      )) : (
                        <div className="flex h-full w-full items-center justify-center rounded-[1.2rem] border border-dashed border-graphite-700 text-sm text-graphite-500">
                          No risk history yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-graphite-700 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-graphite-400">Transcript stream</div>
                        <div className="mt-1 text-sm text-graphite-300">Flagged phrases are visually emphasized in place.</div>
                      </div>
                      {hasCritical ? <StatusTag level="CRITICAL" /> : <StatusTag level={selectedSession.riskLevel || 'LOW'} />}
                    </div>
                    <div className="no-scrollbar mt-4 max-h-[44vh] space-y-3 overflow-auto pr-2">
                      {(selectedSession.transcript || []).length ? selectedSession.transcript.map((entry, index) => (
                        <TranscriptLine key={`${entry.createdAt}-${index}`} entry={entry} />
                      )) : (
                        <EmptyState title="No transcript chunks" body="Transcript chunks appear here as soon as speech is finalized from the call surface." />
                      )}
                    </div>
                  </div>
                </section>

                <aside className="space-y-4">
                  <div className="rounded-[1.35rem] border border-graphite-700 bg-graphite-900/70 p-4">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-graphite-400">Caller metadata</div>
                    <div className="mt-3 space-y-3 text-sm text-graphite-200">
                      <DataBox label="room id" value={selectedSession.roomId} />
                      <DataBox label="caller number" value={selectedSession.callerNumber || 'simulated'} />
                      <DataBox label="call type" value={selectedSession.isVideoCall ? 'video' : 'audio'} />
                      <DataBox label="status" value={selectedSession.status || getStatusLabel(selectedSession.riskLevel)} />
                    </div>
                  </div>

                  <IncidentCard incident={selectedIncident} />

                  <div className="rounded-[1.35rem] border border-graphite-700 bg-graphite-900/70 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-graphite-400">Live alerts</div>
                      <span className="font-mono text-[11px] text-graphite-500">{alerts.length}</span>
                    </div>
                    <div className="no-scrollbar mt-3 max-h-56 space-y-2 overflow-auto pr-1">
                      {alerts.length ? alerts.slice(0, 6).map((alert, index) => (
                        <div key={`${alert.sessionId}-${index}`} className="rounded-[1.2rem] border border-graphite-700 bg-black/20 p-3 text-sm text-graphite-200">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-graphite-400">{shortId(alert.sessionId)}</span>
                            <StatusTag level={alert.riskLevel || 'LOW'} />
                          </div>
                          <div className="mt-2 text-graphite-300">{alert.flaggedSignals?.[0]?.detail || 'Alert recorded.'}</div>
                        </div>
                      )) : (
                        <EmptyState title="No alerts yet" body="Risk notifications will surface here when the detection contract crosses caution or critical thresholds." />
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-institute-500/20 bg-institute-500/8 p-4 text-sm text-graphite-200">
                    The session snapshot can be exported as a case packet.
                  </div>

                  <button type="button" onClick={exportIncident} className="w-full rounded-[1rem] border border-graphite-700 bg-graphite-900 px-4 py-3 text-sm font-medium text-white transition hover:border-institute-500/40 hover:text-institute-500">
                    Export incident JSON
                  </button>
                </aside>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[calc(100vh-120px)] items-center justify-center p-8 text-center text-graphite-400">
              {error ? <div className="rounded-[1.35rem] border border-critical-500/20 bg-critical-500/10 p-4 text-critical-500">{error}</div> : 'No session selected.'}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}