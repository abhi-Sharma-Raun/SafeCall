export function formatDuration(totalSeconds = 0) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export function formatTimestamp(value) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: 'short'
  }).format(new Date(value))
}

export function shortId(value = '') {
  if (!value) {
    return '—'
  }

  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}