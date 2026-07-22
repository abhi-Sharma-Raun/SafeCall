import mongoose from 'mongoose'

const transcriptEntrySchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    riskScore: { type: Number, default: 0 },
    flagged: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
)

const riskPointSchema = new mongoose.Schema(
  {
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, default: 'LOW' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
)

const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    roomId: { type: String, required: true, index: true },
    status: { type: String, default: 'Monitoring' },
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, default: 'LOW' },
    flaggedSignalCount: { type: Number, default: 0 },
    durationSeconds: { type: Number, default: 0 },
    callerNumber: { type: String, default: '' },
    isVideoCall: { type: Boolean, default: true },
    transcript: { type: [transcriptEntrySchema], default: [] },
    riskTimeline: { type: [riskPointSchema], default: [] },
    metadata: { type: Object, default: {} },
    lastTranscriptChunk: { type: String, default: '' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

sessionSchema.index({ updatedAt: -1, riskLevel: 1 })
sessionSchema.index({ roomId: 1, updatedAt: -1 })

export default mongoose.models.Session || mongoose.model('Session', sessionSchema)