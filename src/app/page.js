function TradeModal({ trade, onSave, onClose, saving }) {
  const [f, setF] = useState({
    ...BLANK,
    date: tod(),
    time: new Date().toTimeString().slice(0, 5),
    ...trade,
  })

  const set = (k, v) =>
    setF((p) => {
      const updated = { ...p, [k]: v }

      // Auto-calculate P&L and R:R whenever relevant fields change
      const entry = parseFloat(k === 'entry' ? v : updated.entry)
      const stop = parseFloat(k === 'stop' ? v : updated.stop)
      const exit = parseFloat(k === 'exit' ? v : updated.exit)
      const shares = parseFloat(k === 'shares' ? v : updated.shares)

      // ✅ P&L: ALWAYS treat as LONG
      // P&L = (exit - entry) * shares
      if (!isNaN(entry) && !isNaN(exit) && !isNaN(shares) && shares > 0) {
        const rawPnl = (exit - entry) * shares
        updated.pnl = rawPnl.toFixed(2)
      }

      // ✅ R:R Achieved: ALWAYS treat as LONG
      // R = abs(entry - stop)
      // R:R = (exit - entry) / R
      if (!isNaN(entry) && !isNaN(stop) && !isNaN(exit) && stop !== entry) {
        const riskPerShare = Math.abs(entry - stop)
        const gainPerShare = exit - entry
        const rr = riskPerShare > 0 ? gainPerShare / riskPerShare : 0
        updated.rr = rr.toFixed(2) + 'R'
      }

      // Auto-set outcome based on P&L
      if (updated.pnl !== '' && !isNaN(Number(updated.pnl))) {
        const pnlNum = Number(updated.pnl)
        if (pnlNum > 0) updated.outcome = 'win'
        else if (pnlNum < 0) updated.outcome = 'loss'
        else updated.outcome = 'be'
      }

      return updated
    })

  const F = (label, key, type = 'text', extra = {}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Lbl>{label}</Lbl>
      <Inp
        type={type}
        value={f[key] || ''}
        onChange={(e) => set(key, e.target.value)}
        {...extra}
      />
    </div>
  )

  const SL = (label, key, opts) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Lbl>{label}</Lbl>
      <Sel value={f[key] || ''} onChange={(e) => set(key, e.target.value)}>
        <option value="">Select...</option>
        {opts.map((o) => (
          <option
            key={typeof o === 'object' ? o.v : o}
            value={typeof o === 'object' ? o.v : o}
          >
            {typeof o === 'object' ? o.l : o}
          </option>
        ))}
      </Sel>
    </div>
  )

  // Derived display values for the auto-calc preview
  const hasAutoCalc = f.pnl !== '' && f.rr !== ''
  const pnlNum = Number(f.pnl)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.82)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: s.bg2,
          border: `1px solid ${s.border2}`,
          borderRadius: 4,
          width: '100%',
          maxWidth: 700,
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        className="fade-in"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: `1px solid ${s.border}`,
          }}
        >
          <div
            style={{
              fontFamily: 'Bebas Neue',
              fontSize: 22,
              letterSpacing: 2,
              color: s.green,
            }}
          >
            {f.id ? 'Edit Trade' : 'Log Trade'}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: s.text3,
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 22 }}>
          {/* Row 1: Date / Time / Direction */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginBottom: 12,
            }}
          >
            {F('Date', 'date', 'date')}
            {F('Time', 'time', 'time')}
            {SL('Direction', 'dir', ['LONG', 'SHORT'])}
          </div>

          {/* Row 2: Setup / Day Type / Outcome */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginBottom: 12,
            }}
          >
            {SL('Setup', 'setup', SETUPS)}
            {SL('Day Type', 'dayType', DAY_TYPES)}
            {SL('Outcome', 'outcome', [
              { v: 'win', l: 'Win' },
              { v: 'loss', l: 'Loss' },
              { v: 'be', l: 'Break Even' },
            ])}
          </div>

          {/* Row 3: Entry / Stop / Exit / Shares */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 12,
              marginBottom: 12,
            }}
          >
            {F('Buy Price ($)', 'entry', 'number', {
              placeholder: '480.00',
              step: '0.01',
            })}
            {F('Stop ($)', 'stop', 'number', {
              placeholder: '479.50',
              step: '0.01',
            })}
            {F('Sell Price ($)', 'exit', 'number', {
              placeholder: '481.00',
              step: '0.01',
            })}
            {F('Shares / Qty', 'shares', 'number', { placeholder: '100' })}
          </div>

          {/* Auto-calc display banner */}
          {hasAutoCalc && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 12,
                padding: '12px 14px',
                background:
                  pnlNum >= 0
                    ? 'rgba(0,229,160,0.06)'
                    : 'rgba(255,61,90,0.06)',
                border: `1px solid ${
                  pnlNum >= 0
                    ? 'rgba(0,229,160,0.25)'
                    : 'rgba(255,61,90,0.25)'
                }`,
                borderRadius: 3,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 9,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: s.text3,
                    marginBottom: 4,
                  }}
                >
                  P&L (Auto)
                </div>
                <div
                  style={{
                    fontFamily: 'Bebas Neue',
                    fontSize: 28,
                    letterSpacing: 1,
                    color: pnlNum >= 0 ? s.green : s.red,
                    lineHeight: 1,
                  }}
                >
                  {pnlNum >= 0 ? '+' : ''}
                  {fmt$(pnlNum)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 9,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: s.text3,
                    marginBottom: 4,
                  }}
                >
                  R:R Achieved (Auto)
                </div>
                <div
                  style={{
                    fontFamily: 'Bebas Neue',
                    fontSize: 28,
                    letterSpacing: 1,
                    color: pnlNum >= 0 ? s.green : s.red,
                    lineHeight: 1,
                  }}
                >
                  {f.rr}
                </div>
              </div>
            </div>
          )}

          {/* Row 4: P&L / R:R (manual override still possible) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Lbl>
                P&L ($) <span style={{ color: s.green, fontSize: 8 }}>AUTO</span>
              </Lbl>
              <Inp
                type="number"
                value={f.pnl || ''}
                onChange={(e) => set('pnl', e.target.value)}
                style={{ color: Number(f.pnl) >= 0 ? s.green : s.red }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Lbl>
                R:R Achieved{' '}
                <span style={{ color: s.green, fontSize: 8 }}>AUTO</span>
              </Lbl>
              <Inp value={f.rr || ''} onChange={(e) => set('rr', e.target.value)} />
            </div>
            {SL('Rules Followed?', 'rules', [
              { v: 'yes', l: 'Yes' },
              { v: 'no', l: 'No' },
              { v: 'partial', l: 'Partial' },
            ])}
            {SL('Emotion', 'emotion', EMOTIONS)}
          </div>

          {/* Notes */}
          {[
            ['What did you do well?', 'good', 'Entry confirmation, took stop cleanly...'],
            [
              'What would you do differently?',
              'improve',
              'Entered too early, moved stop wider...',
            ],
          ].map(([lbl, key, ph]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                marginBottom: 12,
              }}
            >
              <Lbl>{lbl}</Lbl>
              <textarea
                value={f[key] || ''}
                onChange={(e) => set(key, e.target.value)}
                placeholder={ph}
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderRadius: 3,
                  color: s.text,
                  fontFamily: 'JetBrains Mono',
                  fontSize: 12,
                  padding: '8px 11px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 56,
                }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 22px',
            borderTop: `1px solid ${s.border}`,
          }}
        >
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            onClick={() => {
              if (!f.outcome) return
              onSave({ ...f, id: f.id || uid() })
            }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Trade'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
