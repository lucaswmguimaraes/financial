import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { fmt, fmtDate, sum, todayStr } from '../lib/format'
import { uid } from '../lib/storage'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import type { Pat, PatType, Goal } from '../domain/types'
import { Card, Title, Stat, Button, Sheet, Field, Input, Segmented, Progress, Empty, toast } from '../ui/kit'
import { Donut, Rank } from '../ui/charts'

const TL: Record<PatType, string> = { reserva: '🏦 Reserva', invest: '📈 Investimentos', custom: '💼 Outro' }
const TC: Record<PatType, string> = { reserva: '#fbbf24', invest: '#5eead4', custom: '#60a5fa' }

export function Patrimonio() {
  const pats = R.getPats(), hist = R.getPatHist(), accts = R.getAccts().filter(a => a.inPatrimonio && !a.archived)
  const by = (t: PatType) => sum(pats.filter(p => p.type === t), p => p.value), accTot = sum(accts, a => L.acctBalance(a).cur), total = by('reserva') + by('invest') + by('custom') + accTot
  const em = L.emergencyInfo()
  const [ed, setEd] = useState<Partial<Pat> | null>(null), [up, setUp] = useState<{ p: Pat; v: string; note: string } | null>(null)
  const save = () => {
    if (!ed?.name?.trim()) return toast('Dê um nome', 'bad')
    const all = R.getPats(), h = R.getPatHist(), value = +(ed.value || 0), now = Date.now()
    if (ed.id) { const old = all.find(p => p.id === ed.id)!; R.savePats(all.map(p => p.id === ed.id ? { ...p, ...ed, value, updatedAt: now } as Pat : p)); if (value !== old.value) h.unshift({ id: uid(), patId: ed.id, patName: ed.name, oldVal: old.value, newVal: value, note: ed.note || '', date: todayStr(), createdAt: now }) }
    else { const np: Pat = { id: uid(), name: ed.name.trim(), value, emoji: ed.emoji || '💰', type: ed.type || 'reserva', inst: ed.inst || '', note: ed.note || '', createdAt: now, updatedAt: now }; R.savePats([...all, np]); h.unshift({ id: uid(), patId: np.id, patName: np.name, oldVal: 0, newVal: value, note: 'Criação', date: todayStr(), createdAt: now }) }
    R.savePatHist(h.slice(0, 100)); setEd(null); toast('Bolsão salvo 💎')
  }
  const confirmUp = () => {
    if (!up) return; const value = parseFloat(up.v) || 0, old = up.p.value, now = Date.now()
    R.savePats(R.getPats().map(p => p.id === up.p.id ? { ...p, value, updatedAt: now } : p))
    R.savePatHist([{ id: uid(), patId: up.p.id, patName: up.p.name, oldVal: old, newVal: value, note: up.note, date: todayStr(), createdAt: now }, ...R.getPatHist()].slice(0, 100))
    toast(`${value >= old ? '↑ Aporte' : '↓ Retirada'} de ${fmt(Math.abs(value - old))}`); setUp(null)
  }
  const parts = (['reserva', 'invest', 'custom'] as PatType[]).map(t => ({ l: TL[t], v: by(t), c: TC[t] })).concat(accTot ? [{ l: '🏦 Contas marcadas', v: accTot, c: '#a78bfa' }] : []).filter(x => x.v > 0)
  return <div>
    <Stat label="Patrimônio total" value={fmt(total)} tone="pur" sub={`${pats.length} bolsão(ões)${accts.length ? ` + ${accts.length} conta(s)` : ''}`} />
    {parts.length > 0 && <Card className="mt-3"><Donut labels={parts.map(p => p.l)} data={parts.map(p => p.v)} colors={parts.map(p => p.c)} height={170} /><div className="mt-3"><Rank rows={parts} /></div></Card>}
    <Title>🛡️ Reserva de emergência</Title>
    <Card>{em.avg > 0 ? <><div className="num grid grid-cols-3 gap-2 text-center"><div><small className="text-[10px] uppercase text-tx3">Gasto médio</small><div className="font-semibold text-bad">{fmt(em.avg)}</div></div><div><small className="text-[10px] uppercase text-tx3">Meta 6 meses</small><div className="font-semibold">{fmt(em.target)}</div></div><div><small className="text-[10px] uppercase text-tx3">Cobre</small><div className="font-semibold text-pj">{em.months.toFixed(1).replace('.', ',')} meses</div></div></div>
      <div className="mt-3"><Progress value={em.tRes} max={em.target} mark={50} color={em.months >= 6 ? 'var(--color-ok)' : em.months >= 3 ? 'var(--color-warn)' : 'var(--color-bad)'} /></div>
      <p className="mt-2 text-xs text-tx3">{em.months >= 6 ? '✅ Reserva completa' : `Faltam ${fmt(em.target - em.tRes)} para 6 meses de gastos`}</p></> : <p className="text-sm text-tx3">Lance os gastos dos últimos meses para calcular a meta da reserva.</p>}</Card>
    <Title right={<Button size="sm" variant="primary" onClick={() => setEd({ type: 'reserva', emoji: '🏦' })}><Plus size={14} /> Bolsão</Button>}>Bolsões</Title>
    {!pats.length ? <Empty>Bolsões são onde o dinheiro guardado está: reserva, CDB, Tesouro, ações…</Empty> : <div className="flex flex-col gap-2">{pats.map(p => <Card key={p.id} onClick={() => setUp({ p, v: String(p.value), note: '' })} className="!p-3.5">
      <div className="flex items-center gap-3"><span className="text-xl">{p.emoji}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{p.name}</b><small className="text-[11px] text-tx3">{TL[p.type]}{p.inst ? ` · ${p.inst}` : ''} · atualizado {new Date(p.updatedAt).toLocaleDateString('pt-BR')}</small></span><b className="num" style={{ color: TC[p.type] }}>{fmt(p.value)}</b>
        <button onClick={e => { e.stopPropagation(); confirm('Excluir bolsão?') && R.savePats(R.getPats().filter(x => x.id !== p.id)) }} className="p-1 text-tx3"><Trash2 size={14} /></button></div></Card>)}</div>}
    {hist.length > 0 && <><Title>Histórico de atualizações</Title><Card className="!py-0">{hist.slice(0, 20).map(h => { const d = h.newVal - h.oldVal; return <div key={h.id} className="flex items-center gap-3 border-b border-line py-2 text-[13px] last:border-0"><span className="w-12 text-[11px] text-tx3">{fmtDate(h.date).slice(0, 5)}</span><span className="min-w-0 flex-1 truncate">{h.patName}{h.note ? ` — ${h.note}` : ''}</span><span className={`num ${d >= 0 ? 'text-ok' : 'text-bad'}`}>{d >= 0 ? '+' : ''}{fmt(d)}</span></div> })}</Card></>}
    <Sheet open={!!ed} onClose={() => setEd(null)} title={ed?.id ? 'Editar bolsão' : 'Novo bolsão'} footer={<Button variant="primary" className="flex-1" onClick={save}>Salvar</Button>}>
      {ed && <><Segmented value={ed.type || 'reserva'} onChange={t => setEd({ ...ed, type: t, emoji: { reserva: '🏦', invest: '📈', custom: '💼' }[t] })} options={[{ v: 'reserva', l: '🏦 Reserva' }, { v: 'invest', l: '📈 Invest.' }, { v: 'custom', l: '💼 Outro' }]} />
        <div className="mt-3 grid grid-cols-2 gap-2.5"><Field label="Nome"><Input value={ed.name || ''} placeholder="Nubank Reserva" onChange={e => setEd({ ...ed, name: e.target.value })} /></Field><Field label="Instituição"><Input value={ed.inst || ''} onChange={e => setEd({ ...ed, inst: e.target.value })} /></Field>
          <Field label="Valor atual"><Input type="number" inputMode="decimal" value={ed.value ?? ''} onChange={e => setEd({ ...ed, value: e.target.value as never })} /></Field><Field label="Observação"><Input value={ed.note || ''} placeholder="CDB 100% CDI" onChange={e => setEd({ ...ed, note: e.target.value })} /></Field></div></>}
    </Sheet>
    <Sheet open={!!up} onClose={() => setUp(null)} title={up ? `${up.p.emoji} ${up.p.name}` : ''} footer={<><Button className="flex-1" onClick={() => { setEd(up!.p); setUp(null) }}>Editar dados</Button><Button variant="primary" className="flex-1" onClick={confirmUp}>Atualizar</Button></>}>
      {up && <><Field label="Novo valor total"><Input type="number" inputMode="decimal" value={up.v} onChange={e => setUp({ ...up, v: e.target.value })} className="!font-display !text-2xl" /></Field><Field label="Observação"><Input value={up.note} placeholder="aporte, rendimento do mês…" onChange={e => setUp({ ...up, note: e.target.value })} /></Field></>}
    </Sheet>
  </div>
}

