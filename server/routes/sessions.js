import express from 'express'
import { getSession, listAlerts, listIncidents, listSessions } from '../lib/persistence.js'

const router = express.Router()

router.get('/', async (_req, res, next) => {
  try {
    const sessions = await listSessions()
    return res.json({ sessions })
  } catch (error) {
    return next(error)
  }
})

router.get('/meta/alerts', async (_req, res, next) => {
  try {
    const alerts = await listAlerts()
    return res.json({ alerts })
  } catch (error) {
    return next(error)
  }
})

router.get('/meta/incidents', async (_req, res, next) => {
  try {
    const incidents = await listIncidents()
    return res.json({ incidents })
  } catch (error) {
    return next(error)
  }
})

router.get('/:sessionId', async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    return res.json({ session })
  } catch (error) {
    return next(error)
  }
})

export default router