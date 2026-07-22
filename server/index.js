import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { createServer } from 'node:http'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import detectRouter from './routes/detect.js'
import incidentsRouter from './routes/incidents.js'
import sessionsRouter from './routes/sessions.js'
import { connectMongo as connectMongoToDatabase } from './lib/mongo.js'
import { registerSocketHandlers } from './socket/index.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true
  }
})

app.locals.io = io

app.use(
  cors({
    origin: true,
    credentials: true
  })
)
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'SafeCall API' })
})

app.use('/api/detect', detectRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/incidents', incidentsRouter)

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Internal server error' })
})

registerSocketHandlers(io)

async function connectMongo() {
  try {
    const connected = await connectMongoToDatabase(process.env.MONGODB_URI)
    if (connected) {
      console.log('Connected to MongoDB')
      return
    }

    console.warn('MONGODB_URI not set; using in-memory persistence fallback.')
  } catch (error) {
    console.warn('MongoDB connection failed; using in-memory persistence fallback.')
    console.warn(error.message)
  }
}

async function start() {
  await connectMongo()

  const port = Number(process.env.PORT || 4000)
  httpServer.listen(port, () => {
    console.log(`SafeCall server listening on port ${port}`)
  })
}

start()