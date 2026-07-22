import mongoose from 'mongoose'

const alertSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    roomId: { type: String, required: true, index: true },
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, required: true },
    signalCount: { type: Number, default: 0 },
    flaggedSignals: { type: Array, default: [] },
    action: { type: String, default: 'monitor' },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

alertSchema.index({ createdAt: -1, riskLevel: 1 })

export default mongoose.models.Alert || mongoose.model('Alert', alertSchema)