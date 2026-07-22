import { useEffect, useMemo, useState } from 'react'
import CallSurface from './components/CallSurface'
import CommandDashboard from './components/CommandDashboard'
import { createAppSocket } from './lib/socket'

function createRoomCode() {
  return `SC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export default function App() {
  const socket = useMemo(() => createAppSocket(), [])
  const [surface, setSurface] = useState('call')
  const [sessionId] = useState(() => crypto.randomUUID())
  const [roomId, setRoomId] = useState(() => createRoomCode())

  useEffect(() => () => {
    socket.disconnect()
  }, [socket])

  return (
    <div>
      <div className="fixed left-4 top-4 z-50 w-[min(560px,calc(100vw-2rem))] rounded-[1.4rem] border border-graphite-100 bg-white/92 p-1 shadow-panel backdrop-blur-md">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setSurface('call')}
            className={`rounded-[1.05rem] px-4 py-3 text-[11px] uppercase tracking-[0.2em] transition ${surface === 'call' ? 'bg-graphite-900 text-graphite-50 shadow-sm' : 'text-graphite-500 hover:bg-graphite-50 hover:text-graphite-900'}`}
          >
            Call surface
          </button>
          <button
            type="button"
            onClick={() => setSurface('dashboard')}
            className={`rounded-[1.05rem] px-4 py-3 text-[11px] uppercase tracking-[0.2em] transition ${surface === 'dashboard' ? 'bg-graphite-900 text-graphite-50 shadow-sm' : 'text-graphite-500 hover:bg-graphite-50 hover:text-graphite-900'}`}
          >
            Command dashboard
          </button>
        </div>
      </div>

      {surface === 'call' ? (
        <CallSurface
          socket={socket}
          sessionId={sessionId}
          roomId={roomId}
          setRoomId={setRoomId}
          onOpenDashboard={() => setSurface('dashboard')}
        />
      ) : (
        <CommandDashboard socket={socket} onFocusCall={() => setSurface('call')} />
      )}
    </div>
  )
}