import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Session from '../models/Session.js'
import Alert from '../models/Alert.js'
import IncidentReport from '../models/IncidentReport.js'

dotenv.config()

const demoSessions = [
  {
    sessionId: 'demo-monitor-001',
    roomId: 'SC-DEMO1',
    status: 'Monitoring',
    riskScore: 0.18,
    riskLevel: 'LOW',
    flaggedSignalCount: 1,
    durationSeconds: 214,
    callerNumber: '+91 90000 10001',
    isVideoCall: true,
    transcript: [
      { text: 'We are from the customs department. This is only a verification call.', riskScore: 0.16, flagged: false, createdAt: new Date('2026-07-22T07:30:00Z') },
      { text: 'Please wait while we confirm your identity.', riskScore: 0.18, flagged: false, createdAt: new Date('2026-07-22T07:32:10Z') }
    ],
    riskTimeline: [
      { riskScore: 0.12, riskLevel: 'LOW', createdAt: new Date('2026-07-22T07:30:00Z') },
      { riskScore: 0.18, riskLevel: 'LOW', createdAt: new Date('2026-07-22T07:32:10Z') }
    ],
    metadata: { callerCountry: 'IN', spoofedCarrier: 'DemoTel', fullTranscriptSoFar: 'We are from the customs department. This is only a verification call. Please wait while we confirm your identity.' },
    lastTranscriptChunk: 'Please wait while we confirm your identity.',
    startedAt: new Date('2026-07-22T07:29:48Z'),
    endedAt: null
  },
  {
    sessionId: 'demo-elevated-002',
    roomId: 'SC-DEMO2',
    status: 'Elevated',
    riskScore: 0.56,
    riskLevel: 'ELEVATED',
    flaggedSignalCount: 3,
    durationSeconds: 486,
    callerNumber: '+91 90000 10002',
    isVideoCall: true,
    transcript: [
      { text: 'This is the cyber cell. Do not tell anybody until the legal process is complete.', riskScore: 0.51, flagged: true, createdAt: new Date('2026-07-22T06:40:00Z') },
      { text: 'You must keep this confidential and stay on the line.', riskScore: 0.56, flagged: true, createdAt: new Date('2026-07-22T06:43:22Z') }
    ],
    riskTimeline: [
      { riskScore: 0.28, riskLevel: 'LOW', createdAt: new Date('2026-07-22T06:38:58Z') },
      { riskScore: 0.44, riskLevel: 'ELEVATED', createdAt: new Date('2026-07-22T06:40:00Z') },
      { riskScore: 0.56, riskLevel: 'ELEVATED', createdAt: new Date('2026-07-22T06:43:22Z') }
    ],
    metadata: { callerCountry: 'IN', spoofedCarrier: 'DemoTel', fullTranscriptSoFar: 'This is the cyber cell. Do not tell anybody until the legal process is complete. You must keep this confidential and stay on the line.' },
    lastTranscriptChunk: 'You must keep this confidential and stay on the line.',
    startedAt: new Date('2026-07-22T06:38:40Z'),
    endedAt: null
  },
  {
    sessionId: 'demo-critical-003',
    roomId: 'SC-DEMO3',
    status: 'Escalated',
    riskScore: 0.91,
    riskLevel: 'CRITICAL',
    flaggedSignalCount: 6,
    durationSeconds: 642,
    callerNumber: '+91 90000 10003',
    isVideoCall: true,
    transcript: [
      { text: 'This is the CBI. We have an arrest warrant in your name.', riskScore: 0.84, flagged: true, createdAt: new Date('2026-07-22T05:55:00Z') },
      { text: 'Transfer money immediately or you will be detained.', riskScore: 0.91, flagged: true, createdAt: new Date('2026-07-22T06:01:19Z') },
      { text: 'Do not call anyone else. Keep this confidential.', riskScore: 0.88, flagged: true, createdAt: new Date('2026-07-22T06:05:44Z') }
    ],
    riskTimeline: [
      { riskScore: 0.32, riskLevel: 'LOW', createdAt: new Date('2026-07-22T05:55:00Z') },
      { riskScore: 0.68, riskLevel: 'ELEVATED', createdAt: new Date('2026-07-22T06:01:19Z') },
      { riskScore: 0.91, riskLevel: 'CRITICAL', createdAt: new Date('2026-07-22T06:05:44Z') }
    ],
    metadata: { callerCountry: 'IN', spoofedCarrier: 'DemoTel', fullTranscriptSoFar: 'This is the CBI. We have an arrest warrant in your name. Transfer money immediately or you will be detained. Do not call anyone else. Keep this confidential.' },
    lastTranscriptChunk: 'Do not call anyone else. Keep this confidential.',
    startedAt: new Date('2026-07-22T05:54:41Z'),
    endedAt: null
  }
]

