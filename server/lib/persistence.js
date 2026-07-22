import Session from '../models/Session.js'
import Alert from '../models/Alert.js'
import IncidentReport from '../models/IncidentReport.js'
import { isMongoReady } from './mongo.js'

const inMemory = {
  sessions: new Map(),
  alerts: [],
  incidents: []
}

const hasMongo = () => Boolean(process.env.MONGODB_URI) && isMongoReady()

const baseSession = (sessionId, roomId, metadata = {}) => ({
  sessionId,
  roomId,
  status: 'Monitoring',
  riskScore: 0,
  riskLevel: 'LOW',
  flaggedSignalCount: 0,
  durationSeconds: 0,
  callerNumber: metadata.callerNumber || '',
  isVideoCall: Boolean(metadata.isVideoCall ?? true),
  transcript: [],
  riskTimeline: [],
  metadata,
  lastTranscriptChunk: '',
  startedAt: new Date(),
  endedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
})

export async function upsertSessionFromDetection({ sessionId, roomId, detection, transcriptChunk, fullTranscriptSoFar, callMetadata }) {
  if (hasMongo()) {
    const existing = await Session.findOne({ sessionId })
    const nextTranscript = {
      text: transcriptChunk,
      riskScore: detection.riskScore,
      flagged: detection.flaggedSignals.length > 0,
      createdAt: new Date()
    }
    const nextTimelinePoint = {
      riskScore: detection.riskScore,
      riskLevel: detection.riskLevel,
      createdAt: new Date()
    }

    if (!existing) {
      return Session.create({
        sessionId,
        roomId,
        status: detection.riskLevel === 'CRITICAL' ? 'Escalated' : detection.riskLevel === 'ELEVATED' ? 'Elevated' : 'Monitoring',
        riskScore: detection.riskScore,
        riskLevel: detection.riskLevel,
        flaggedSignalCount: detection.flaggedSignals.length,
        durationSeconds: callMetadata.durationSeconds || 0,
        callerNumber: callMetadata.callerNumber || '',
        isVideoCall: Boolean(callMetadata.isVideoCall ?? true),
        transcript: [nextTranscript],
        riskTimeline: [nextTimelinePoint],
        metadata: {
          ...callMetadata,
          fullTranscriptSoFar
        },
        lastTranscriptChunk: transcriptChunk,
        startedAt: new Date(),
        endedAt: null
      })
    }

    existing.status = detection.riskLevel === 'CRITICAL' ? 'Escalated' : detection.riskLevel === 'ELEVATED' ? 'Elevated' : existing.status || 'Monitoring'
    existing.riskScore = detection.riskScore
    existing.riskLevel = detection.riskLevel
    existing.flaggedSignalCount += detection.flaggedSignals.length
    existing.durationSeconds = callMetadata.durationSeconds || existing.durationSeconds || 0
    existing.callerNumber = callMetadata.callerNumber || existing.callerNumber
    existing.isVideoCall = Boolean(callMetadata.isVideoCall ?? existing.isVideoCall)
    existing.transcript.push(nextTranscript)
    existing.riskTimeline.push(nextTimelinePoint)
    existing.metadata = {
      ...(existing.metadata || {}),
      ...callMetadata,
      fullTranscriptSoFar
    }
    existing.lastTranscriptChunk = transcriptChunk
    existing.updatedAt = new Date()
    await existing.save()
    return existing
  }

  const current = inMemory.sessions.get(sessionId) || baseSession(sessionId, roomId, callMetadata)
  current.status = detection.riskLevel === 'CRITICAL' ? 'Escalated' : detection.riskLevel === 'ELEVATED' ? 'Elevated' : current.status
  current.riskScore = detection.riskScore
  current.riskLevel = detection.riskLevel
  current.flaggedSignalCount += detection.flaggedSignals.length
  current.durationSeconds = callMetadata.durationSeconds || current.durationSeconds || 0
  current.callerNumber = callMetadata.callerNumber || current.callerNumber
  current.isVideoCall = Boolean(callMetadata.isVideoCall ?? current.isVideoCall)
  current.transcript.push({
    text: transcriptChunk,
    riskScore: detection.riskScore,
    flagged: detection.flaggedSignals.length > 0,
    createdAt: new Date()
  })
  current.riskTimeline.push({
    riskScore: detection.riskScore,
    riskLevel: detection.riskLevel,
    createdAt: new Date()
  })
  current.metadata = {
    ...(current.metadata || {}),
    ...callMetadata,
    fullTranscriptSoFar
  }
  current.lastTranscriptChunk = transcriptChunk
  current.updatedAt = new Date()
  inMemory.sessions.set(sessionId, current)
  return current
}

export async function recordAlert({ sessionId, roomId, detection }) {
  const payload = {
    sessionId,
    roomId,
    riskScore: detection.riskScore,
    riskLevel: detection.riskLevel,
    signalCount: detection.flaggedSignals.length,
    flaggedSignals: detection.flaggedSignals,
    action: detection.recommendedAction,
    createdAt: new Date()
  }

  if (hasMongo()) {
    return Alert.create(payload)
  }

  inMemory.alerts.push(payload)
  return payload
}

export async function createIncidentReport({ session, detection }) {
  const caseId = `CASE-${session.sessionId.slice(0, 8).toUpperCase()}`
  const transcriptExcerpt = (session.transcript || [])
    .map((entry) => entry.text)
    .slice(-4)
    .join(' ')
    .slice(0, 420)

  const payload = {
    caseId,
    sessionId: session.sessionId,
    roomId: session.roomId,
    generatedAt: new Date(),
    status: 'Open',
    summary: 'Automated incident report generated after the session reached CRITICAL risk.',
    transcriptExcerpt,
    riskScore: detection.riskScore,
    riskLevel: detection.riskLevel,
    riskFactors: detection.flaggedSignals,
    metadata: session.metadata || {}
  }

  if (hasMongo()) {
    const existing = await IncidentReport.findOne({ sessionId: session.sessionId })
    if (existing) {
      return existing
    }
    return IncidentReport.create(payload)
  }

  const existing = inMemory.incidents.find((item) => item.sessionId === session.sessionId)
  if (existing) {
    return existing
  }

  inMemory.incidents.push(payload)
  return payload
}

export async function listSessions() {
  if (hasMongo()) {
    return Session.find({}).sort({ updatedAt: -1 }).lean()
  }

  return Array.from(inMemory.sessions.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export async function getSession(sessionId) {
  if (hasMongo()) {
    return Session.findOne({ sessionId }).lean()
  }

  return inMemory.sessions.get(sessionId) || null
}

export async function listIncidents() {
  if (hasMongo()) {
    return IncidentReport.find({}).sort({ generatedAt: -1 }).lean()
  }

  return [...inMemory.incidents].sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
}

export async function listAlerts() {
  if (hasMongo()) {
    return Alert.find({}).sort({ createdAt: -1 }).lean()
  }

  return [...inMemory.alerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}