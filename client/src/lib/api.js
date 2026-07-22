const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const DETECTION_BASE = import.meta.env.VITE_DETECTION_SERVICE_BASE_URL || API_BASE || ''

function buildUrl(base, path) {
  const origin = base || window.location.origin
  return new URL(path, origin).toString()
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(errorBody || `Request failed with status ${response.status}`)
  }

  return response.json()
}

export async function detectTranscript(payload) {
  return requestJson(buildUrl(DETECTION_BASE, '/api/detect'), {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function fetchSessions() {
  return requestJson(buildUrl(API_BASE, '/api/sessions'))
}

export async function fetchSession(sessionId) {
  return requestJson(buildUrl(API_BASE, `/api/sessions/${sessionId}`))
}

export async function fetchIncidents() {
  return requestJson(buildUrl(API_BASE, '/api/incidents'))
}

export async function fetchAlerts() {
  return requestJson(buildUrl(API_BASE, '/api/incidents/alerts'))
}

export async function submitIncidentReport(payload) {
  return requestJson(buildUrl(API_BASE, '/api/incidents/report'), {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}