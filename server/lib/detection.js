const keywordRules = [
  { type: 'authority_impersonation', regex: /CBI|ED|Customs|cyber cell|police station/i, weight: 0.24, detail: 'Referenced an authority figure or agency' },
  { type: 'transfer_pressure', regex: /transfer (money|funds)|RTGS|NEFT|UPI|wallet|account verification/i, weight: 0.2, detail: 'Asked for an immediate transfer or payment action' },
  { type: 'secrecy_pressure', regex: /do not tell|keep this confidential|no one else/i, weight: 0.12, detail: 'Applied secrecy or isolation pressure' },
  { type: 'arrest_threat', regex: /arrest|warrant|case file|summons|asset freeze|legal action/i, weight: 0.18, detail: 'Used arrest or legal threat language' },
  { type: 'urgency_pressure', regex: /immediately|within (?:10|15|30) minutes|now|urgent/i, weight: 0.1, detail: 'Created artificial urgency' },
  { type: 'credential_request', regex: /otp|one-time password|screen share|remote access|AnyDesk|TeamViewer/i, weight: 0.16, detail: 'Requested credentials or remote access' }
]

export function scoreTranscript(transcriptChunk = '', fullTranscriptSoFar = '') {
  const combined = `${fullTranscriptSoFar} ${transcriptChunk}`.trim()
  const matched = keywordRules.filter((rule) => rule.regex.test(combined))
  const rawScore = matched.reduce((acc, rule) => acc + rule.weight, 0)
  const riskScore = Math.min(1, Number((0.08 + rawScore).toFixed(2)))

  let riskLevel = 'LOW'
  let recommendedAction = 'monitor'

  if (riskScore >= 0.72 || matched.some((rule) => rule.type === 'arrest_threat' || rule.type === 'credential_request')) {
    riskLevel = 'CRITICAL'
    recommendedAction = 'escalate'
  } else if (riskScore >= 0.34) {
    riskLevel = 'ELEVATED'
    recommendedAction = 'warn_user'
  }

  const flaggedSignals = matched.map((rule) => ({
    type: rule.type,
    detail: rule.detail,
    weight: rule.weight
  }))

  if (combined.length > 0 && matched.length === 0) {
    flaggedSignals.push({
      type: 'context_watch',
      detail: 'No explicit scam marker detected in this chunk, but session remains under observation.',
      weight: 0.04
    })
  }

  return {
    riskScore,
    riskLevel,
    flaggedSignals,
    recommendedAction
  }
}