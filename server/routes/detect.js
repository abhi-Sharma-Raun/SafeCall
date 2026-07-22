import express from 'express'
import { scoreTranscript } from '../lib/detection.js'
import { createIncidentReport, recordAlert, upsertSessionFromDetection } from '../lib/persistence.js'

const router = express.Router()

router.post('/', async (req, res, next) => {
  try {
    const { sessionId, transcriptChunk, fullTranscriptSoFar = '', callMetadata = {} } = req.body || {}

    if (!sessionId || !transcriptChunk) {
      return res.status(400).json({ error: 'sessionId and transcriptChunk are required' })
    }

    const roomId = callMetadata.roomId || sessionId
    const detection = scoreTranscript(transcriptChunk, fullTranscriptSoFar)
    const session = await upsertSessionFromDetection({
      sessionId,
      roomId,
      detection,
      transcriptChunk,
      fullTranscriptSoFar,
      callMetadata
    })

    await recordAlert({ sessionId, roomId, detection })

    if (detection.riskLevel === 'CRITICAL') {
      const incidentReport = await createIncidentReport({ session, detection })
      req.app.locals.io?.emit('incident:created', incidentReport)
    }

    req.app.locals.io?.to(roomId).emit('call:risk-update', {
      sessionId,
      roomId,
      riskScore: detection.riskScore,
      riskLevel: detection.riskLevel,
      flaggedSignals: detection.flaggedSignals,
      recommendedAction: detection.recommendedAction
    })

    req.app.locals.io?.emit('session:update', {
      sessionId,
      roomId,
      snapshot: session,
      detection
    })

    return res.json(detection)
  } catch (error) {
    return next(error)
  }
})

export default router