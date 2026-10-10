import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useApp } from '../app'
import { fmt, sum, ymAdd, ymLabel } from '../lib/format'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import { Card, Title, Stat, Button, Sheet, Field, Input, Toggle, Progress, Note, toast } from '../ui/kit'

export function Planejamento() {
  const { ym } = useApp()
  const cats = L.expenseCats(), st = R.getSettings(), own = !!R.getPlanM()[ym]
  const [edit, setEdit] = useState(false), [vals, setVals] = useState<Record<string, string>>({})
  const totBud = sum(cats, c => L.availOf(c, ym)), totSpent = sum(L.monthTxs(ym).filter(t => t.type === 'expense'), t => t.value), diff = totBud - totSpent
  const open = () => { setVals(Object.fromEntries(cats.map(c => [c.id, String(L.budgetOf(c, ym) || '')]))); setEdit(true) }
  const save = () => { const pm = R.getPlanM(); pm[ym] = Object.fromEntries(cats.map(c => [c.id, parseFloat(vals[c.id]) || 0])); R.savePlanM(pm); setEdit(false); toast(`Orçamento de ${ymLabel(ym)} salvo`) }
  const roll = (on: boolean) => { R.saveSettings({ ...st, rollover: on, rolloverFrom: st.rolloverFrom || ym }); toast(on ? 'Sobras passam a acumular' : 'Acúmulo desligado') }
  const copyPrev = () => { const pm = R.getPlanM(); pm[ym] = { ...L.planFor(ymAdd(ym, -1)) }; R.savePlanM(pm); toast('Copiado do mês anterior') }
  return <div>
    <div className="grid grid-cols-3 gap-2"><Stat label="Orçado" value={fmt(totBud)} /><Stat label="Gasto" value={fmt(totSpent)} tone="bad" /><Stat label={diff >= 0 ? 'Livre' : 'Acima'} value={fmt(Math.abs(diff))} tone={diff >= 0 ? 'ok' : 'bad'} /></div>
    <Card className="mt-3"><div className="flex items-center justify-between gap-3"><div className="text-sm"><b className="capitalize">{ymLabel(ym)}</b><div className="text-xs text-tx3">{own ? 'Orçamento próprio deste mês' : 'Herdado do mês anterior'}</div></div><Button size="sm" variant="primary" onClick={open}><Pencil size={13} /> Editar</Button></div>
      <div className="mt-2 border-t border-line pt-2"><Toggle checked={!!st.rollover} onChange={roll} label="Acumular sobras (o que sobra de um mês soma no próximo)" /></div></Card>
    <Title>Por categoria</Title>
    <div className="flex flex-col gap-2">{cats.map(c => {
      const bud = L.budgetOf(c, ym), carry = L.carryOf(c, ym), av = bud + carry, sp = L.spentOf(c.id, ym), over = av > 0 && sp > av, warn = av > 0 && sp / av >= .8
      if (!av && !sp) return null
      return <Card key={c.id} className="!p-3.5"><div className="mb-2 flex items-center justify-between text-sm"><span>{c.emoji} {c.name}</span><span className="num"><b className={over ? 'text-bad' : ''}>{fmt(sp)}</b><span className="text-tx3"> / {fmt(av)}</span></span></div>
        <Progress value={sp} max={av || 1} color={over ? 'var(--color-bad)' : warn ? 'var(--color-warn)' : 'var(--color-ok)'} />
        <div className="num mt-1.5 flex justify-between text-[11px] text-tx3"><span>{carry ? `${carry > 0 ? '+' : ''}${fmt(carry)} do mês anterior` : bud ? `orçamento ${fmt(bud)}` : 'sem orçamento'}</span><span className={over ? 'text-bad' : ''}>{av ? (over ? `passou ${fmt(sp - av)}` : `livre ${fmt(av - sp)}`) : ''}</span></div></Card>
    })}</div>
    {cats.every(c => !L.availOf(c, ym) && !L.spentOf(c.id, ym)) && <Note>Defina quanto planejam gastar por categoria em “Editar”.</Note>}
    <Sheet open={edit} onClose={() => setEdit(false)} title={`Orçamento · ${ymLabel(ym)}`} footer={<><Button className="flex-1" onClick={copyPrev}>Copiar anterior</Button><Button className="flex-1" variant="primary" onClick={save}>Salvar</Button></>}>
      <Note>Vale para este mês. Meses seguintes sem orçamento próprio herdam estes valores; meses passados não mudam.</Note>
      <div className="mt-3 grid grid-cols-2 gap-x-2.5">{cats.map(c => <Field key={c.id} label={`${c.emoji} ${c.name}`}><Input type="number" inputMode="decimal" placeholder="0" value={vals[c.id] || ''} onChange={e => setVals({ ...vals, [c.id]: e.target.value })} /></Field>)}</div>
    </Sheet>
  </div>
}
