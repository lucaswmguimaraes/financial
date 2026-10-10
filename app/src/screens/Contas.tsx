import { useState } from 'react'
import { ArrowLeftRight, Plus, FileText, Scale, Pencil, Archive, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useApp } from '../app'
import { fmt, fmtDate, sum, todayStr, ymAdd, ymLabel, ymOf } from '../lib/format'
import { uid } from '../lib/storage'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import type { Account, Card as CardT, AcctType } from '../domain/types'
import { Card, Title, Button, Stat, Sheet, Field, Input, Select, Toggle, Note, Progress, Empty, toast, cx } from '../ui/kit'
import { Rank } from '../ui/charts'

const ST: Record<L.InvStatus, string> = { aberta: '🟢 Aberta', fechada: '🟡 Fechada', paga: '✅ Paga', parcial: '🟠 Parcial', vencida: '🔴 Vencida' }

export function Contas() {
  const { ym } = useApp()
  const accts = R.getAccts(), cards = R.getCards(), act = accts.filter(a => !a.archived)
  const bals = act.map(a => ({ a, b: L.acctBalance(a, ym) }))
  const [acctSheet, setAcctSheet] = useState<{ open: boolean; id?: string }>({ open: false })
  const [cardSheet, setCardSheet] = useState<{ open: boolean; id?: string }>({ open: false })
  const [fat, setFat] = useState<{ cardId: string; k: string } | null>(null)
  const [ext, setExt] = useState<string | null>(null), [concil, setConcil] = useState<string | null>(null), [tr, setTr] = useState(false)
  const archive = (kind: 'a' | 'c', id: string, on: boolean) => {
    if (on && !confirm('Arquivar? O histórico continua; só some das opções.')) return
    if (kind === 'a') R.saveAccts(R.getAccts().map(x => x.id === id ? { ...x, archived: on } : x)); else R.saveCards(R.getCards().map(x => x.id === id ? { ...x, archived: on } : x))
  }
  return <div>
    <div className="grid grid-cols-2 gap-2.5">
      <Stat label="Saldo atual" value={fmt(sum(bals, x => x.b.cur))} tone={sum(bals, x => x.b.cur) >= 0 ? 'ok' : 'bad'} sub="pago até hoje" />
      <Stat label="Previsto" value={fmt(sum(bals, x => x.b.prev))} tone="info" sub="com pendentes e agendados" />
    </div>
    <Title right={<div className="flex gap-1.5"><Button size="sm" onClick={() => act.length < 2 ? toast('Cadastre ao menos 2 contas', 'bad') : setTr(true)}><ArrowLeftRight size={13} /> Transferir</Button><Button size="sm" variant="primary" onClick={() => setAcctSheet({ open: true })}><Plus size={14} /> Conta</Button></div>}>🏦 Contas</Title>
    {!act.length ? <Empty>Cadastre suas contas com o saldo de hoje. Lançamentos antigos ficam como “Conta não informada”.</Empty> :
      <div className="flex flex-col gap-2.5">{bals.map(({ a, b }) => <Card key={a.id}>
        <div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{L.acctName(a)}</div><div className="text-[11px] text-tx3">{a.bank} • {L.ACCT_TYPES[a.type]}{a.inPatrimonio ? ' • 💎 patrimônio' : ''}</div></div><div className={cx('num font-display text-xl font-semibold', b.cur >= 0 ? 'text-ok' : 'text-bad')}>{fmt(b.cur)}</div></div>
        <div className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tx2"><span>Entradas <b className="text-ok">{fmt(b.inM)}</b></span><span>Saídas <b className="text-bad">{fmt(b.outM)}</b></span><span>Previsto <b>{fmt(b.prev)}</b></span></div>
        <div className="mt-3 flex gap-1.5"><Button size="sm" onClick={() => setExt(a.id)}><FileText size={13} /> Extrato</Button><Button size="sm" onClick={() => setConcil(a.id)}><Scale size={13} /> Conciliar</Button><Button size="sm" onClick={() => setAcctSheet({ open: true, id: a.id })}><Pencil size={13} /></Button><Button size="sm" onClick={() => archive('a', a.id, true)}><Archive size={13} /></Button></div>
      </Card>)}</div>}
    <Title right={<Button size="sm" variant="primary" onClick={() => setCardSheet({ open: true })}><Plus size={14} /> Cartão</Button>}>💳 Cartões</Title>
    {!cards.filter(c => !c.archived).length ? <Empty>Cadastre cada cartão separado, mesmo que sejam do mesmo banco.</Empty> :
      <div className="flex flex-col gap-2.5">{cards.filter(c => !c.archived).map(c => {
        if (c.kind !== 'credit') return <Card key={c.id}><div className="flex items-center justify-between"><div><div className="font-semibold">{c.name}</div><div className="text-[11px] text-tx3">Débito • {L.acctName(R.getAccts().find(a => a.id === c.acctId))}</div></div><Button size="sm" onClick={() => setCardSheet({ open: true, id: c.id })}><Pencil size={13} /></Button></div></Card>
        const curK = L.invKeyOf(c, todayStr()), inv = L.invoiceOf(c, curK), prev = L.invoiceOf(c, ymAdd(curK, -1)), lim = L.cardLimitUse(c), prevOpen = prev.total - prev.paid > 0.005
        return <Card key={c.id}>
          <div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{c.name}</div><div className="text-[11px] text-tx3">{c.bank} • fecha dia {c.closeDay} • vence dia {c.dueDay}</div></div><div className="text-right"><div className="num font-display text-xl font-semibold">{fmt(inv.total)}</div><div className="text-[11px] capitalize text-tx3">{ST[inv.status]} • {ymLabel(curK)}</div></div></div>
          {prevOpen && <div className="mt-2"><Note tone="warn">Fatura anterior: {fmt(prev.total - prev.paid)} a pagar (vence {fmtDate(prev.due)})</Note></div>}
          {lim.limit > 0 && <div className="mt-3"><div className="num mb-1 flex justify-between text-[11px] text-tx2"><span>Usado {fmt(lim.used)}</span><span>Disponível <b className={lim.avail < 0 ? 'text-bad' : 'text-ok'}>{fmt(lim.avail)}</b></span></div><Progress value={lim.used} max={lim.limit} color={lim.used / lim.limit > .8 ? 'var(--color-warn)' : 'var(--color-info)'} /></div>}
          <div className="mt-3 flex gap-1.5"><Button size="sm" onClick={() => setFat({ cardId: c.id, k: curK })}><FileText size={13} /> Faturas</Button><Button size="sm" variant="primary" onClick={() => setFat({ cardId: c.id, k: prevOpen ? ymAdd(curK, -1) : curK })}>Pagar</Button><Button size="sm" onClick={() => setCardSheet({ open: true, id: c.id })}><Pencil size={13} /></Button><Button size="sm" onClick={() => archive('c', c.id, true)}><Archive size={13} /></Button></div>
        </Card>
      })}</div>}
    <PayAnalysis ym={ym} />
    {(accts.some(a => a.archived) || cards.some(c => c.archived)) && <><Title>🗄️ Arquivados</Title><div className="flex flex-wrap gap-2">
      {accts.filter(a => a.archived).map(a => <button key={a.id} onClick={() => archive('a', a.id, false)} className="rounded-full border border-line px-3 py-1 text-xs text-tx2">{L.acctName(a)} · reativar</button>)}
      {cards.filter(c => c.archived).map(c => <button key={c.id} onClick={() => archive('c', c.id, false)} className="rounded-full border border-line px-3 py-1 text-xs text-tx2">{c.name} · reativar</button>)}</div></>}
    <AcctSheet {...acctSheet} onClose={() => setAcctSheet({ open: false })} />
    <CardSheet {...cardSheet} onClose={() => setCardSheet({ open: false })} />
    {fat && <FaturaSheet {...fat} setK={k => setFat({ ...fat, k })} onClose={() => setFat(null)} />}
    {ext && <ExtratoSheet id={ext} onClose={() => setExt(null)} />}
    {concil && <ConcilSheet id={concil} onClose={() => setConcil(null)} />}
    <TransferSheet open={tr} onClose={() => setTr(false)} />
  </div>
}

