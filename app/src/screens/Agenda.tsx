import { Trash2, Play } from 'lucide-react'
import { useApp } from '../app'
import { fmt, fmtDate, sum, todayStr, todayYM, ymAdd, ymLabel, ymOf } from '../lib/format'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import { Card, Title, Stat, Button, Empty, Progress, Note, toast, cx } from '../ui/kit'

export function Recorrentes() {
  const { ym, openBatch } = useApp()
  const recs = R.getRecurrents(), cats = R.getCats(), txs = L.monthTxs(ym), pc = L.pendingCount(ym)
  const del = (id: string) => confirm('Excluir o modelo recorrente? Lançamentos já feitos continuam.') && R.saveRecurrents(R.getRecurrents().filter(r => r.id !== id))
  return <div>
    <div className="grid grid-cols-2 gap-2.5"><Stat label="Receitas fixas" value={fmt(sum(recs.filter(r => r.type === 'income'), r => r.value))} tone="ok" /><Stat label="Despesas fixas" value={fmt(sum(recs.filter(r => r.type === 'expense'), r => r.value))} tone="bad" /></div>
    {pc > 0 && <Button variant="primary" className="mt-3 w-full" onClick={openBatch}>Revisar {pc} pendente(s) de {ymLabel(ym)}</Button>}
    <Title>Modelos</Title>
    {!recs.length ? <Empty>Nenhum recorrente. Ao lançar, ative “Repete todo mês”.</Empty> : <Card className="!py-0">{recs.map(r => {
      const c = cats.find(x => x.id === r.cat), done = txs.some(t => t.recurringId === r.id)
      return <div key={r.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
        <span className="grid size-10 place-items-center rounded-xl bg-s2 text-lg">{c?.emoji || '📦'}</span>
        <span className="min-w-0 flex-1"><b className="block truncate text-sm">{r.desc}</b><small className="text-[11px] text-tx3">{L.FREQ_LBL[r.freq]}{r.day ? ` · dia ${r.day}` : ''} · <span className={done ? 'text-ok' : 'text-warn'}>{done ? 'lançado' : 'pendente'}</span></small></span>
        <span className={cx('num text-sm font-semibold', r.type === 'income' ? 'text-ok' : '')}>{fmt(r.value)}</span>
        {!done && <button aria-label="Lançar" onClick={() => { L.launchBatch(ym, ['r:' + r.id]); toast('Lançado') }} className="p-1 text-ok"><Play size={15} /></button>}
        <button aria-label="Excluir" onClick={() => del(r.id)} className="p-1 text-tx3"><Trash2 size={15} /></button></div>
    })}</Card>}
  </div>
}

export function Parcelamentos() {
  const insts = R.getInstallments(), cats = R.getCats(), cards = R.getCards(), metas = insts.map(i => ({ i, m: L.instMeta(i) })), active = metas.filter(x => x.m.left > 0)
  const del = (id: string) => confirm('Excluir o parcelamento? Parcelas já lançadas continuam no histórico; só param de ser geradas.') && R.saveInstallments(R.getInstallments().filter(i => i.id !== id))
  return <div>
    <div className="grid grid-cols-2 gap-2.5"><Stat label="Por mês" value={fmt(sum(active, x => x.i.value))} tone="bad" sub={`${active.length} ativo(s)`} /><Stat label="Ainda a pagar" value={fmt(sum(active, x => x.i.value * x.m.left))} tone="warn" sub="parcelas restantes" /></div>
    <Title>Compras parceladas</Title>
    {!insts.length ? <Empty>Ao lançar uma despesa, ative “Compra parcelada”.</Empty> : <div className="flex flex-col gap-2.5">{metas.map(({ i, m }) => {
      const c = cats.find(x => x.id === i.cat), card = cards.find(x => x.id === i.cardId), next = m.left ? ymAdd(m.startYM, m.paid - m.firstNum + 1) : null
      return <Card key={i.id}><div className="flex items-start gap-3"><span className="text-xl">{c?.emoji || '💳'}</span><div className="min-w-0 flex-1"><b className="block truncate">{i.desc}</b><small className="text-[11px] text-tx3">{c?.name}{card ? ` · ${card.name}` : ''} · {m.left ? <span className="text-warn">{m.left} restantes · próxima em {ymLabel(next!)}</span> : <span className="text-ok">quitado ✅</span>}</small></div>
        <div className="text-right"><b className="num block text-sm">{fmt(i.value)}<small className="text-tx3">/mês</small></b><small className="num text-[11px] text-tx3">total {fmt(i.value * i.total)}</small></div></div>
        <div className="mt-3 flex items-center gap-3"><div className="flex-1"><Progress value={m.paid} max={i.total} color="var(--color-info)" /></div><span className="num text-xs text-tx2">{m.paid}/{i.total}</span><button onClick={() => del(i.id)} className="text-tx3"><Trash2 size={15} /></button></div></Card>
    })}</div>}
  </div>
}

export function Vencimentos() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const items: { desc: string; value: number; due: string; days: number; type: string }[] = []
  const days = (d: string) => Math.ceil((new Date(d + 'T00:00').getTime() - today.getTime()) / 864e5)
  R.getRecurrents().forEach(r => { if (!r.day) return; [0, 1].forEach(o => { const k = ymAdd(todayYM(), o), d = `${k}-${String(Math.min(r.day!, 28)).padStart(2, '0')}`, n = days(d); if (n >= 0 && n <= 30 && !(r.endDate && ymOf(r.endDate) < k)) items.push({ desc: r.desc, value: r.value, due: d, days: n, type: r.type }) }) })
  R.getCards().filter(c => c.kind === 'credit' && !c.archived).forEach(c => [-1, 0, 1].forEach(o => { const k = ymAdd(L.invKeyOf(c, todayStr()), o), inv = L.invoiceOf(c, k), rest = inv.total - inv.paid; if (rest > .005 && days(inv.due) <= 30) items.push({ desc: `Fatura ${c.name}${inv.paid ? ' (parcial)' : ''}`, value: rest, due: inv.due, days: days(inv.due), type: 'expense' }) }))
  R.getTxs().filter(t => t.status === 'pendente').forEach(t => { const n = days(t.date); if (n <= 30) items.push({ desc: `${t.desc} (pendente)`, value: t.value, due: t.date, days: n, type: t.type }) })
  items.sort((a, b) => a.days - b.days)
  return <div>{!items.length ? <Empty>Nada vencendo nos próximos 30 dias 🎉</Empty> : <Card className="!py-0">{items.map((v, i) =>
    <div key={i} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
      <span className={cx('grid h-11 w-12 place-items-center rounded-xl text-center text-[11px] font-bold leading-tight', v.days < 0 ? 'bg-bad/15 text-bad' : v.days <= 3 ? 'bg-warn/15 text-warn' : 'bg-s2 text-tx2')}>{v.days < 0 ? `${-v.days}d\natraso` : v.days === 0 ? 'Hoje' : `${v.days}d`}</span>
      <span className="min-w-0 flex-1"><b className="block truncate text-sm">{v.desc}</b><small className="text-[11px] text-tx3">{fmtDate(v.due)}</small></span>
      <span className={cx('num text-sm font-semibold', v.type === 'income' ? 'text-ok' : 'text-bad')}>{v.type === 'income' ? '+' : '−'}{fmt(v.value)}</span></div>)}</Card>}</div>
}