export function Metas() {
  const goals = R.getGoals()
  const [ed, setEd] = useState<Partial<Goal> | null>(null), [up, setUp] = useState<{ g: Goal; v: string } | null>(null)
  const save = () => { if (!ed?.name?.trim() || !ed.target) return toast('Preencha nome e valor alvo', 'bad'); R.saveGoals([...R.getGoals(), { id: uid(), name: ed.name.trim(), target: +ed.target, current: +(ed.current || 0), emoji: ed.emoji || '🎯', deadline: ed.deadline || '', createdAt: Date.now() }]); setEd(null); toast('Meta criada 🎯') }
  return <div>
    <Button variant="primary" className="w-full" onClick={() => setEd({ emoji: '🎯' })}><Plus size={16} /> Nova meta</Button>
    <div className="mt-3 flex flex-col gap-2.5">{!goals.length ? <Empty>Viagem, reserva, carro… crie uma meta e atualize o valor guardado.</Empty> : goals.map(g => {
      const p = g.target > 0 ? Math.min(g.current / g.target * 100, 100) : 0, dl = g.deadline ? Math.ceil((new Date(g.deadline + 'T12:00').getTime() - Date.now()) / 864e5) : null
      const perMonth = dl && dl > 0 ? (g.target - g.current) / Math.max(1, dl / 30) : 0
      return <Card key={g.id} onClick={() => setUp({ g, v: String(g.current) })}><div className="flex items-start gap-3"><span className="text-2xl">{g.emoji}</span><div className="flex-1"><b>{g.name}</b><div className="text-[11px] text-tx3">{dl !== null ? (dl > 0 ? `${dl} dias` : 'prazo encerrado') : 'sem prazo'}{perMonth > 0 ? ` · guardar ${fmt(perMonth)}/mês` : ''}</div></div><button onClick={e => { e.stopPropagation(); confirm('Excluir meta?') && R.saveGoals(R.getGoals().filter(x => x.id !== g.id)) }} className="text-tx3"><Trash2 size={15} /></button></div>
        <div className="num my-2 flex items-baseline gap-1.5"><b className="font-display text-xl text-ok">{fmt(g.current)}</b><span className="text-xs text-tx3">de {fmt(g.target)}</span><span className="ml-auto text-xs text-tx2">{p.toFixed(0)}%{p >= 100 ? ' 🎉' : ''}</span></div><Progress value={p} /></Card>
    })}</div>
    <Sheet open={!!ed} onClose={() => setEd(null)} title="Nova meta" footer={<Button variant="primary" className="flex-1" onClick={save}>Criar</Button>}>
      {ed && <div className="grid grid-cols-[72px_1fr] gap-2.5"><Field label="Emoji"><Input value={ed.emoji || ''} maxLength={2} className="text-center" onChange={e => setEd({ ...ed, emoji: e.target.value })} /></Field><Field label="Nome"><Input value={ed.name || ''} placeholder="Viagem" onChange={e => setEd({ ...ed, name: e.target.value })} /></Field>
        <Field label="Alvo" className="col-span-2"><Input type="number" inputMode="decimal" value={ed.target || ''} onChange={e => setEd({ ...ed, target: e.target.value as never })} /></Field>
        <Field label="Já tenho" className="col-span-2"><Input type="number" inputMode="decimal" value={ed.current || ''} onChange={e => setEd({ ...ed, current: e.target.value as never })} /></Field>
        <Field label="Prazo" className="col-span-2"><Input type="date" value={ed.deadline || ''} onChange={e => setEd({ ...ed, deadline: e.target.value })} /></Field></div>}
    </Sheet>
    <Sheet open={!!up} onClose={() => setUp(null)} title={up ? `${up.g.emoji} ${up.g.name}` : ''} footer={<Button variant="primary" className="flex-1" onClick={() => { R.saveGoals(R.getGoals().map(g => g.id === up!.g.id ? { ...g, current: parseFloat(up!.v) || 0 } : g)); setUp(null); toast('Meta atualizada') }}>Atualizar</Button>}>
      {up && <Field label="Valor guardado até agora"><Input type="number" inputMode="decimal" value={up.v} onChange={e => setUp({ ...up, v: e.target.value })} className="!font-display !text-2xl" /></Field>}
    </Sheet>
  </div>
}
