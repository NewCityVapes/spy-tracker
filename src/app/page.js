'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTracker } from '../hooks/useTracker'

// ── Constants ─────────────────────────────────────────────────
const SETUPS = ['VWAP Reclaim','Gap Fill','ORB Breakout','Bull/Bear Flag','EMA Dip Buy','EMA Sell Rip','Other']
const DAY_TYPES = ['Trend','Chop','Reversal']
const EMOTIONS = ['Calm','FOMO','Anxious','Revenge','Confident','Greedy']
const TABS = ['Dashboard','Journal','Stats','Pre-Market','Checklist','Setups','Risk Calc']
const CL_NEWS = ['Check major econ data today (CPI, FOMC, NFP, PPI)','Check for Fed speakers scheduled','Note geopolitical headlines moving futures','What did SPY do yesterday?','Check ES futures direction and premarket level']
const CL_CHART = ['Mark Prior Day High (PDH)','Mark Prior Day Low (PDL)','Mark Prior Day Close','Mark Premarket High','Mark Premarket Low','Mark overnight consolidation zones','Mark round numbers near current price','VWAP, 9 EMA, 20 EMA confirmed on chart','15m, 5m, 1m charts open and ready']
const CL_MENTAL = ['Write directional bias for today','Write max loss in dollars','Write setups looking for today','Assess mental state — tired? anxious? distracted?','Commit: No trades before 9:55am','Commit: Take stop loss without hesitation','Commit: No revenge trading after a loss']
const CL_SETUP = ['Day type classified and this trade fits','Price above VWAP (long) or below VWAP (short)','EMAs confirming direction (slope correct)','Clear rejection or confirmation candle at entry level','Volume confirming (high on breakout, dry on pullback)']
const CL_RISK = ['Stop loss clearly defined before entry','Risk is within 0.5–1% of account','R:R is at least 1.5:1 or better','Clear target identified before entry']
const CL_MENTAL_TC = ['Entering because setup is valid — NOT boredom/FOMO','Have not hit daily max loss yet','Mentally clear and following the plan']
const SETUP_REF = [
  {title:'EMA/VWAP DIP BUY',wr:'55–65%',rows:[['Concept','Price pulls back to 9 EMA, 20 EMA, or VWAP on a confirmed trend day. Wait for rejection candle, enter in trend direction.'],['Best Time','10:00–11:30am and 2:00–3:30pm on confirmed trend days only'],['Entry','Close of rejection candle at EMA/VWAP. Or break above rejection candle high on 1-min.'],['Stop','9 EMA entry: stop below 20 EMA. 20 EMA entry: stop below VWAP. VWAP entry: stop below rejection candle low.'],['Target 1','Prior high of day — take 50% off here, move stop to breakeven'],['Target 2','Next resistance or when 9 EMA breaks on 5-min close'],['Filters','Pullback on declining volume. EMAs sloping in trend direction. TICK staying positive on dip. ADD holding above 2K.'],['Kill switch','VWAP crossed 3+ times. Sharp high-volume dip. News-driven move.']]},
  {title:'VWAP RECLAIM',wr:'55–65%',rows:[['Concept','Price loses VWAP, sellers exhaust on low volume, buyers reclaim with conviction.'],['Entry','Close of first 5-min candle back above VWAP, or retest of VWAP from above.'],['Stop','Below the low of the reclaim candle or most recent swing low under VWAP. $0.30–$0.70.'],['Target 1','Previous high of day or next resistance'],['Target 2','1.5–2x stop distance. Scale 50% at T1, move stop to breakeven.'],['Kill switch','VWAP crossed 3+ times — confirmed chop. No volume on reclaim candle.']]},
  {title:'GAP FILL',wr:'60–70%',rows:[['Concept','SPY opens above/below prior close. Strong tendency to fill, especially gaps under 0.5%.'],['Sweet Spot','0.1%–0.5% gaps. Over 1% less reliable.'],['Entry','Wait for initial move to stall on declining volume. Reversal candle pointing back to gap.'],['Stop','Above/below reversal candle. $0.40–$0.80.'],['Target','Prior day close (the gap fill level). Take partial, hold if momentum strong.'],['Kill switch','Major news day. Strong premarket volume. Continuation beyond first range.']]},
  {title:'ORB BREAKOUT',wr:'50–55%',rows:[['Concept','First 15–30 minutes establishes a range. Breakout with volume signals direction. Wait for retest.'],['Entry','Retest of breakout level holding as new support/resistance. Confirmation candle close.'],['Stop','Back inside the opening range. $0.30–$0.60.'],['Target','Opening range height projected from breakout point (measured move).'],['Kill switch','Low volume breakout. No retest. Major econ data releasing soon.']]},
  {title:'BULL/BEAR FLAG',wr:'55–60%',rows:[['Concept','Sharp high-volume impulse creates flagpole. Tight low-volume consolidation (flag). Breakout continues.'],['Setup','Impulse on 1.5–2x volume. Pullback under 50% of impulse. 3–5 consolidation candles. Volume dries up.'],['Entry','Break above flag high (bull) or below flag low (bear) with volume expanding.'],['Stop','Below the low of the flag consolidation. Skip if stop requires more than $0.80.'],['Target 1','1:1 R:R — take 50% off immediately'],['Target 2','Flagpole measured move from breakout. Trail stop after T1.'],['Kill switch','Pullback more than 60% of impulse. Ragged overlapping candles. Market reversing.']]},
]

const TIME_SLOTS = [
  {label:'9:30–10:00',min:570,max:600},
  {label:'10:00–11:30',min:600,max:690},
  {label:'11:30–13:00',min:690,max:780},
  {label:'13:00–14:00',min:780,max:840},
  {label:'14:00–15:30',min:840,max:930},
  {label:'15:30–16:00',min:930,max:960},
]

const BLANK = {id:'',date:'',time:'',dir:'LONG',setup:'',dayType:'',outcome:'',entry:'',stop:'',exit:'',shares:'',pnl:'',rr:'',rules:'yes',emotion:'',good:'',improve:''}

// ── Utils ──────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const tod = () => new Date().toISOString().slice(0,10)
const pct = (v, d=0) => isNaN(v) || !isFinite(v) ? '—' : (v*100).toFixed(d)+'%'
const fmt$ = (v, sign=false) => {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '—'
  const n = Number(v)
  return (sign && n > 0 ? '+' : n < 0 ? '-' : '') + '$' + Math.abs(n).toFixed(2)
}

