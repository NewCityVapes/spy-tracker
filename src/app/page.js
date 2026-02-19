// ── Trade Modal v2 ─────────────────────────────────────────────
// REPLACE your entire TradeModal function with this
//
// Improvements:
// 1. Options toggle (×100 multiplier, contract fields: ticker, expiry, strike, type)
// 2. Auto P&L + R:R from buy/sell price + quantity
// 3. Auto outcome (win/loss/be) from P&L
// 4. Risk $ and max loss % of account shown live
// 5. Quick-fill time buttons (market open windows)
// 6. Mandatory field validation with inline errors
// 7. Cleaner section grouping with dividers

// Add this to your BLANK constant (or extend it inline):
// ticker:'', expiry:'', strike:'', optType:'', isOptions: false

function TradeModal({ trade, onSave, onClose, saving }) {
  const BLANK_EXT = {
    ...BLANK,
    ticker: 'SPY',
    expiry: '',
    strike: '',
    optType: 'Put',
    isOptions: false,
  }

  const [f, setF] = useState({
    ...BLANK_EXT,
    date: tod(),
    time: new Date().toTimeString().slice(0, 5),
    ...trade,
  })
  const [errors, setErrors] = useState({})

  const set = (k, v) =>
    setF(p => {
      const updated = { ...p, [k]: v }

      // Clear error for field being edited
      if (errors[k]) setErrors(e => ({ ...e, [k]: null }))

      // Resolve current values
      const entry   = parseFloat(k === 'entry'     ? v : updated.entry)
      const stop    = parseFloat(k === 'stop'      ? v : updated.stop)
      const exit    = parseFloat(k === 'exit'      ? v : updated.exit)
      const qty     = parseFloat(k === 'shares'    ? v : updated.shares)
      const dir     = k === 'dir'       ? v : updated.dir
      const isOpts  = k === 'isOptions' ? v : updated.isOptions

      // Options multiplier: each contract = 100 shares
      const multiplier = isOpts ? 100 : 1

      // ── Auto P&L ──────────────────────────────────────────────
      if (!isNaN(entry) && !isNaN(exit) && !isNaN(qty) && qty > 0) {
        const rawPnl =
          dir === 'SHORT'
            ? (entry - exit) * qty * multiplier
            : (exit - entry) * qty * multiplier
        updated.pnl = rawPnl.toFixed(2)
      }

      // ── Auto R:R ──────────────────────────────────────────────
      if (!isNaN(entry) && !isNaN(stop) && !isNaN(exit) && stop !== entry) {
        const riskPerUnit = Math.abs(entry - stop)
        const gainPerUnit =
          dir === 'SHORT' ? entry - exit : exit - entry
        updated.rr = (gainPerUnit / riskPerUnit).toFixed(2) + 'R'
      }

      // ── Auto Outcome ──────────────────────────────────────────
      if (updated.pnl !== '' && !isNaN(Number(updated.pnl))) {
        const n = Number(updated.pnl)
        updated.outcome = n > 0 ? 'win' : n < 0 ? 'loss' : 'be'
      }

      return updated
    })

  // ── Derived display values ────────────────────────────────────
  const pnlNum     = Number(f.pnl)
  const hasCalc    = f.pnl !== '' && !isNaN(pnlNum)
  const hasRR      = f.rr  !== ''
  const multiplier = f.isOptions ? 100 : 1

  // Risk $ = |entry - stop| × qty × multiplier
  const riskDollars = (() => {
    const e = parseFloat(f.entry), st = parseFloat(f.stop), q = parseFloat(f.shares)
    if (isNaN(e) || isNaN(st) || isNaN(q) || q <= 0) return null
    return Math.abs(e - st) * q * multiplier
  })()

  // Max loss % of account (from game plan account field if available)
  const acctSize = parseFloat(f.account || '')
  const riskPct  = riskDollars && acctSize > 0 ? (riskDollars / acctSize) * 100 : null

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!f.outcome) errs.outcome = 'Required'
    if (!f.entry)   errs.entry   = 'Required'
    if (!f.exit)    errs.exit    = 'Required'
    if (!f.shares)  errs.shares  = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ ...f, id: f.id || uid() })
  }

  // ── Helpers ───────────────────────────────────────────────────
  const Field = ({ label, fkey, type = 'text', placeholder, step, autoTag, style: st2 = {} }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Lbl>
        {label}{' '}
        {autoTag && <span style={{ color: s.green, fontSize: 8, letterSpacing: 1 }}>AUTO</span>}
      </Lbl>
      <Inp
        type={type}
        placeholder={placeholder}
        step={step}
        value={f[fkey] || ''}
        onChange={e => set(fkey, e.target.value)}
        style={{
          borderColor: errors[fkey] ? s.red : undefined,
          color: (fkey === 'pnl' && f.pnl !== '') ? (pnlNum >= 0 ? s.green : s.red) : undefined,
          ...st2,
        }}
      />
      {errors[fkey] && (
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: s.red }}>{errors[fkey]}</span>
      )}
    </div>
  )

  const Select = ({ label, fkey, opts }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Lbl>{label}</Lbl>
      <Sel
        value={f[fkey] || ''}
        onChange={e => set(fkey, e.target.value)}
        style={{ borderColor: errors[fkey] ? s.red : undefined }}
      >
        <option value="">Select...</option>
        {opts.map(o => (
          <option key={typeof o === 'object' ? o.v : o} value={typeof o === 'object' ? o.v : o}>
            {typeof o === 'object' ? o.l : o}
          </option>
        ))}
      </Sel>
      {errors[fkey] && (
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: s.red }}>{errors[fkey]}</span>
      )}
    </div>
  )

  const SectionLabel = ({ children }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 6,
    }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: s.text3 }}>{children}</div>
      <div style={{ flex: 1, height: 1, background: s.border }} />
    </div>
  )

  // Toggle button style
  const toggleBtn = (active, col = s.green) => ({
    fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 700, letterSpacing: 1,
    textTransform: 'uppercase', padding: '6px 14px', borderRadius: 3, cursor: 'pointer',
    border: `1px solid ${active ? col : s.border}`,
    background: active ? `${col}18` : 'transparent',
    color: active ? col : s.text3,
    transition: 'all .15s',
  })

  // Quick-fill time buttons
  const TIME_QUICK = ['09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '15:00', '15:30']

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: s.bg2, border: `1px solid ${s.border2}`, borderRadius: 4,
        width: '100%', maxWidth: 740, maxHeight: '94vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }} className="fade-in">

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px', borderBottom: `1px solid ${s.border}`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 2, color: s.green }}>
              {f.id ? 'Edit Trade' : 'Log Trade'}
            </div>
            {/* Options / Shares toggle */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                style={toggleBtn(!f.isOptions)}
                onClick={() => set('isOptions', false)}
              >Shares</button>
              <button
                style={toggleBtn(f.isOptions, s.yellow)}
                onClick={() => set('isOptions', true)}
              >Options ×100</button>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: s.text3, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 22, flex: 1 }}>

          {/* ── Section 1: When & What ── */}
          <SectionLabel>When & What</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
            <Field label="Date"      fkey="date" type="date" />
            <Select label="Direction" fkey="dir"  opts={['LONG', 'SHORT']} />
            <Select label="Setup"     fkey="setup" opts={SETUPS} />
          </div>

          {/* Time with quick-fill buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            <Lbl>Time</Lbl>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Inp
                type="time"
                value={f.time || ''}
                onChange={e => set('time', e.target.value)}
                style={{ width: 120, flexShrink: 0 }}
              />
              {TIME_QUICK.map(t => (
                <button
                  key={t}
                  onClick={() => set('time', t)}
                  style={{
                    fontFamily: 'JetBrains Mono', fontSize: 9, padding: '5px 8px',
                    border: `1px solid ${f.time === t ? s.green : s.border}`,
                    background: f.time === t ? 'rgba(0,229,160,0.1)' : s.bg3,
                    color: f.time === t ? s.green : s.text3,
                    borderRadius: 3, cursor: 'pointer',
                  }}
                >{t}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Select label="Day Type" fkey="dayType" opts={DAY_TYPES} />
            <Select label="Emotion"  fkey="emotion"  opts={EMOTIONS} />
          </div>

          {/* ── Options-specific fields ── */}
          {f.isOptions && (
            <>
              <SectionLabel>Option Contract Details</SectionLabel>
              <div style={{
                padding: '12px 14px', marginBottom: 14,
                background: 'rgba(255,200,64,0.04)', border: '1px solid rgba(255,200,64,0.2)', borderRadius: 3,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <Field label="Ticker"    fkey="ticker"  placeholder="SPY" />
                  <Field label="Expiry"    fkey="expiry"  type="date" />
                  <Field label="Strike $"  fkey="strike"  type="number" placeholder="687" step="0.5" />
                  <Select label="Type"     fkey="optType" opts={['Call', 'Put']} />
                </div>
                {/* Quick summary line */}
                {f.ticker && f.expiry && f.strike && f.optType && (
                  <div style={{
                    marginTop: 10, fontFamily: 'Bebas Neue', fontSize: 16, letterSpacing: 2,
                    color: f.optType === 'Call' ? s.green : s.red,
                  }}>
                    {f.ticker} {f.expiry} ${f.strike} {f.optType.toUpperCase()}
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: s.text3, marginLeft: 10, letterSpacing: 1 }}>
                      · Each contract = 100 shares · P&L auto-multiplied
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Section 2: Prices ── */}
          <SectionLabel>Prices {f.isOptions ? '(premium per contract)' : ''}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Field
              label={f.isOptions ? 'Buy Premium ($)' : 'Entry Price ($)'}
              fkey="entry" type="number"
              placeholder={f.isOptions ? '1.84' : '480.00'}
              step="0.01"
            />
            <Field
              label="Stop ($)"
              fkey="stop" type="number"
              placeholder={f.isOptions ? '1.20' : '479.50'}
              step="0.01"
            />
            <Field
              label={f.isOptions ? 'Sell Premium ($)' : 'Exit Price ($)'}
              fkey="exit" type="number"
              placeholder={f.isOptions ? '1.43' : '481.00'}
              step="0.01"
            />
            <Field
              label={f.isOptions ? 'Contracts' : 'Shares'}
              fkey="shares" type="number"
              placeholder={f.isOptions ? '5' : '100'}
            />
          </div>

          {/* ── Live Risk Monitor ── */}
          {riskDollars !== null && (
            <div style={{
              display: 'flex', gap: 10, marginBottom: 12, padding: '9px 14px',
              background: 'rgba(33,150,243,0.05)', border: '1px solid rgba(33,150,243,0.2)',
              borderRadius: 3, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: s.text3, letterSpacing: 1, textTransform: 'uppercase' }}>Risk on trade:</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: s.red, fontWeight: 700 }}>
                ${riskDollars.toFixed(2)}
              </span>
              {riskPct !== null && (
                <>
                  <span style={{ color: s.text3, fontSize: 10 }}>·</span>
                  <span style={{
                    fontFamily: 'JetBrains Mono', fontSize: 11,
                    color: riskPct > 2 ? s.red : riskPct > 1 ? s.yellow : s.green,
                    fontWeight: 700,
                  }}>
                    {riskPct.toFixed(2)}% of account
                  </span>
                  {riskPct > 2 && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: s.red, marginLeft: 4 }}>
                      ⚠ EXCEEDS 2% MAX
                    </span>
                  )}
                </>
              )}
              {f.isOptions && (
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: s.text3, marginLeft: 'auto' }}>
                  {f.shares} contract{Number(f.shares) !== 1 ? 's' : ''} × {parseFloat(f.stop) ? `$${Math.abs(parseFloat(f.entry) - parseFloat(f.stop)).toFixed(2)}` : '—'} × 100
                </span>
              )}
            </div>
          )}

          {/* ── Auto-Calc Banner ── */}
          {(hasCalc || hasRR) && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 0, marginBottom: 12,
              border: `1px solid ${pnlNum >= 0 ? 'rgba(0,229,160,0.3)' : 'rgba(255,61,90,0.3)'}`,
              borderRadius: 3, overflow: 'hidden',
            }}>
              {/* P&L */}
              <div style={{
                padding: '12px 16px',
                background: pnlNum >= 0 ? 'rgba(0,229,160,0.07)' : 'rgba(255,61,90,0.07)',
                borderRight: `1px solid ${s.border}`,
              }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: s.text3, marginBottom: 4 }}>P&L</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: 1, color: pnlNum >= 0 ? s.green : s.red, lineHeight: 1 }}>
                  {pnlNum >= 0 ? '+' : ''}{fmt$(pnlNum)}
                </div>
                {f.isOptions && (
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: s.text3, marginTop: 4 }}>
                    {f.shares}c × {(Math.abs(parseFloat(f.exit || 0) - parseFloat(f.entry || 0))).toFixed(2)} × 100
                  </div>
                )}
              </div>

              {/* R:R */}
              <div style={{
                padding: '12px 16px',
                background: pnlNum >= 0 ? 'rgba(0,229,160,0.04)' : 'rgba(255,61,90,0.04)',
                borderRight: `1px solid ${s.border}`,
              }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: s.text3, marginBottom: 4 }}>R:R Achieved</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: 1, color: pnlNum >= 0 ? s.green : s.red, lineHeight: 1 }}>
                  {f.rr || '—'}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: s.text3, marginTop: 4 }}>
                  {f.rr && Number(f.rr) >= 2 ? '✓ Target hit' : f.rr && Number(f.rr) >= 1 ? '✓ Profitable' : f.rr ? '✗ Under 1R' : 'Enter stop for R:R'}
                </div>
              </div>

              {/* Outcome badge */}
              <div style={{
                padding: '12px 16px',
                background: f.outcome === 'win' ? 'rgba(0,229,160,0.04)' : f.outcome === 'loss' ? 'rgba(255,61,90,0.04)' : 'rgba(255,200,64,0.04)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: s.text3, marginBottom: 4 }}>Outcome</div>
                <div style={{
                  fontFamily: 'Bebas Neue', fontSize: 28, letterSpacing: 2,
                  color: f.outcome === 'win' ? s.green : f.outcome === 'loss' ? s.red : s.yellow,
                }}>
                  {f.outcome === 'win' ? 'WIN' : f.outcome === 'loss' ? 'LOSS' : f.outcome === 'be' ? 'B/E' : '—'}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: s.text3, marginTop: 2 }}>auto-set · override below</div>
              </div>
            </div>
          )}

          {/* ── Section 3: Result & Psychology ── */}
          <SectionLabel>Result & Psychology</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Lbl>P&L ($) <span style={{ color: s.green, fontSize: 8 }}>AUTO</span></Lbl>
              <Inp
                type="number"
                value={f.pnl || ''}
                onChange={e => set('pnl', e.target.value)}
                style={{ color: f.pnl !== '' ? (pnlNum >= 0 ? s.green : s.red) : undefined }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Lbl>R:R Achieved <span style={{ color: s.green, fontSize: 8 }}>AUTO</span></Lbl>
              <Inp value={f.rr || ''} onChange={e => set('rr', e.target.value)} />
            </div>
            <Select
              label="Outcome"
              fkey="outcome"
              opts={[{ v: 'win', l: 'Win ✓' }, { v: 'loss', l: 'Loss ✗' }, { v: 'be', l: 'Break Even' }]}
            />
            <Select
              label="Rules Followed?"
              fkey="rules"
              opts={[{ v: 'yes', l: 'Yes ✓' }, { v: 'no', l: 'No ✗' }, { v: 'partial', l: 'Partial' }]}
            />
          </div>

          {/* ── Section 4: Reflection ── */}
          <SectionLabel>Reflection</SectionLabel>
          {[
            ['What did you do well?',         'good',    'Entry confirmation, took stop cleanly...'],
            ['What would you improve?',        'improve', 'Entered too early, moved stop wider...'],
          ].map(([lbl, key, ph]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              <Lbl>{lbl}</Lbl>
              <textarea
                value={f[key] || ''}
                onChange={e => set(key, e.target.value)}
                placeholder={ph}
                style={{
                  background: s.bg, border: `1px solid ${s.border}`, borderRadius: 3,
                  color: s.text, fontFamily: 'JetBrains Mono', fontSize: 12,
                  padding: '8px 11px', outline: 'none', resize: 'vertical', minHeight: 52,
                }}
              />
            </div>
          ))}

        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 10, padding: '14px 22px', borderTop: `1px solid ${s.border}`, flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: s.text3 }}>
            {Object.keys(errors).length > 0
              ? <span style={{ color: s.red }}>⚠ Fill in required fields</span>
              : hasCalc
              ? <span style={{ color: s.text3 }}>P&L and R:R auto-calculated · override any field manually</span>
              : 'Enter buy price, sell price + qty to auto-calculate'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Trade'}
            </Btn>
          </div>
        </div>

      </div>
    </div>
  )
}