function PayAnalysis({ ym }: { ym: string }) {
  const txs = L.monthTxs(ym).filter(t => t.type === 'expense'); if (!txs.length) return null
  const accts = R.getAccts(), cards = R.getCards()
  const by = (key: (t: typeof txs[0]) => string | null, label: (k: string) => string) => Object.entries(txs.reduce<Record<string, number>>((m, t) => { const k = key(t); if (k != null) m[k] = (m[k] || 0) + t.value; return m }, {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ l: label(k), v }))
  const secs = [
    ['Por forma de pagamento', by(t => t.payMethod || '_', k => k === '_' ? '❔ Não informado' : `${L.PAY_ICO[k as keyof typeof L.PAY]} ${L.PAY[k as keyof typeof L.PAY]}`)],
    ['⚡ Pix por banco', by(t => t.payMethod === 'pix' ? t.acctId || '_' : null, k => L.acctName(accts.find(a => a.id === k)))],
    ['💳 Débito por banco', by(t => t.payMethod === 'debito' ? t.acctId || '_' : null, k => L.acctName(accts.find(a => a.id === k)))],
    ['💳 Crédito por cartão', by(t => t.payMethod === 'credito' ? t.cardId || '_' : null, k => cards.find(c => c.id === k)?.name || 'Cartão não informado')],
  ] as const
  return <><Title>📊 Gastos do mês por pagamento</Title><div className="flex flex-col gap-2.5">{secs.filter(s => s[1].length).map(([t, rows]) => <Card key={t}><div className="mb-3 text-xs font-semibold text-tx2">{t}</div><Rank rows={[...rows]} /></Card>)}</div></>
}

