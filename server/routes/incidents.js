import express from 'express'
import { createIncidentReport, getSession, listAlerts, listIncidents } from '../lib/persistence.js'

const router = express.Router()

router.get('/', async (_req, res, next) => {
  try {
    const incidents = await listIncidents()
    return res.json({ incidents })
  } catch (error) {
    return next(error)
  }
})

router.get('/alerts', async (_req, res, next) => {
  try {
    const alerts = await listAlerts()
    return res.json({ alerts })
  } catch (error) {
    return next(error)
  }
})

router.post('/report', async (req, res, next) => {
  try {
    const { sessionId, riskScore = 0, riskLevel = 'CRITICAL', flaggedSignals = [] } = req.body || {}

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const incidentReport = await createIncidentReport({
      session,
      detection: {
        riskScore,
        riskLevel,
        flaggedSignals,
        recommendedAction: 'escalate'
      }
    })

    req.app.locals.io?.emit('incident:created', incidentReport)
    return res.status(201).json({ incidentReport })
  } catch (error) {
    return next(error)
  }
})

export default router