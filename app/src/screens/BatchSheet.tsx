import { useEffect, useState } from 'react'
import { useApp } from '../app'
import { fmt, ymLabel } from '../lib/format'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import { Sheet, Button, toast, cx } from '../ui/kit'

/** Revisão do início do mês: recorrentes + parcelas, pré-marcados. Lançar é idempotente. */
export function BatchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ym } = useApp()
  const recs = L.pendingRecs(ym), insts = L.pendingInsts(ym), cats = R.getCats()
  const [sel, setSel] = useState<Record<string, boolean>>({})
  useEffect(() => { if (open) setSel(Object.fromEntries([...recs.map(r => ['r:' + r.id, true]), ...insts.map(x => [`i:${x.inst.id}:${x.n}`, !x.lookalike])])) }, [open, ym]) // eslint-disable-line
  const keys = Object.entries(sel).filter(([, v]) => v).map(([k]) => k)
  const go = () => { const n = L.launchBatch(ym, keys); toast(`${n} lançamento(s) registrado(s)`); onClose() }
  const Item = ({ k, emoji, title, sub, v, type, warn }: { k: string; emoji: string; title: string; sub: string; v: number; type: string; warn?: string }) =>
    <button onClick={() => setSel(s => ({ ...s, [k]: !s[k] }))} className={cx('mb-2 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition', sel[k] ? 'border-ok/40 bg-ok/5' : 'border-line bg-s2')}>
      <span className={cx('grid size-5 shrink-0 place-items-center rounded-md border text-[11px]', sel[k] ? 'border-ok bg-ok text-bg' : 'border-line2')}>{sel[k] && '✓'}</span>
      <span className="text-lg">{emoji}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{title}</b><small className="text-tx3">{sub}</small>{warn && <small className="block text-warn">{warn}</small>}</span>
      <span className={cx('num text-sm font-semibold', type === 'income' ? 'text-ok' : 'text-bad')}>{type === 'income' ? '+' : '−'}{fmt(v)}</span></button>
  return <Sheet open={open} onClose={onClose} title="Início do mês" footer={<><Button className="flex-1" onClick={onClose}>Agora não</Button><Button className="flex-[2]" variant="primary" disabled={!keys.length} onClick={go}>Lançar {keys.length}</Button></>}>
    <p className="mb-3 text-sm text-tx2">{ymLabel(ym)}</p>
    {!recs.length && !insts.length && <p className="py-6 text-center text-sm text-tx3">Nada pendente neste mês ✅</p>}
    {recs.length > 0 && <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tx3">🔁 Recorrentes</div>}
    {recs.map(r => { const c = cats.find(x => x.id === r.cat); return <Item key={r.id} k={'r:' + r.id} emoji={c?.emoji || '📦'} title={r.desc} sub={`${L.FREQ_LBL[r.freq]}${r.day ? ' • dia ' + r.day : ''} • ${c?.name || '—'}`} v={r.value} type={r.type} /> })}
    {insts.length > 0 && <div className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wider text-tx3">💳 Parcelas</div>}
    {insts.map(({ inst: i, n, lookalike }) => { const c = cats.find(x => x.id === i.cat); return <Item key={i.id + n} k={`i:${i.id}:${n}`} emoji={c?.emoji || '💳'} title={`${i.desc} (${n}/${i.total})`} sub={`Parcela ${n} de ${i.total} • ${c?.name || '—'}`} v={i.value} type="expense"
      warn={lookalike ? 'Parece que já foi lançada à mão — confira antes de marcar' : i.legacy && n === L.instMeta(i).firstNum + 1 ? 'Parcelamento antigo: confira se esta parcela ainda não foi lançada' : undefined} /> })}
  </Sheet>
}