function AcctSheet({ open, id, onClose }: { open: boolean; id?: string; onClose: () => void }) {
  const a = id ? R.getAccts().find(x => x.id === id) : undefined
  const [f, setF] = useState<Partial<Account>>({})
  const [k, setK] = useState('')
  if (open && k !== (id || 'new')) { setK(id || 'new'); setF(a || { type: 'corrente', initialDate: todayStr() }) }
  if (!open && k) setK('')
  const save = () => {
    if (!f.bank?.trim() || !f.initialDate) return toast('Informe banco e data do saldo', 'bad')
    const all = R.getAccts(), data = { ...f, bank: f.bank.trim(), initialBalance: +(f.initialBalance || 0) } as Account
    R.saveAccts(id ? all.map(x => x.id === id ? { ...x, ...data } : x) : [...all, { ...data, id: uid(), createdAt: Date.now() }]); toast('Conta salva'); onClose()
  }
  return <Sheet open={open} onClose={onClose} title={a ? 'Editar conta' : 'Nova conta'} footer={<Button variant="primary" className="flex-1" onClick={save}>Salvar</Button>}>
    <div className="grid grid-cols-2 gap-2.5"><Field label="Banco"><Input value={f.bank || ''} placeholder="Inter, Nubank…" onChange={e => setF({ ...f, bank: e.target.value })} /></Field><Field label="Apelido"><Input value={f.nick || ''} placeholder="Ex: Inter salário" onChange={e => setF({ ...f, nick: e.target.value })} /></Field></div>
    <Field label="Tipo"><Select value={f.type} onChange={e => setF({ ...f, type: e.target.value as AcctType })}>{Object.entries(L.ACCT_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
    <div className="grid grid-cols-2 gap-2.5"><Field label="Saldo (R$)"><Input type="number" inputMode="decimal" step="0.01" value={f.initialBalance ?? ''} onChange={e => setF({ ...f, initialBalance: e.target.value as never })} /></Field><Field label="Saldo na data"><Input type="date" value={f.initialDate || ''} onChange={e => setF({ ...f, initialDate: e.target.value })} /></Field></div>
    <Note>Só entram no saldo os lançamentos a partir desta data — os anteriores já estão dentro do saldo informado (nada é contado duas vezes).</Note>
    <div className="mt-2"><Toggle checked={!!f.inPatrimonio} onChange={v => setF({ ...f, inPatrimonio: v })} label="Somar no patrimônio (não cadastre também como bolsão)" /></div>
  </Sheet>
}

function CardSheet({ open, id, onClose }: { open: boolean; id?: string; onClose: () => void }) {
  const c = id ? R.getCards().find(x => x.id === id) : undefined
  const [f, setF] = useState<Partial<CardT>>({}), [k, setK] = useState('')
  if (open && k !== (id || 'new')) { setK(id || 'new'); setF(c || { kind: 'credit' }) }
  if (!open && k) setK('')
  const save = () => {
    if (!f.name?.trim()) return toast('Dê um nome ao cartão', 'bad')
    if (f.kind === 'credit' && (!f.closeDay || !f.dueDay)) return toast('Informe fechamento e vencimento', 'bad')
    const all = R.getCards(), data = { ...f, name: f.name.trim(), closeDay: f.closeDay ? +f.closeDay : null, dueDay: f.dueDay ? +f.dueDay : null, limit: +(f.limit || 0) } as CardT
    R.saveCards(id ? all.map(x => x.id === id ? { ...x, ...data } : x) : [...all, { ...data, id: uid(), createdAt: Date.now() }]); toast('Cartão salvo'); onClose()
  }
  return <Sheet open={open} onClose={onClose} title={c ? 'Editar cartão' : 'Novo cartão'} footer={<Button variant="primary" className="flex-1" onClick={save}>Salvar</Button>}>
    <div className="grid grid-cols-2 gap-2.5"><Field label="Nome"><Input value={f.name || ''} placeholder="Santander Free" onChange={e => setF({ ...f, name: e.target.value })} /></Field><Field label="Banco"><Input value={f.bank || ''} onChange={e => setF({ ...f, bank: e.target.value })} /></Field>
      <Field label="Tipo"><Select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as CardT['kind'] })}><option value="credit">Crédito</option><option value="debit">Débito</option></Select></Field>
      <Field label="Conta que paga"><Select value={f.acctId || ''} onChange={e => setF({ ...f, acctId: e.target.value || null })}><option value="">—</option>{R.getAccts().filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{L.acctName(a)}</option>)}</Select></Field>
      {f.kind === 'credit' && <><Field label="Fecha dia"><Input type="number" inputMode="numeric" value={f.closeDay ?? ''} onChange={e => setF({ ...f, closeDay: e.target.value as never })} /></Field><Field label="Vence dia"><Input type="number" inputMode="numeric" value={f.dueDay ?? ''} onChange={e => setF({ ...f, dueDay: e.target.value as never })} /></Field>
        <Field label="Limite (R$)"><Input type="number" inputMode="decimal" value={f.limit || ''} onChange={e => setF({ ...f, limit: e.target.value as never })} /></Field>
        <Field label="Limite junto com"><Select value={f.sharesLimitWith || ''} onChange={e => setF({ ...f, sharesLimitWith: e.target.value || null })}><option value="">— não —</option>{R.getCards().filter(x => x.kind === 'credit' && x.id !== id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field></>}
    </div>
  </Sheet>
}

function FaturaSheet({ cardId, k, setK, onClose }: { cardId: string; k: string; setK: (k: string) => void; onClose: () => void }) {
  const c = R.getCards().find(x => x.id === cardId)!, inv = L.invoiceOf(c, k), cats = R.getCats(), rest = Math.max(0, inv.total - inv.paid)
  const [val, setVal] = useState(''), [date, setDate] = useState(todayStr()), [acct, setAcct] = useState(c.acctId || R.getAccts().find(a => !a.archived)?.id || '')
  const pay = () => {
    const v = parseFloat(val || String(rest)); if (!v || !acct) return toast('Informe valor e conta', 'bad')
    R.saveInvPays([...R.getInvPays(), { id: uid(), cardId, invKey: k, acctId: acct, value: v, date, createdAt: Date.now() }]); setVal(''); toast('Pagamento registrado — sem despesa duplicada')
  }
  return <Sheet open onClose={onClose} title={c.name}>
    <div className="mb-3 flex items-center justify-between"><button onClick={() => setK(ymAdd(k, -1))} className="p-2 text-tx2"><ChevronLeft size={18} /></button><div className="text-center"><div className="text-sm font-semibold capitalize">Fatura de {ymLabel(k)}</div><div className="text-[11px] text-tx3">{ST[inv.status]} • fecha {fmtDate(inv.close)} • vence {fmtDate(inv.due)}</div></div><button onClick={() => setK(ymAdd(k, 1))} className="p-2 text-tx2"><ChevronRight size={18} /></button></div>
    <div className="grid grid-cols-3 gap-2"><Stat label="Total" value={fmt(inv.total)} /><Stat label="Pago" value={fmt(inv.paid)} tone="ok" /><Stat label="Resta" value={fmt(rest)} tone={rest > 0 ? 'warn' : 'ok'} /></div>
    <Title>Compras</Title>
    {!inv.items.length ? <Empty>Sem compras nesta fatura</Empty> : <Card className="!py-0">{[...inv.items].sort((a, b) => a.date.localeCompare(b.date)).map(t => { const ct = cats.find(x => x.id === t.cat); return <div key={t.id} className="flex items-center gap-3 border-b border-line py-2.5 text-sm last:border-0"><span className="w-12 text-[11px] text-tx3">{fmtDate(t.date).slice(0, 5)}</span><span className="min-w-0 flex-1 truncate">{t.desc}{t.installmentId && <small className="text-tx3"> ({t.instCurr}/{t.instTotal})</small>}<br /><small className="text-tx3">{ct?.emoji} {ct?.name}</small></span><span className="num font-semibold">{t.type === 'income' ? '−' : ''}{fmt(t.value)}</span></div> })}</Card>}
    {inv.pays.length > 0 && <><Title>Pagamentos</Title><Card className="!py-0">{inv.pays.map(p => <div key={p.id} className="flex items-center gap-3 border-b border-line py-2.5 text-sm last:border-0"><span className="w-12 text-[11px] text-tx3">{fmtDate(p.date).slice(0, 5)}</span><span className="flex-1">{L.acctName(R.getAccts().find(a => a.id === p.acctId))}</span><span className="num text-ok">{fmt(p.value)}</span><button onClick={() => confirm('Excluir pagamento?') && R.saveInvPays(R.getInvPays().filter(x => x.id !== p.id))} className="p-1 text-tx3"><Trash2 size={14} /></button></div>)}</Card></>}
    {rest > 0.005 && <><Title>Pagar fatura</Title><div className="grid grid-cols-2 gap-2.5"><Field label="Valor"><Input type="number" inputMode="decimal" placeholder={rest.toFixed(2)} value={val} onChange={e => setVal(e.target.value)} /></Field><Field label="Data"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field></div>
      <Field label="Sai de qual conta?"><Select value={acct} onChange={e => setAcct(e.target.value)}>{R.getAccts().filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{L.acctName(a)}</option>)}</Select></Field>
      <Button variant="primary" className="w-full" onClick={pay}>Registrar pagamento {val ? '' : 'total'}</Button><p className="mt-2 text-[11px] text-tx3">Reduz o saldo da conta e a fatura. Não cria despesa nova — as compras já contaram.</p></>}
  </Sheet>
}

function ExtratoSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { ym } = useApp()
  const a = R.getAccts().find(x => x.id === id)!, b = L.acctBalance(a, ym)
  const [per, setPer] = useState<'month' | 'all'>('month'), [tp, setTp] = useState('')
  let run = +a.initialBalance || 0
  let rows = b.moves.map(m => ({ ...m, after: (run += m.value) }))
  if (per === 'month') rows = rows.filter(m => ymOf(m.date) === ym); if (tp) rows = rows.filter(m => tp === 'in' ? m.value > 0 : m.value < 0)
  return <Sheet open onClose={onClose} title={`Extrato · ${L.acctName(a)}`}>
    <div className="mb-3 grid grid-cols-2 gap-2"><Select value={per} onChange={e => setPer(e.target.value as 'month')}><option value="month">Mês selecionado</option><option value="all">Tudo</option></Select><Select value={tp} onChange={e => setTp(e.target.value)}><option value="">Entradas e saídas</option><option value="in">Entradas</option><option value="out">Saídas</option></Select></div>
    <div className="num mb-3 flex justify-between text-xs text-tx2"><span>Inicial {fmt(+a.initialBalance || 0)} ({fmtDate(a.initialDate)})</span><span>Atual <b>{fmt(b.cur)}</b> · Prev. <b>{fmt(b.prev)}</b></span></div>
    {!rows.length ? <Empty>Sem movimentos</Empty> : <Card className="!py-0">{rows.slice().reverse().map((m, i) => <div key={i} className="flex items-center gap-3 border-b border-line py-2.5 text-sm last:border-0"><span className="w-12 text-[11px] text-tx3">{fmtDate(m.date).slice(0, 5)}</span><span className="min-w-0 flex-1"><span className="block truncate">{m.desc}</span><small className="text-tx3">{m.cat} · {m.paid ? 'pago' : '⏳ pendente'}</small></span><span className="text-right"><b className={cx('num block', m.value >= 0 ? 'text-ok' : 'text-tx')}>{m.value >= 0 ? '+' : ''}{fmt(m.value)}</b><small className="num text-tx3">{fmt(m.after)}</small></span></div>)}</Card>}
  </Sheet>
}

function ConcilSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const a = R.getAccts().find(x => x.id === id)!, cur = L.acctBalance(a).cur
  const [v, setV] = useState(''), [note, setNote] = useState('')
  const save = () => {
    const real = parseFloat(v); if (isNaN(real)) return toast('Informe o saldo do banco', 'bad')
    const diff = Math.round((real - cur) * 100) / 100; if (!diff) { toast('Saldo já confere ✅'); return onClose() }
    if (!confirm(`Registrar ajuste de ${diff > 0 ? '+' : ''}${fmt(diff)}? Nenhum lançamento anterior é alterado.`)) return
    R.saveAdjs([...R.getAdjs(), { id: uid(), acctId: id, value: diff, date: todayStr(), reportedBalance: real, note: note.trim(), createdAt: Date.now() }]); toast('Ajuste registrado'); onClose()
  }
  return <Sheet open onClose={onClose} title="Conciliar saldo" footer={<Button variant="primary" className="flex-1" onClick={save}>Registrar</Button>}>
    <p className="mb-3 text-sm text-tx2">Saldo calculado de <b>{L.acctName(a)}</b> hoje: <b className="num">{fmt(cur)}</b></p>
    <Field label="Saldo no app do banco hoje"><Input type="number" inputMode="decimal" step="0.01" value={v} onChange={e => setV(e.target.value)} /></Field>
    <Field label="Motivo (opcional)"><Input placeholder="Ex: tarifa não lançada" value={note} onChange={e => setNote(e.target.value)} /></Field>
    <Note>A diferença vira um ajuste registrado e auditável. Antes de ajustar, procure o lançamento que faltou — ajuste é o último recurso.</Note>
  </Sheet>
}

function TransferSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accts = R.getAccts().filter(a => !a.archived)
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [v, setV] = useState(''), [date, setDate] = useState(todayStr()), [note, setNote] = useState('')
  const fromId = from || accts[0]?.id, toId = to || accts[1]?.id
  const save = () => {
    const value = parseFloat(v); if (fromId === toId) return toast('Origem e destino iguais', 'bad'); if (!value) return toast('Informe o valor', 'bad')
    R.saveTransfers([...R.getTransfers(), { id: uid(), from: fromId!, to: toId!, value, date, note: note.trim(), createdAt: Date.now() }]); setV(''); setNote(''); toast('Transferência registrada (não é receita nem despesa)'); onClose()
  }
  return <Sheet open={open} onClose={onClose} title="Transferir entre contas" footer={<Button variant="primary" className="flex-1" onClick={save}>Salvar</Button>}>
    <div className="grid grid-cols-2 gap-2.5"><Field label="De"><Select value={fromId} onChange={e => setFrom(e.target.value)}>{accts.map(a => <option key={a.id} value={a.id}>{L.acctName(a)}</option>)}</Select></Field><Field label="Para"><Select value={toId} onChange={e => setTo(e.target.value)}>{accts.map(a => <option key={a.id} value={a.id}>{L.acctName(a)}</option>)}</Select></Field>
      <Field label="Valor"><Input type="number" inputMode="decimal" value={v} onChange={e => setV(e.target.value)} /></Field><Field label="Data"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field></div>
    <Field label="Observação"><Input value={note} onChange={e => setNote(e.target.value)} /></Field>
    <Note>Só move dinheiro entre as suas contas — não entra nas despesas nem nas receitas.</Note>
  </Sheet>
}
