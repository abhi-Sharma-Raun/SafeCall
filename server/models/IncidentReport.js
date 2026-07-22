import mongoose from 'mongoose'

const incidentReportSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, unique: true, index: true },
    sessionId: { type: String, required: true, index: true },
    roomId: { type: String, required: true, index: true },
    generatedAt: { type: Date, default: Date.now },
    status: { type: String, default: 'Open' },
    summary: { type: String, required: true },
    transcriptExcerpt: { type: String, default: '' },
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, default: 'CRITICAL' },
    riskFactors: { type: Array, default: [] },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
)

incidentReportSchema.index({ generatedAt: -1, status: 1 })

export default mongoose.models.IncidentReport || mongoose.model('IncidentReport', incidentReportSchema)