function calcStats(trades) {
  const total = trades.length
  const wins = trades.filter(t => t.outcome === 'win')
  const losses = trades.filter(t => t.outcome === 'loss')
  const wr = total > 0 ? wins.length / total : 0
  const pnls = trades.filter(t => t.pnl !== '' && t.pnl !== null).map(t => Number(t.pnl))
  const totalPnl = pnls.reduce((a, b) => a + b, 0)
  const winPnls = wins.filter(t => t.pnl !== '' && t.pnl !== null).map(t => Number(t.pnl))
  const lossPnls = losses.filter(t => t.pnl !== '' && t.pnl !== null).map(t => Number(t.pnl))
  const avgWin = winPnls.length > 0 ? winPnls.reduce((a,b) => a+b, 0) / winPnls.length : 0
  const avgLoss = lossPnls.length > 0 ? Math.abs(lossPnls.reduce((a,b) => a+b, 0) / lossPnls.length) : 0
  const pf = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * (losses.length || 1)) : 0
  const exp = avgWin * wr - avgLoss * (1 - wr)
  const kelly = avgLoss > 0 ? wr - (1 - wr) / (avgWin / (avgLoss || 1)) : 0
  let peak = 0, maxDd = 0, run = 0
  ;[...trades].sort((a,b) => (a.date||'') > (b.date||'') ? 1 : -1).forEach(t => {
    run += Number(t.pnl || 0)
    if (run > peak) peak = run
    const dd = peak - run; if (dd > maxDd) maxDd = dd
  })
  let maxW = 0, maxL = 0, cw = 0, cl = 0
  ;[...trades].sort((a,b) => (a.date||'') > (b.date||'') ? 1 : -1).forEach(t => {
    if (t.outcome === 'win') { cw++; cl = 0; if (cw > maxW) maxW = cw }
    else if (t.outcome === 'loss') { cl++; cw = 0; if (cl > maxL) maxL = cl }
    else { cw = 0; cl = 0 }
  })
  const compT = trades.filter(t => t.rules === 'yes')
  const brokenT = trades.filter(t => t.rules === 'no')
  const wrComp = compT.length > 0 ? compT.filter(t => t.outcome === 'win').length / compT.length : 0
  const wrBroken = brokenT.length > 0 ? brokenT.filter(t => t.outcome === 'win').length / brokenT.length : 0
  const compliance = total > 0 ? compT.length / total : 0
  return { total, wins: wins.length, losses: losses.length, wr, totalPnl, avgWin, avgLoss, pf, exp, kelly, maxDd, maxW, maxL, compliance, wrComp, wrBroken, compCount: compT.length, brokenCount: brokenT.length }
}

// ── UI Primitive ──────────────────────────────────────────────
const s = {
  bg:'#060a0e',bg2:'#0b1018',bg3:'#111820',border:'#1a2535',border2:'#243040',
  green:'#00e5a0',red:'#ff3d5a',yellow:'#ffc840',blue:'#2196f3',orange:'#ff7043',
  text:'#dce8f5',text2:'#7a9bb5',text3:'#3d5870',
}

const Card = ({ children, accent, style = {} }) => (
  <div style={{ background: s.bg2, border: `1px solid ${s.border}`, borderRadius: 3, padding: '16px 20px', position: 'relative', overflow: 'hidden', ...(accent ? { borderTop: `2px solid ${accent}` } : {}), ...style }}>
    {children}
  </div>
)

const Lbl = ({ children, style = {} }) => (
  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: s.text3, marginBottom: 6, ...style }}>{children}</div>
)

const StatCard = ({ label, value, col, sub, bar }) => (
  <Card accent={col} style={{ padding: '14px 16px' }}>
    <Lbl>{label}</Lbl>
    <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, letterSpacing: 1, color: col || s.text, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: s.text3, marginTop: 5 }}>{sub}</div>}
    {bar !== undefined && (
      <div style={{ height: 3, background: s.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct(Math.min(bar, 1)), background: col, borderRadius: 2, transition: 'width .4s' }} />
      </div>
    )}
  </Card>
)

const Badge = ({ type, children }) => {
  const map = { win: [s.green,'rgba(0,229,160,0.12)'], loss: [s.red,'rgba(255,61,90,0.12)'], be: [s.yellow,'rgba(255,200,64,0.12)'], Trend: [s.green,'rgba(0,229,160,0.08)'], Chop: [s.yellow,'rgba(255,200,64,0.08)'], Reversal: [s.red,'rgba(255,61,90,0.08)'], yes: [s.green,'rgba(0,229,160,0.08)'], no: [s.red,'rgba(255,61,90,0.08)'], partial: [s.yellow,'rgba(255,200,64,0.08)'] }
  const [c, bg] = map[type] || [s.text2, 'rgba(122,155,181,0.1)']
  return <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 2, fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: c, background: bg, border: `1px solid ${c}33` }}>{children}</span>
}

const Inp = ({ style = {}, ...p }) => (
  <input style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 3, color: s.text, fontFamily: 'JetBrains Mono', fontSize: 12, padding: '8px 11px', outline: 'none', width: '100%', ...style }} {...p} />
)

const Sel = ({ children, style = {}, ...p }) => (
  <select style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 3, color: s.text, fontFamily: 'JetBrains Mono', fontSize: 12, padding: '8px 11px', outline: 'none', width: '100%', ...style }} {...p}>{children}</select>
)

const Btn = ({ variant = 'primary', style = {}, ...p }) => {
  const variants = { primary: { background: s.green, color: s.bg, border: 'none' }, ghost: { background: 'transparent', color: s.text2, border: `1px solid ${s.border}` }, danger: { background: 'transparent', color: s.red, border: `1px solid rgba(255,61,90,0.3)` } }
  return <button style={{ fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, cursor: 'pointer', ...(variants[variant] || variants.primary), ...style }} {...p} />
}

