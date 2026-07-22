import { levelReached, riskMeta, riskOrder } from '../lib/risk'

const stateStyles = {
  LOW: {
    frame: 'border-institute-500/25 bg-institute-500/8',
    track: 'bg-institute-500/16',
    fill: 'bg-institute-500',
    label: 'text-institute-500'
  },
  ELEVATED: {
    frame: 'border-caution-500/25 bg-caution-500/8',
    track: 'bg-caution-500/16',
    fill: 'bg-caution-500',
    label: 'text-caution-500'
  },
  CRITICAL: {
    frame: 'border-critical-500/25 bg-critical-500/10',
    track: 'bg-critical-500/16',
    fill: 'bg-critical-500',
    label: 'text-critical-500'
  }
}

export default function RiskMeter({ level = 'LOW', score = 0, compact = false }) {
  const activeIndex = Math.max(0, riskOrder.indexOf(level))
  const styles = stateStyles[level] || stateStyles.LOW

  return (
    <div className={`rounded-[1.4rem] border ${styles.frame} px-4 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition duration-300 ${compact ? 'px-3 py-3' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className={`font-mono text-[11px] uppercase tracking-[0.28em] ${styles.label}`}>threat ladder</div>
          <div className={`mt-1 font-mono text-sm uppercase tracking-[0.2em] ${riskMeta[level]?.tone || styles.label}`}>
            {riskMeta[level]?.label || 'LOW'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-graphite-500">score</div>
          <div className={`font-mono text-lg ${styles.label}`}>{score.toFixed(2)}</div>
        </div>
      </div>

      <div className={`mt-3 grid grid-cols-3 gap-2 ${compact ? 'h-8' : 'h-11'}`}>
        {riskOrder.map((itemLevel, index) => {
          const active = levelReached(level, itemLevel)
          const isCurrent = index === activeIndex

          return (
            <div key={itemLevel} className={`relative overflow-hidden rounded-[0.95rem] border ${active ? `${styles.track} border-transparent` : 'border-graphite-100 bg-graphite-50'}`}>
              <div className={`absolute inset-y-0 left-0 rounded-[0.95rem] ${active ? styles.fill : ''}`} style={{ width: active ? '100%' : '0%' }} />
              <div className={`relative z-10 flex h-full items-center justify-between px-3 font-mono text-[10px] uppercase tracking-[0.18em] ${active ? 'text-graphite-50' : 'text-graphite-400'}`}>
                <span>{itemLevel}</span>
                <span>{isCurrent ? '●' : index + 1}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className={`mt-3 h-1.5 rounded-full ${styles.track}`}>
        <div className={`h-full rounded-full ${styles.fill} transition-all duration-300 ${level === 'CRITICAL' ? 'animate-pulse-soft' : ''}`} style={{ width: `${Math.max(12, score * 100)}%` }} />
      </div>
    </div>
  )
}