export function Futuro() {
  const recs = R.getRecurrents(), insts = R.getInstallments(), cats = R.getCats()
  return <div className="flex flex-col gap-2.5">
    <Note>Projeção com recorrentes e parcelas. Faturas aparecem só como informação — as compras já entraram nos meses em que foram feitas.</Note>
    {[1, 2, 3, 4, 5, 6].map(o => {
      const k = ymAdd(todayYM(), o), items: { desc: string; value: number; type: string; day: number; emoji: string }[] = []
      recs.forEach(r => { if (!(r.endDate && ymOf(r.endDate) < k)) items.push({ desc: r.desc, value: r.value, type: r.type, day: r.day || 1, emoji: cats.find(c => c.id === r.cat)?.emoji || '📦' }) })
      insts.forEach(i => { const n = L.instNumFor(i, k); if (n > L.instMeta(i).firstNum && n <= i.total) items.push({ desc: `${i.desc} (${n}/${i.total})`, value: i.value, type: 'expense', day: i.day || 1, emoji: cats.find(c => c.id === i.cat)?.emoji || '💳' }) })
      const inc = sum(items.filter(x => x.type === 'income'), x => x.value), exp = sum(items.filter(x => x.type === 'expense'), x => x.value)
      items.sort((a, b) => a.day - b.day)
      return <Card key={k}><div className="mb-2 flex items-center justify-between"><b>{ymLabel(k)}</b><span className={cx('num font-semibold', inc - exp >= 0 ? 'text-ok' : 'text-bad')}>{fmt(inc - exp)}</span></div>
        <div className="num mb-2 flex gap-3 text-[11px]"><span className="text-ok">+{fmt(inc)}</span><span className="text-bad">−{fmt(exp)}</span></div>
        {items.length ? items.map((it, i) => <div key={i} className="flex items-center gap-2 border-t border-line py-1.5 text-[13px]"><span className="w-8 text-[11px] text-tx3">dia {it.day}</span><span>{it.emoji}</span><span className="min-w-0 flex-1 truncate">{it.desc}</span><span className={cx('num', it.type === 'income' ? 'text-ok' : 'text-tx2')}>{fmt(it.value)}</span></div>) : <small className="text-tx3">Nada projetado</small>}
      </Card>
    })}
  </div>
}