const demoAlerts = [
  {
    sessionId: 'demo-elevated-002',
    roomId: 'SC-DEMO2',
    riskScore: 0.44,
    riskLevel: 'ELEVATED',
    signalCount: 2,
    flaggedSignals: [
      { type: 'secrecy_pressure', detail: 'Applied secrecy or isolation pressure', weight: 0.12 },
      { type: 'urgency_pressure', detail: 'Created artificial urgency', weight: 0.1 }
    ],
    action: 'warn_user',
    createdAt: new Date('2026-07-22T06:40:00Z')
  },
  {
    sessionId: 'demo-critical-003',
    roomId: 'SC-DEMO3',
    riskScore: 0.91,
    riskLevel: 'CRITICAL',
    signalCount: 4,
    flaggedSignals: [
      { type: 'authority_impersonation', detail: 'Referenced an authority figure or agency', weight: 0.24 },
      { type: 'arrest_threat', detail: 'Used arrest or legal threat language', weight: 0.18 },
      { type: 'transfer_pressure', detail: 'Asked for an immediate transfer or payment action', weight: 0.2 }
    ],
    action: 'escalate',
    createdAt: new Date('2026-07-22T06:01:19Z')
  }
]

const demoIncidents = [
  {
    caseId: 'CASE-DEMO00',
    sessionId: 'demo-critical-003',
    roomId: 'SC-DEMO3',
    generatedAt: new Date('2026-07-22T06:06:00Z'),
    status: 'Open',
    summary: 'Automated incident report generated after the session reached CRITICAL risk.',
    transcriptExcerpt: 'This is the CBI. We have an arrest warrant in your name. Transfer money immediately or you will be detained. Do not call anyone else. Keep this confidential.',
    riskScore: 0.91,
    riskLevel: 'CRITICAL',
    riskFactors: [
      { type: 'authority_impersonation', detail: 'Referenced an authority figure or agency', weight: 0.24 },
      { type: 'arrest_threat', detail: 'Used arrest or legal threat language', weight: 0.18 },
      { type: 'transfer_pressure', detail: 'Asked for an immediate transfer or payment action', weight: 0.2 },
      { type: 'secrecy_pressure', detail: 'Applied secrecy or isolation pressure', weight: 0.12 }
    ],
    metadata: { callerCountry: 'IN', spoofedCarrier: 'DemoTel' }
  }
]

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to seed demo data into MongoDB.')
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  })

  await Promise.all([
    ...demoSessions.map((session) => Session.updateOne({ sessionId: session.sessionId }, { $set: session }, { upsert: true })),
    ...demoAlerts.map((alert) => Alert.updateOne({ sessionId: alert.sessionId }, { $set: alert }, { upsert: true })),
    ...demoIncidents.map((incident) => IncidentReport.updateOne({ sessionId: incident.sessionId }, { $set: incident }, { upsert: true }))
  ])

  console.log(`Seeded ${demoSessions.length} sessions, ${demoAlerts.length} alerts, and ${demoIncidents.length} incident reports.`)
  await mongoose.disconnect()
}

seed().catch(async (error) => {
  console.error(error)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore disconnect errors
  }
  process.exit(1)
})