const ChartRow = ({ label, val, count, col }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${s.border}`, fontFamily: 'JetBrains Mono', fontSize: 11 }}>
    <span style={{ color: s.text2, minWidth: 130, fontSize: 10 }}>{label}</span>
    <div style={{ flex: 1, height: 5, background: s.border, borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: pct(Math.min(isNaN(val) ? 0 : val, 1)), background: col || s.green, borderRadius: 3, transition: 'width .5s' }} />
    </div>
    <span style={{ color: col || s.green, minWidth: 45, textAlign: 'right', fontSize: 10 }}>{pct(val, 0)}</span>
    {count !== undefined && <span style={{ color: s.text3, minWidth: 28, textAlign: 'right', fontSize: 10 }}>{count}t</span>}
  </div>
)

// ── Equity Curve ───────────────────────────────────────────────
function EquityCurve({ trades }) {
  const sorted = [...trades].filter(t => t.pnl !== '' && t.pnl !== null).sort((a,b) => (a.date||'') > (b.date||'') ? 1 : -1).slice(-20)
  if (sorted.length < 2) return <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono', fontSize: 11, color: s.text3 }}>Need 2+ trades with P&L</div>
  let run = 0
  const pts = sorted.map((t, i) => { run += Number(t.pnl); return { x: i, y: run } })
  const minY = Math.min(...pts.map(p => p.y))
  const maxY = Math.max(...pts.map(p => p.y))
  const rng = maxY - minY || 1
  const W = 400, H = 100, pad = 8
  const px = i => (i / (pts.length - 1)) * (W - pad * 2) + pad
  const py = v => H - pad - ((v - minY) / rng) * (H - pad * 2)
  const polyline = pts.map(p => `${px(p.x)},${py(p.y)}`).join(' ')
  const area = `M${px(0)},${py(pts[0].y)} ${pts.map(p => `L${px(p.x)},${py(p.y)}`).join(' ')} L${px(pts.length-1)},${H} L${px(0)},${H} Z`
  const col = run >= 0 ? s.green : s.red
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 100 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity=".25" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#eg)" />
      <polyline points={polyline} fill="none" stroke={col} strokeWidth="2" />
      <circle cx={px(pts.length-1)} cy={py(pts[pts.length-1].y)} r="4" fill={col} />
    </svg>
  )
}

// ── Trade Modal ────────────────────────────────────────────────
// REPLACE your existing TradeModal function with this one
// P&L and R:R now auto-calculate from entry, stop, exit, shares

function TradeModal({ trade, onSave, onClose, saving }) {
  const [f, setF] = useState({ ...BLANK, date: tod(), time: new Date().toTimeString().slice(0,5), ...trade })
  
  const set = (k, v) => setF(p => {
    const updated = { ...p, [k]: v }

    // Auto-calculate P&L and R:R whenever relevant fields change
    const entry  = parseFloat(k === 'entry'  ? v : updated.entry)
    const stop   = parseFloat(k === 'stop'   ? v : updated.stop)
    const exit   = parseFloat(k === 'exit'   ? v : updated.exit)
    const shares = parseFloat(k === 'shares' ? v : updated.shares)
    

    // P&L: (exit - entry) * shares, flipped for SHORT
    if (!isNaN(entry) && !isNaN(exit) && !isNaN(shares) && shares > 0) {
      const rawPnl = (exit - entry) * shares
updated.pnl = rawPnl.toFixed(2)

    }

    // R:R Achieved: how many R's did you make/lose?
    // R = distance from entry to stop (risk per share)
    if (!isNaN(entry) && !isNaN(stop) && !isNaN(exit) && stop !== entry) {
      const riskPerShare = Math.abs(entry - stop)
     const gainPerShare = (exit - entry)
const rr = gainPerShare / riskPerShare
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
      <Inp type={type} value={f[key] || ''} onChange={e => set(key, e.target.value)} {...extra} />
    </div>
  )

  const SL = (label, key, opts) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Lbl>{label}</Lbl>
      <Sel value={f[key] || ''} onChange={e => set(key, e.target.value)}>
        <option value="">Select...</option>
        {opts.map(o => <option key={typeof o === 'object' ? o.v : o} value={typeof o === 'object' ? o.v : o}>{typeof o === 'object' ? o.l : o}</option>)}
      </Sel>
    </div>
  )

  // Derived display values for the auto-calc preview
  const hasAutoCalc = f.pnl !== '' && f.rr !== ''
  const pnlNum = Number(f.pnl)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: s.bg2, border: `1px solid ${s.border2}`, borderRadius: 4, width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto' }} className="fade-in">
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: `1px solid ${s.border}` }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 2, color: s.green }}>{f.id ? 'Edit Trade' : 'Log Trade'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: s.text3, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 22 }}>

          {/* Row 1: Date / Time / Direction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            {F('Date', 'date', 'date')}
            {F('Time', 'time', 'time')}
            {SL('Direction', 'dir', ['LONG', 'SHORT'])}
          </div>

          {/* Row 2: Setup / Day Type / Outcome (auto-set but still editable) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            {SL('Setup', 'setup', SETUPS)}
            {SL('Day Type', 'dayType', DAY_TYPES)}
            {SL('Outcome', 'outcome', [{ v: 'win', l: 'Win' }, { v: 'loss', l: 'Loss' }, { v: 'be', l: 'Break Even' }])}
          </div>

          {/* Row 3: Entry / Stop / Exit / Shares — these drive the calculations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            {F('Buy Price ($)', 'entry', 'number', { placeholder: '480.00', step: '0.01' })}
            {F('Stop ($)', 'stop', 'number', { placeholder: '479.50', step: '0.01' })}
            {F('Sell Price ($)', 'exit', 'number', { placeholder: '481.00', step: '0.01' })}
            {F('Shares / Qty', 'shares', 'number', { placeholder: '100' })}
          </div>

          {/* Auto-calc display banner */}
          {hasAutoCalc && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 12,
              padding: '12px 14px',
              background: pnlNum >= 0 ? 'rgba(0,229,160,0.06)' : 'rgba(255,61,90,0.06)',
              border: `1px solid ${pnlNum >= 0 ? 'rgba(0,229,160,0.25)' : 'rgba(255,61,90,0.25)'}`,
              borderRadius: 3,
            }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: s.text3, marginBottom: 4 }}>P&L (Auto)</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, letterSpacing: 1, color: pnlNum >= 0 ? s.green : s.red, lineHeight: 1 }}>
                  {pnlNum >= 0 ? '+' : ''}{fmt$(pnlNum)}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: s.text3, marginBottom: 4 }}>R:R Achieved (Auto)</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, letterSpacing: 1, color: pnlNum >= 0 ? s.green : s.red, lineHeight: 1 }}>
                  {f.rr}
                </div>
              </div>
            </div>
          )}

          {/* Row 4: P&L / R:R (still editable in case of manual override) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Lbl>P&L ($) <span style={{ color: s.green, fontSize: 8 }}>AUTO</span></Lbl>
              <Inp type="number" value={f.pnl || ''} onChange={e => set('pnl', e.target.value)} style={{ color: Number(f.pnl) >= 0 ? s.green : s.red }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Lbl>R:R Achieved <span style={{ color: s.green, fontSize: 8 }}>AUTO</span></Lbl>
              <Inp value={f.rr || ''} onChange={e => set('rr', e.target.value)} style={{ color: s.text }} />
            </div>
            {SL('Rules Followed?', 'rules', [{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }, { v: 'partial', l: 'Partial' }])}
            {SL('Emotion', 'emotion', EMOTIONS)}
          </div>

          {/* Notes */}
          {[['What did you do well?', 'good', 'Entry confirmation, took stop cleanly...'], ['What would you do differently?', 'improve', 'Entered too early, moved stop wider...']].map(([lbl, key, ph]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              <Lbl>{lbl}</Lbl>
              <textarea value={f[key] || ''} onChange={e => set(key, e.target.value)} placeholder={ph} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 3, color: s.text, fontFamily: 'JetBrains Mono', fontSize: 12, padding: '8px 11px', outline: 'none', resize: 'vertical', minHeight: 56 }} />
            </div>
          ))}

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: `1px solid ${s.border}` }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => { if (!f.outcome) return; onSave({ ...f, id: f.id || uid() }) }} disabled={saving}>
            {saving ? 'Saving...' : 'Save Trade'}
          </Btn>
        </div>

      </div>
    </div>
  )
}


// ── Checklist Component ────────────────────────────────────────
function CL({ items, group, toggle, checked }) {
  return (
    <div>
      {items.map((item, i) => {
        const chk = checked(group, i)
        return (
          <div key={i} onClick={() => toggle(group, i)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 3, cursor: 'pointer', background: chk ? 'rgba(0,229,160,0.03)' : 'transparent', marginBottom: 2, userSelect: 'none' }}>
            <div style={{ width: 14, height: 14, border: `1.5px solid ${chk ? s.green : s.border2}`, borderRadius: 2, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, background: chk ? s.green : 'transparent', color: s.bg, transition: 'all .2s' }}>{chk ? '✓' : ''}</div>
            <span style={{ fontSize: 12, color: chk ? s.text3 : s.text2, textDecoration: chk ? 'line-through' : 'none', lineHeight: 1.5 }}>{item}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const { trades, gameplan, checklists, dayTypes, loading, saving, error, saveTrade, deleteTrade, saveGameplan, toggleChecklist, resetChecklist, saveDayType, exportBackup, exportCSV, importBackup } = useTracker()

  const [tab, setTab] = useState('Dashboard')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [clk, setClk] = useState('')
  const [sortCol, setSortCol] = useState('date')
  const [sortDir, setSortDir] = useState(-1)
  const [filters, setFilters] = useState({ setup: '', dayType: '', outcome: '', rules: '', from: '', to: '' })
  const [openSetup, setOpenSetup] = useState(null)
  const [rc, setRc] = useState({ account: '', pct: '1', entry: '', stop: '', t1: '', t2: '', t3: '' })

  useEffect(() => {
    const i = setInterval(() => setClk(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000)
    return () => clearInterval(i)
  }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2800) }

  const handleSaveTrade = async (form) => {
    const res = await saveTrade(form)
    if (res.success) { setModal(null); showToast(form.id && trades.find(t => t.id === form.id) ? 'Trade updated ✓' : 'Trade saved ✓') }
    else showToast('Error: ' + res.error)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this trade?')) return
    const res = await deleteTrade(id)
    if (res.success) showToast('Deleted')
    else showToast('Error: ' + res.error)
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const res = await importBackup(file)
    if (res.success) showToast(`Imported ${res.count} trades ✓`)
    else showToast('Import failed: ' + res.error)
  }

  const today = tod()
  const todayGP = gameplan[today] || {}
  const curDT = dayTypes[today] || null
  const todayTrades = trades.filter(t => t.date === today)
  const todayPnl = todayTrades.reduce((a, t) => a + Number(t.pnl || 0), 0)
  const st = calcAllStats(trades)

  function calcAllStats(t) { return calcStats(t) }

  // Filters & sort
  const filtered = trades.filter(t => {
    if (filters.setup && t.setup !== filters.setup) return false
    if (filters.dayType && t.dayType !== filters.dayType) return false
    if (filters.outcome && t.outcome !== filters.outcome) return false
    if (filters.rules && t.rules !== filters.rules) return false
    if (filters.from && (t.date || '') < filters.from) return false
    if (filters.to && (t.date || '') > filters.to) return false
    return true
  }).sort((a, b) => {
    let av = a[sortCol] || '', bv = b[sortCol] || ''
    if (sortCol === 'pnl') { av = Number(av) || 0; bv = Number(bv) || 0 }
    return av < bv ? sortDir : av > bv ? -sortDir : 0
  })

  const doSort = col => { if (sortCol === col) setSortDir(d => -d); else { setSortCol(col); setSortDir(-1) } }
  const SI = col => sortCol === col ? (sortDir === -1 ? ' ▼' : ' ▲') : ''

  // Checklist helpers
  const pmChk = (group, i) => !!(checklists[today] && checklists[today][group] && checklists[today][group][i])
  const tcChk = (group, i) => pmChk(group, i) // reusing same structure, prefixed by "tc_"
  const pmToggle = (group, i) => toggleChecklist(today, group, i)
  const tcToggle = (group, i) => toggleChecklist(today, 'tc_' + group, i)
  const tcChkFn = (group, i) => !!(checklists[today] && checklists[today]['tc_' + group] && checklists[today]['tc_' + group][i])

  const tcAll = [...CL_SETUP, ...CL_RISK, ...CL_MENTAL_TC]
  const tcChecked = CL_SETUP.filter((_, i) => tcChkFn('setup', i)).length + CL_RISK.filter((_, i) => tcChkFn('risk', i)).length + CL_MENTAL_TC.filter((_, i) => tcChkFn('mental', i)).length
  const tcPct = tcAll.length > 0 ? tcChecked / tcAll.length : 0

  // By field breakdown
  const byField = (field, vals) => vals.map(v => {
    const g = trades.filter(t => t[field] === v)
    const w = g.filter(t => t.outcome === 'win').length
    const tot = g.length; const wr = tot > 0 ? w / tot : 0
    const pnl = g.reduce((a, t) => a + Number(t.pnl || 0), 0)
    return { label: v, wr, tot, w, pnl }
  }).filter(x => x.tot > 0)

  const bySetup = byField('setup', SETUPS)
  const byDT = byField('dayType', DAY_TYPES)
  const byDir = byField('dir', ['LONG', 'SHORT'])
  const byEmotion = byField('emotion', EMOTIONS)
  const byTime = TIME_SLOTS.map(slot => {
    const g = trades.filter(t => { if (!t.time) return false; const [h, m] = t.time.split(':').map(Number); const mins = h * 60 + m; return mins >= slot.min && mins < slot.max })
    const w = g.filter(t => t.outcome === 'win').length; const tot = g.length; const wr = tot > 0 ? w / tot : 0
    return { label: slot.label, wr, tot }
  }).filter(x => x.tot > 0)

  // Daily
  const byDay = {}
  trades.forEach(t => { if (!t.date) return; if (!byDay[t.date]) byDay[t.date] = { pnl: 0, n: 0, w: 0 }; byDay[t.date].pnl += Number(t.pnl || 0); byDay[t.date].n++; if (t.outcome === 'win') byDay[t.date].w++ })
  const dailyRows = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30)

  // Risk calc
  const rcRes = () => {
    const a = parseFloat(rc.account), p = parseFloat(rc.pct), e = parseFloat(rc.entry), st2 = parseFloat(rc.stop)
    if (!a || !p || !e || !st2) return null
    const risk = a * (p / 100), dist = Math.abs(e - st2), shares = dist > 0 ? Math.floor(risk / dist) : 0, pos = shares * e
    const rr = (tgt) => dist > 0 ? (Math.abs(tgt - e) / dist).toFixed(2) : null
    const profit = (tgt) => Math.abs(tgt - e) * shares
    return { risk, dist, shares, pos, dailyMax: a * 0.02, t1: rc.t1 ? { p: profit(parseFloat(rc.t1)), rr: rr(parseFloat(rc.t1)) } : null, t2: rc.t2 ? { p: profit(parseFloat(rc.t2)), rr: rr(parseFloat(rc.t2)) } : null, t3: rc.t3 ? { p: profit(parseFloat(rc.t3)), rr: rr(parseFloat(rc.t3)) } : null }
  }

  if (loading) return (
    <div style={{ background: s.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: 4, color: s.green }} className="pulse">SPY / TRACKER</div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: s.text3 }}>Connecting to database...</div>
    </div>
  )

  if (error) return (
    <div style={{ background: s.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, letterSpacing: 3, color: s.red }}>Connection Error</div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: s.text2, maxWidth: 400, textAlign: 'center', lineHeight: 1.8 }}>{error}</div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: s.text3, textAlign: 'center', maxWidth: 500, lineHeight: 2 }}>
        Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly in your environment variables.
      </div>
    </div>
  )

  const RRow = ({ label, val, col }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${s.border}`, fontFamily: 'JetBrains Mono', fontSize: 11 }}>
      <span style={{ color: s.text3 }}>{label}</span>
      <span style={{ color: col || s.green, fontWeight: 600 }}>{val}</span>
    </div>
  )

  const streakDots = [...trades].sort((a,b) => (a.date||'') > (b.date||'') ? 1 : -1).slice(-20).map((t, i) => (
    <span key={i} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', marginRight: 3, background: t.outcome === 'win' ? s.green : t.outcome === 'loss' ? s.red : s.yellow }} />
  ))

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 200, background: 'rgba(6,10,14,0.97)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${s.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, padding: '0 20px' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, letterSpacing: 4, color: s.green }}>
            SPY<span style={{ color: s.text3 }}>/</span>TRACKER
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: s.text3, letterSpacing: 2, marginLeft: 12 }}>CLOUD SYNC</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {saving && <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: s.yellow }} className="pulse">Saving...</div>}
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: s.text, fontWeight: 600 }}>{clk}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', padding: '0 12px', borderTop: `1px solid ${s.border}` }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '13px 16px', border: 'none', background: 'none', color: tab === t ? s.green : s.text3, borderBottom: `2px solid ${tab === t ? s.green : 'transparent'}`, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s' }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 20px 80px', maxWidth: 1300, margin: '0 auto' }}>

        {/* ══ DASHBOARD ══ */}
        {tab === 'Dashboard' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 20 }}>
              <StatCard label="Today P&L" value={`${todayPnl >= 0 ? '+' : ''}$${Math.abs(todayPnl).toFixed(0)}`} col={todayPnl >= 0 ? s.green : s.red} sub={`${todayTrades.length} trades today`} />
              <StatCard label="All-Time P&L" value={`${st.totalPnl >= 0 ? '+' : ''}$${Math.abs(st.totalPnl).toFixed(0)}`} col={st.totalPnl >= 0 ? s.green : s.red} sub={`${st.total} total trades`} />
              <StatCard label="Win Rate" value={pct(st.wr, 1)} col={st.wr >= 0.5 ? s.green : s.red} sub={`${st.wins}W / ${st.losses}L`} bar={st.wr} />
              <StatCard label="Profit Factor" value={st.pf.toFixed(2)} col={st.pf >= 1 ? s.green : s.red} sub=">1.0 = profitable" />
              <StatCard label="Expectancy" value={`${st.exp >= 0 ? '+' : ''}$${Math.abs(st.exp).toFixed(0)}`} col={st.exp >= 0 ? s.green : s.red} sub="per trade avg" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Card accent={s.green}>
                <Lbl>Today's Game Plan</Lbl>
                {[['Bias', todayGP.bias || '—'], ['Max Loss', todayGP.maxloss ? '$' + todayGP.maxloss : '—'], ['Day Type', curDT ? curDT.toUpperCase() : 'Not classified'], ['Key Level', todayGP.level || '—']].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${s.border}`, fontFamily: 'JetBrains Mono', fontSize: 11 }}>
                    <span style={{ color: s.text3 }}>{l}</span><span style={{ color: s.text2 }}>{v}</span>
                  </div>
                ))}
              </Card>
              <Card>
                <Lbl>Recent Trades</Lbl>
                {trades.length === 0 ? <div style={{ color: s.text3, fontFamily: 'JetBrains Mono', fontSize: 11, padding: '16px 0' }}>No trades logged yet</div> :
                  trades.slice(0, 5).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${s.border}` }}>
                      <div><span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: s.text2 }}>{t.setup || 'Trade'}</span> <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: s.text3 }}>{t.date}</span></div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: Number(t.pnl) > 0 ? s.green : Number(t.pnl) < 0 ? s.red : s.text3 }}>{fmt$(Number(t.pnl), true)}</span>
                        <Badge type={t.outcome}>{t.outcome === 'win' ? 'WIN' : t.outcome === 'loss' ? 'LOSS' : 'B/E'}</Badge>
                      </div>
                    </div>
                  ))
                }
              </Card>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card>
                <Lbl>Win/Loss Streak (last 20)</Lbl>
                <div style={{ marginBottom: 10 }}>{streakDots.length > 0 ? streakDots : <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: s.text3 }}>No trades yet</span>}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: s.text3 }}>🟢 Win &nbsp; 🔴 Loss &nbsp; 🟡 B/E</div>
              </Card>
              <Card>
                <Lbl>Equity Curve (last 20 trades)</Lbl>
                <EquityCurve trades={trades} />
              </Card>
            </div>
          </div>
        )}

        {/* ══ JOURNAL ══ */}
        {tab === 'Journal' && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 3, color: s.green }}>Trade Journal</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: s.text3, marginTop: 2 }}>Click any row to edit • All data synced to cloud</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <label style={{ fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, cursor: 'pointer', background: 'transparent', color: s.text2, border: `1px solid ${s.border}` }}>
                  ⬆ Import <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                </label>
                <Btn variant="ghost" onClick={exportBackup}>⬇ Backup</Btn>
                <Btn variant="ghost" onClick={exportCSV}>⬇ CSV</Btn>
                <Btn onClick={() => setModal({ ...BLANK, date: today, time: new Date().toTimeString().slice(0,5), dayType: curDT ? curDT.charAt(0).toUpperCase() + curDT.slice(1) : '' })}>+ Log Trade</Btn>
              </div>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 14, padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {[['Setup','setup',[''].concat(SETUPS)],['Day Type','dayType',['','Trend','Chop','Reversal']],['Outcome','outcome',['','win','loss','be']],['Rules','rules',['','yes','no','partial']]].map(([l,k,opts]) => (
                  <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 110 }}>
                    <Lbl>{l}</Lbl>
                    <Sel value={filters[k]} onChange={e => setFilters(f => ({ ...f, [k]: e.target.value }))} style={{ width: 'auto' }}>
                      {opts.map(o => <option key={o} value={o}>{o || 'All'}</option>)}
                    </Sel>
                  </div>
                ))}
                {[['From','from'],['To','to']].map(([l,k]) => (
                  <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 110 }}>
                    <Lbl>{l}</Lbl>
                    <Inp type="date" value={filters[k]} onChange={e => setFilters(f => ({ ...f, [k]: e.target.value }))} style={{ width: 'auto' }} />
                  </div>
                ))}
                <Btn variant="ghost" onClick={() => setFilters({ setup: '', dayType: '', outcome: '', rules: '', from: '', to: '' })} style={{ padding: '8px 14px' }}>Clear</Btn>
              </div>
            </Card>

            <Card style={{ padding: 0 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', fontFamily: 'JetBrains Mono', fontSize: 11, color: s.text3 }}>No trades match current filters</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
                    <thead>
                      <tr>
                        {[['date','Date'],['dir','Dir'],['setup','Setup'],['dayType','Day'],['entry','Entry'],['exit','Exit'],['shares','Qty'],['pnl','P&L'],['rr','R:R'],['rules','Rules'],['emotion','Emotion'],['outcome','Result']].map(([col,lbl]) => (
                          <th key={col} onClick={() => doSort(col)} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: sortCol === col ? s.green : s.text3, borderBottom: `1px solid ${s.border}`, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                            {lbl}{SI(col)}
                          </th>
                        ))}
                        <th style={{ borderBottom: `1px solid ${s.border}` }} />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(t => (
                        <tr key={t.id} onClick={() => setModal(t)} style={{ cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = s.bg3} onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}`, whiteSpace: 'nowrap', color: s.text2 }}>{t.date}<br /><span style={{ color: s.text3, fontSize: 9 }}>{t.time}</span></td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}`, color: t.dir === 'LONG' ? s.green : s.red, fontWeight: 700 }}>{t.dir}</td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}`, color: s.text2, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.setup || '—'}</td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}` }}>{t.dayType ? <Badge type={t.dayType}>{t.dayType}</Badge> : '—'}</td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}`, color: s.text2 }}>{t.entry ? '$' + t.entry : '—'}</td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}`, color: s.text2 }}>{t.exit ? '$' + t.exit : '—'}</td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}`, color: s.text2 }}>{t.shares || '—'}</td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}`, color: Number(t.pnl) > 0 ? s.green : Number(t.pnl) < 0 ? s.red : s.text3, fontWeight: 600 }}>{fmt$(Number(t.pnl), true)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}`, color: s.text2 }}>{t.rr || '—'}</td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}` }}><Badge type={t.rules}>{t.rules || '—'}</Badge></td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}`, color: s.text3, fontSize: 10 }}>{t.emotion || '—'}</td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}` }}><Badge type={t.outcome}>{t.outcome === 'win' ? 'WIN' : t.outcome === 'loss' ? 'LOSS' : t.outcome === 'be' ? 'B/E' : '—'}</Badge></td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${s.border}` }} onClick={e => { e.stopPropagation(); handleDelete(t.id) }}>
                            <button style={{ background: 'none', border: 'none', color: s.text3, cursor: 'pointer', fontSize: 12 }} onMouseEnter={e => e.target.style.color = s.red} onMouseLeave={e => e.target.style.color = s.text3}>✕</button>
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: s.bg3 }}>
                        <td colSpan={7} style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: 10, color: s.text3 }}>FILTERED ({filtered.length} trades)</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontWeight: 700, color: filtered.reduce((a,t) => a+Number(t.pnl||0),0) >= 0 ? s.green : s.red }}>
                          {fmt$(filtered.reduce((a,t) => a+Number(t.pnl||0),0), true)}
                        </td>
                        <td colSpan={5} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ══ STATS ══ */}
        {tab === 'Stats' && (
          <div className="fade-in">
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 3, color: s.green, marginBottom: 4 }}>Performance Analytics</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: s.text3, marginBottom: 20 }}>Auto-calculated from your trade log — {st.total} trades total</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 16 }}>
              <StatCard label="Total Trades" value={st.total} col={s.blue} />
              <StatCard label="Win Rate" value={pct(st.wr,1)} col={st.wr>=0.5?s.green:s.red} sub={`${st.wins}W / ${st.losses}L`} bar={st.wr} />
              <StatCard label="Total P&L" value={`${st.totalPnl>=0?'+':''}$${Math.abs(st.totalPnl).toFixed(0)}`} col={st.totalPnl>=0?s.green:s.red} />
              <StatCard label="Profit Factor" value={st.pf.toFixed(2)} col={st.pf>=1?s.green:s.red} sub=">1.0 = profitable" />
              <StatCard label="Compliance" value={pct(st.compliance)} col={st.compliance>=0.8?s.green:s.yellow} bar={st.compliance} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
              {[['Avg Win',fmt$(st.avgWin),s.green,'per winning trade'],['Avg Loss','$'+st.avgLoss.toFixed(2),s.red,'per losing trade'],['Win:Loss Ratio',st.avgLoss>0?(st.avgWin/st.avgLoss).toFixed(2)+'x':'—',st.avgLoss>0&&st.avgWin/st.avgLoss>=1.5?s.green:s.yellow,'target ≥ 1.5x'],['Max Drawdown','$'+st.maxDd.toFixed(2),s.red,'largest losing run']].map(([l,v,c,sub]) => (
                <Card key={l} style={{ padding: '14px 16px' }}>
                  <Lbl>{l}</Lbl>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, color: c, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: s.text3, marginTop: 5 }}>{sub}</div>
                </Card>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Card accent={s.yellow}>
                <Lbl>Expectancy & Kelly Criterion</Lbl>
                {[['Expectancy',`${st.exp>=0?'+':''}$${st.exp.toFixed(2)} per trade`,st.exp>=0?s.green:s.red],['Kelly %',`${(Math.max(0,Math.min(st.kelly*100,25))).toFixed(1)}% of account`,s.yellow],['Half Kelly (safer)',`${(Math.max(0,Math.min(st.kelly*100,25))/2).toFixed(1)}% of account`,s.green],['Max Win Streak',`${st.maxW} in a row`,s.green],['Max Loss Streak',`${st.maxL} in a row`,s.red]].map(([l,v,c]) => <RRow key={l} label={l} val={v} col={c}/>)}
                <div style={{ marginTop: 12, padding: 10, background: 'rgba(33,150,243,0.05)', border: '1px solid rgba(33,150,243,0.15)', borderRadius: 3, fontFamily: 'JetBrains Mono', fontSize: 10, color: s.text2, lineHeight: 1.7 }}>
                  Expectancy = avg $ per trade at scale. Use Half Kelly for real position sizing.
                </div>
              </Card>
              <Card>
                <Lbl>Rules Compliance Impact</Lbl>
                <ChartRow label="Followed Rules" val={st.wrComp} count={st.compCount} col={s.green} />
                <ChartRow label="Broke Rules" val={st.wrBroken} count={st.brokenCount} col={s.red} />
                {st.brokenCount > 0 && st.wrComp > st.wrBroken && (
                  <div style={{ marginTop: 12, padding: 10, background: 'rgba(255,200,64,0.05)', border: '1px solid rgba(255,200,64,0.15)', borderRadius: 3, fontFamily: 'JetBrains Mono', fontSize: 10, color: s.yellow }}>
                    ⚠ You win {pct(st.wrComp - st.wrBroken, 0)} more often when you follow your rules.
                  </div>
                )}
              </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Card accent={s.green}><Lbl>By Setup</Lbl>{bySetup.length===0?<div style={{color:s.text3,fontFamily:'JetBrains Mono',fontSize:11,padding:'16px 0'}}>No data yet</div>:bySetup.map(d=><ChartRow key={d.label} label={d.label} val={d.wr} count={d.tot} col={d.wr>=0.5?s.green:s.red}/>)}</Card>
              <Card><Lbl>By Day Type</Lbl>{byDT.length===0?<div style={{color:s.text3,fontFamily:'JetBrains Mono',fontSize:11,padding:'16px 0'}}>No data yet</div>:byDT.map(d=><ChartRow key={d.label} label={d.label} val={d.wr} count={d.tot} col={d.label==='Trend'?s.green:d.label==='Chop'?s.yellow:s.red}/>)}</Card>
              <Card accent={s.blue}><Lbl>By Time of Day</Lbl>{byTime.length===0?<div style={{color:s.text3,fontFamily:'JetBrains Mono',fontSize:11,padding:'16px 0'}}>No data yet</div>:byTime.map(d=><ChartRow key={d.label} label={d.label} val={d.wr} count={d.tot} col={d.wr>=0.5?s.green:s.red}/>)}</Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Card><Lbl>By Direction</Lbl>{byDir.map(d=><div key={d.label}><ChartRow label={d.label} val={d.wr} count={d.tot} col={d.label==='LONG'?s.green:s.red}/><div style={{fontFamily:'JetBrains Mono',fontSize:10,color:d.pnl>=0?s.green:s.red,padding:'3px 0 10px 0'}}>{d.label} P&L: {fmt$(d.pnl,true)}</div></div>)}</Card>
              <Card><Lbl>By Emotion</Lbl>{byEmotion.length===0?<div style={{color:s.text3,fontFamily:'JetBrains Mono',fontSize:11,padding:'16px 0'}}>No data yet</div>:byEmotion.map(d=><ChartRow key={d.label} label={d.label} val={d.wr} count={d.tot} col={d.wr>=0.5?s.green:s.red}/>)}</Card>
            </div>

            <Card style={{ marginBottom: 16 }}>
              <Lbl>Daily P&L Breakdown</Lbl>
              {dailyRows.length === 0 ? <div style={{ color: s.text3, fontFamily: 'JetBrains Mono', fontSize: 11 }}>No data yet</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
                    <thead><tr>{['Date','Trades','W/L','Win Rate','P&L','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 10px',fontSize:9,letterSpacing:1.5,textTransform:'uppercase',color:s.text3,borderBottom:`1px solid ${s.border}`}}>{h}</th>)}</tr></thead>
                    <tbody>{dailyRows.map(([date,d])=>{const wr2=d.n>0?d.w/d.n:0;return(
                      <tr key={date} onMouseEnter={e=>e.currentTarget.style.background=s.bg3} onMouseLeave={e=>e.currentTarget.style.background=''}>
                        <td style={{padding:'9px 10px',borderBottom:`1px solid ${s.border}`,color:s.text2}}>{date}</td>
                        <td style={{padding:'9px 10px',borderBottom:`1px solid ${s.border}`,color:s.text2}}>{d.n}</td>
                        <td style={{padding:'9px 10px',borderBottom:`1px solid ${s.border}`,color:s.text2}}>{d.w}W / {d.n-d.w}L</td>
                        <td style={{padding:'9px 10px',borderBottom:`1px solid ${s.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:60,height:5,background:s.border,borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:pct(wr2),background:wr2>=0.5?s.green:s.red,borderRadius:3}}/></div><span style={{color:wr2>=0.5?s.green:s.red,fontSize:10}}>{pct(wr2,0)}</span></div></td>
                        <td style={{padding:'9px 10px',borderBottom:`1px solid ${s.border}`,color:d.pnl>=0?s.green:s.red,fontWeight:700}}>{fmt$(d.pnl,true)}</td>
                        <td style={{padding:'9px 10px',borderBottom:`1px solid ${s.border}`}}><Badge type={d.pnl>=0?'win':'loss'}>{d.pnl>=0?'GREEN':'RED'}</Badge></td>
                      </tr>
                    )})}</tbody>
                  </table>
                </div>
              )}
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card accent={s.green}><Lbl>Best Trades</Lbl>{trades.filter(t=>t.pnl!==''&&t.pnl!==null).sort((a,b)=>Number(b.pnl)-Number(a.pnl)).slice(0,5).map(t=><div key={t.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${s.border}`,fontFamily:'JetBrains Mono',fontSize:11}}><span style={{color:s.text2}}>{t.setup||'Trade'} <span style={{color:s.text3,fontSize:9}}>{t.date}</span></span><span style={{color:s.green}}>+${Number(t.pnl).toFixed(2)}</span></div>)}</Card>
              <Card accent={s.red}><Lbl>Worst Trades</Lbl>{trades.filter(t=>t.pnl!==''&&t.pnl!==null).sort((a,b)=>Number(a.pnl)-Number(b.pnl)).slice(0,5).map(t=><div key={t.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${s.border}`,fontFamily:'JetBrains Mono',fontSize:11}}><span style={{color:s.text2}}>{t.setup||'Trade'} <span style={{color:s.text3,fontSize:9}}>{t.date}</span></span><span style={{color:s.red}}>${Number(t.pnl).toFixed(2)}</span></div>)}</Card>
            </div>
          </div>
        )}

        {/* ══ PRE-MARKET ══ */}
        {tab === 'Pre-Market' && (
          <div className="fade-in">
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 3, color: s.green, marginBottom: 20 }}>Pre-Market Routine</div>
            {[['8:00am — News & Context', CL_NEWS, 'news'], ['8:30am — Chart Setup', CL_CHART, 'chart'], ['9:15am — Mental Prep', CL_MENTAL, 'mental']].map(([lbl, items, group]) => (
              <Card key={group} style={{ marginBottom: 14 }}>
                <Lbl>{lbl}</Lbl>
                <CL items={items} group={group} toggle={pmToggle} checked={pmChk} />
              </Card>
            ))}
            <Card style={{ marginBottom: 14 }}>
              <Lbl>Today's Game Plan</Lbl>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Lbl>Bias</Lbl><Sel value={todayGP.bias||''} onChange={e=>saveGameplan(today,'bias',e.target.value)}><option value="">Select...</option><option>Bullish</option><option>Bearish</option><option>Neutral</option></Sel></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Lbl>Account ($)</Lbl><Inp type="number" value={todayGP.account||''} onChange={e=>saveGameplan(today,'account',e.target.value)} placeholder="25000"/></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Lbl>Max Daily Loss ($)</Lbl><Inp type="number" value={todayGP.maxloss||''} onChange={e=>saveGameplan(today,'maxloss',e.target.value)} placeholder="500"/></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Lbl>Key Level</Lbl><Inp value={todayGP.level||''} onChange={e=>saveGameplan(today,'level',e.target.value)} placeholder="PDH at 483.50"/></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}><Lbl>Setups Looking For</Lbl><Inp value={todayGP.setups||''} onChange={e=>saveGameplan(today,'setups',e.target.value)} placeholder="EMA dip buy on trend day..."/></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Lbl>Mental State</Lbl><textarea value={todayGP.notes||''} onChange={e=>saveGameplan(today,'notes',e.target.value)} placeholder="How are you feeling?" style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:3,color:s.text,fontFamily:'JetBrains Mono',fontSize:12,padding:'8px 11px',outline:'none',resize:'vertical',minHeight:56}}/></div>
            </Card>
            <Card>
              <Lbl>Day Classification (by 10:00am)</Lbl>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: s.text3, marginBottom: 14 }}>Observe first 30 minutes. Do NOT trade. Then classify.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[{type:'trend',icon:'📈',name:'TREND',desc:'EMA dip buys / sell rips'},{type:'chop',icon:'↔️',name:'CHOP',desc:'Fade extremes, small size'},{type:'reversal',icon:'🔄',name:'REVERSAL',desc:'Wait, then trade reversal dir.'}].map(d => {
                  const sel = curDT === d.type; const col = d.type==='trend'?s.green:d.type==='chop'?s.yellow:s.red
                  return <div key={d.type} onClick={() => saveDayType(today, d.type)} style={{padding:14,borderRadius:3,border:`1.5px solid ${sel?col:s.border}`,background:sel?`${col}0d`:s.bg3,cursor:'pointer',textAlign:'center',transition:'all .2s'}}>
                    <div style={{fontSize:20,marginBottom:4}}>{d.icon}</div>
                    <div style={{fontFamily:'Bebas Neue',fontSize:16,letterSpacing:2,color:sel?col:s.text2}}>{d.name}</div>
                    <div style={{fontFamily:'JetBrains Mono',fontSize:9,color:s.text3,marginTop:3}}>{d.desc}</div>
                  </div>
                })}
              </div>
              {curDT && (
                <div style={{padding:14,border:`1px solid ${curDT==='trend'?s.green:curDT==='chop'?s.yellow:s.red}33`,borderRadius:3,background:curDT==='trend'?'rgba(0,229,160,0.04)':curDT==='chop'?'rgba(255,200,64,0.04)':'rgba(255,61,90,0.04)'}}>
                  {curDT==='trend'&&<><div style={{color:s.green,fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,marginBottom:8}}>✓ TREND DAY — EMA/VWAP Dip Buy</div>{['Only trade in the trend direction','Wait for dips to 9 EMA, 20 EMA, or VWAP with rejection candle','Hold longer than feels comfortable','Best windows: 10:00–11:30am and 2:00–3:30pm'].map(t=><div key={t} style={{fontFamily:'JetBrains Mono',fontSize:11,color:s.text2,padding:'4px 0'}}>▸ {t}</div>)}</>}
                  {curDT==='chop'&&<><div style={{color:s.yellow,fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,marginBottom:8}}>⚠ CHOP DAY — Reduce Size or Sit Out</div>{['Cut position size 50% minimum','Fade extremes only — no trend trades','Take profits quickly','Seriously consider sitting out entirely'].map(t=><div key={t} style={{fontFamily:'JetBrains Mono',fontSize:11,color:s.text2,padding:'4px 0'}}>▸ {t}</div>)}</>}
                  {curDT==='reversal'&&<><div style={{color:s.red,fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,marginBottom:8}}>↩ REVERSAL DAY — Wait for Confirmation</div>{['Do NOT commit to the opening direction','Wait for VWAP reclaim/loss cleanly confirmed','Gap fill setup likely in play','Patience is the entire edge on this day type'].map(t=><div key={t} style={{fontFamily:'JetBrains Mono',fontSize:11,color:s.text2,padding:'4px 0'}}>▸ {t}</div>)}</>}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ══ CHECKLIST ══ */}
        {tab === 'Checklist' && (
          <div className="fade-in">
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 3, color: s.green, marginBottom: 4 }}>Pre-Trade Checklist</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: s.text3, marginBottom: 16 }}>Run before EVERY potential trade — no exceptions</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 3, background: s.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pct(Math.min(tcPct, 1)), background: s.green, borderRadius: 2, transition: 'width .3s', boxShadow: '0 0 6px rgba(0,229,160,0.4)' }} />
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: s.text2, minWidth: 55 }}>{tcChecked} / {tcAll.length}</div>
              <Btn variant="ghost" onClick={() => resetChecklist(today)} style={{ padding: '6px 12px', fontSize: 9 }}>Reset</Btn>
            </div>
            {[['Setup Conditions', CL_SETUP, 'setup'], ['Risk Management', CL_RISK, 'risk'], ['Mental Check', CL_MENTAL_TC, 'mental']].map(([lbl, items, group]) => (
              <Card key={group} style={{ marginBottom: 12 }}>
                <Lbl>{lbl}</Lbl>
                <CL items={items} group={group} toggle={tcToggle} checked={tcChkFn} />
              </Card>
            ))}
          </div>
        )}

        {/* ══ SETUPS ══ */}
        {tab === 'Setups' && (
          <div className="fade-in">
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 3, color: s.green, marginBottom: 20 }}>Setups Reference</div>
            {SETUP_REF.map((su, i) => (
              <div key={i} style={{ background: s.bg2, border: `1px solid ${s.border}`, borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                <div onClick={() => setOpenSetup(openSetup === i ? null : i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: openSetup === i ? s.bg3 : 'transparent' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, letterSpacing: 2, color: s.green }}>{su.title}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: s.green, background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', padding: '2px 8px', borderRadius: 2 }}>{su.wr}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: s.text3, transform: openSetup === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>▼</span>
                  </div>
                </div>
                {openSetup === i && (
                  <div style={{ padding: '14px 20px', borderTop: `1px solid ${s.border}` }}>
                    {su.rows.map(([l, v]) => (
                      <div key={l} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, padding: '9px 0', borderBottom: `1px solid ${s.border}`, fontSize: 12 }}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: s.text3, paddingTop: 2 }}>{l}</div>
                        <div style={{ color: s.text2, lineHeight: 1.6 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══ RISK CALC ══ */}
        {tab === 'Risk Calc' && (
          <div className="fade-in">
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 3, color: s.green, marginBottom: 20 }}>Risk Calculator</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Card accent={s.green}>
                <Lbl>Inputs</Lbl>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Lbl>Account ($)</Lbl><Inp type="number" value={rc.account} onChange={e=>setRc(r=>({...r,account:e.target.value}))} placeholder="25000"/></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Lbl>Risk %</Lbl><Inp type="number" value={rc.pct} onChange={e=>setRc(r=>({...r,pct:e.target.value}))} placeholder="1" step="0.1"/></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Lbl>Entry Price</Lbl><Inp type="number" value={rc.entry} onChange={e=>setRc(r=>({...r,entry:e.target.value}))} placeholder="480.00" step="0.01"/></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Lbl>Stop Price</Lbl><Inp type="number" value={rc.stop} onChange={e=>setRc(r=>({...r,stop:e.target.value}))} placeholder="479.50" step="0.01"/></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {['t1','t2','t3'].map((k,i) => <div key={k} style={{display:'flex',flexDirection:'column',gap:4}}><Lbl>Target {i+1}</Lbl><Inp type="number" value={rc[k]} onChange={e=>setRc(r=>({...r,[k]:e.target.value}))} step="0.01"/></div>)}
                </div>
              </Card>
              <Card>
                <Lbl>Position Sizing Results</Lbl>
                {(() => {
                  const r = rcRes()
                  if (!r) return <div style={{ color: s.text3, fontFamily: 'JetBrains Mono', fontSize: 11 }}>Fill in the inputs to calculate</div>
                  return (
                    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 3, padding: 14 }}>
                      {[['Max Risk ($)', `$${r.risk.toFixed(2)}`], ['Stop Distance', `$${r.dist.toFixed(2)} per share`], ['Shares to Trade', `${r.shares} shares`], ['Total Position', `$${r.pos.toLocaleString()}`]].map(([l,v]) => <RRow key={l} label={l} val={v}/>)}
                      {r.t1 && <RRow label="T1 Profit" val={`+$${r.t1.p.toFixed(2)} (${r.t1.rr}:1 R)`} col={s.green}/>}
                      {r.t2 && <RRow label="T2 Profit" val={`+$${r.t2.p.toFixed(2)} (${r.t2.rr}:1 R)`} col={s.green}/>}
                      {r.t3 && <RRow label="T3 Profit" val={`+$${r.t3.p.toFixed(2)} (${r.t3.rr}:1 R)`} col={s.green}/>}
                      <RRow label="2% Daily Max Loss" val={`$${r.dailyMax.toFixed(2)} (${Math.floor(r.dailyMax/r.risk)} max losses)`} col={s.yellow}/>
                    </div>
                  )
                })()}
              </Card>
            </div>
          </div>
        )}

      </div>

      {modal && <TradeModal trade={modal} onSave={handleSaveTrade} onClose={() => setModal(null)} saving={saving} />}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: s.bg2, border: `1px solid ${s.green}`, borderRadius: 3, padding: '10px 18px', fontFamily: 'JetBrains Mono', fontSize: 11, color: s.green, zIndex: 9999, letterSpacing: 1 }} className="fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
