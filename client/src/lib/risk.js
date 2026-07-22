export const riskOrder = ['LOW', 'ELEVATED', 'CRITICAL']

export const riskMeta = {
  LOW: {
    label: 'LOW',
    tone: 'text-institute-500'
  },
  ELEVATED: {
    label: 'ELEVATED',
    tone: 'text-caution-500'
  },
  CRITICAL: {
    label: 'CRITICAL',
    tone: 'text-critical-500'
  }
}

const highlightRules = [
  { key: 'authority', pattern: /\b(CBI|ED|Customs|police|cyber cell)\b/gi },
  { key: 'arrest', pattern: /\b(arrest|warrant|summons|case file|legal action|asset freeze)\b/gi },
  { key: 'pressure', pattern: /\b(immediately|urgent|now|within\s+(?:10|15|30)\s+minutes)\b/gi },
  { key: 'transfer', pattern: /\b(transfer\s+money|NEFT|RTGS|UPI|account verification)\b/gi },
  { key: 'credential', pattern: /\b(OTP|screen share|remote access|AnyDesk|TeamViewer)\b/gi },
  { key: 'secrecy', pattern: /\b(keep this confidential|do not tell|no one else)\b/gi }
]

export function getRiskOrderIndex(level = 'LOW') {
  return riskOrder.indexOf(level)
}

export function getStatusLabel(level = 'LOW') {
  if (level === 'CRITICAL') {
    return 'Escalated'
  }

  if (level === 'ELEVATED') {
    return 'Elevated'
  }

  return 'Monitoring'
}

export function splitRiskHighlights(text = '') {
  if (!text) {
    return []
  }

  const spans = []

  highlightRules.forEach((rule) => {
    const matches = text.matchAll(rule.pattern)
    for (const match of matches) {
      if (typeof match.index !== 'number') {
        continue
      }

      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        key: rule.key
      })
    }
  })

  spans.sort((left, right) => left.start - right.start || right.end - left.end)

  const normalized = []
  let cursor = 0

  spans.forEach((span) => {
    if (span.start < cursor) {
      return
    }

    if (cursor < span.start) {
      normalized.push({ text: text.slice(cursor, span.start), highlighted: false })
    }

    normalized.push({ text: text.slice(span.start, span.end), highlighted: true, key: span.key })
    cursor = span.end
  })

  if (cursor < text.length) {
    normalized.push({ text: text.slice(cursor), highlighted: false })
  }

  return normalized
}

export function levelReached(currentLevel = 'LOW', targetLevel = 'LOW') {
  return getRiskOrderIndex(currentLevel) >= getRiskOrderIndex(targetLevel)
}