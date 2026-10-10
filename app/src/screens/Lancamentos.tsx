import { useState } from 'react'
import { Search, Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../app'
import { fmt, fmtDate, sum, ymOf, ymLabel } from '../lib/format'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import type { Tx } from '../domain/types'
import { Card, Input, Select, Empty, toast, cx } from '../ui/kit'

export function payLabel(t: Tx) {
  if (!t.payMethod) return ''
  const card = t.cardId ? R.getCards().find(c => c.id === t.cardId) : null, acct = t.acctId ? R.getAccts().find(a => a.id === t.acctId) : null
  return `${L.PAY_ICO[t.payMethod]} ${L.PAY[t.payMethod]}${card ? ' • ' + card.name : acct ? ' • ' + L.acctName(acct) : ''}`
}
export function TxRow({ t, showMonth }: { t: Tx; showMonth?: boolean }) {
  const { openTx } = useApp()
  const c = R.getCats().find(x => x.id === t.cat)
  const del = () => { if (!confirm(`Excluir "${t.desc}"?`)) return; R.saveTxs(R.getTxs().filter(x => x.id !== t.id)); toast('Excluído') }
  return <div className="flex items-center gap-3 border-b border-line py-3 last:border-0">
    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-s2 text-lg">{c?.emoji || '📦'}</div>
    <button onClick={() => openTx(t.id)} className="min-w-0 flex-1 text-left">
      <div className="truncate text-[14px] font-medium">{t.desc}
        {t.recurringId && <span className="ml-1.5 rounded bg-pur/15 px-1 text-[10px] text-pur">🔁</span>}
        {t.installmentId && <span className="ml-1.5 rounded bg-info/15 px-1 text-[10px] text-info">{t.instCurr}/{t.instTotal}</span>}
        {t.status === 'pendente' && <span className="ml-1.5 rounded bg-warn/15 px-1 text-[10px] text-warn">pendente</span>}</div>
      <div className="truncate text-[11px] text-tx3">{fmtDate(t.date)}{showMonth ? '' : ''} • {c?.name || 'Sem categoria'}{payLabel(t) && ` • ${payLabel(t)}`}</div>
      {t.note && <div className="truncate text-[11px] italic text-tx3">{t.note}</div>}
    </button>
    <div className="text-right"><div className={cx('num text-[14px] font-semibold', t.type === 'income' ? 'text-ok' : 'text-tx')}>{t.type === 'income' ? '+' : '−'}{fmt(t.value)}</div>
      <div className="mt-1 flex justify-end gap-1"><button aria-label="Editar" onClick={() => openTx(t.id)} className="p-1 text-tx3"><Pencil size={14} /></button><button aria-label="Excluir" onClick={del} className="p-1 text-tx3"><Trash2 size={14} /></button></div></div>
  </div>
}

export function Lancamentos() {
  const { ym } = useApp()
  const [q, setQ] = useState(''), [type, setType] = useState(''), [cat, setCat] = useState(''), [kind, setKind] = useState(''), [pay, setPay] = useState('')
  const cats = R.getCats(), searching = q.trim().length >= 2
  let txs = searching ? R.getTxs().filter(t => (t.desc + ' ' + (t.note || '')).toLowerCase().includes(q.trim().toLowerCase())) : L.monthTxs(ym)
  if (type) txs = txs.filter(t => t.type === type); if (cat) txs = txs.filter(t => t.cat === cat)
  if (kind === 'rec') txs = txs.filter(t => t.recurringId); if (kind === 'inst') txs = txs.filter(t => t.installmentId); if (kind === 'avulso') txs = txs.filter(t => !t.recurringId && !t.installmentId); if (kind === 'pend') txs = txs.filter(t => t.status === 'pendente')
  if (pay === '_') txs = txs.filter(t => !t.payMethod); else if (pay.startsWith('m:')) txs = txs.filter(t => t.payMethod === pay.slice(2)); else if (pay.startsWith('a:')) txs = txs.filter(t => t.acctId === pay.slice(2)); else if (pay.startsWith('c:')) txs = txs.filter(t => t.cardId === pay.slice(2))
  txs = [...txs].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt - a.createdAt))
  const groups = txs.reduce<Record<string, Tx[]>>((m, t) => { const k = searching ? ymOf(t.date) : t.date; (m[k] ||= []).push(t); return m }, {})
  const inc = sum(txs.filter(t => t.type === 'income'), t => t.value), exp = sum(txs.filter(t => t.type === 'expense'), t => t.value)
  return <div>
    <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3" /><Input placeholder="Buscar em todos os meses…" className="!pl-9" value={q} onChange={e => setQ(e.target.value)} type="search" /></div>
    <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [&>select]:!w-auto [&>select]:shrink-0 [&>select]:!py-1.5 [&>select]:!text-sm">
      <Select value={type} onChange={e => setType(e.target.value)}><option value="">Tipo</option><option value="expense">Despesas</option><option value="income">Receitas</option></Select>
      <Select value={cat} onChange={e => setCat(e.target.value)}><option value="">Categoria</option>{cats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</Select>
      <Select value={kind} onChange={e => setKind(e.target.value)}><option value="">Todos</option><option value="rec">Recorrentes</option><option value="inst">Parcelados</option><option value="avulso">Avulsos</option><option value="pend">Pendentes</option></Select>
      <Select value={pay} onChange={e => setPay(e.target.value)}><option value="">Pagamento</option><option value="_">❔ Não informado</option>{Object.entries(L.PAY).map(([k, l]) => <option key={k} value={'m:' + k}>{l}</option>)}{R.getAccts().map(a => <option key={a.id} value={'a:' + a.id}>🏦 {L.acctName(a)}</option>)}{R.getCards().map(c => <option key={c.id} value={'c:' + c.id}>💳 {c.name}</option>)}</Select>
    </div>
    <div className="num my-2 flex justify-between text-xs text-tx3"><span>{txs.length} lançamento(s){searching ? ' em todos os meses' : ''}</span><span><span className="text-ok">+{fmt(inc)}</span> · <span className="text-bad">−{fmt(exp)}</span></span></div>
    {!txs.length ? <Empty>{searching ? 'Nada encontrado' : 'Nenhum lançamento neste mês. Toque no + para adicionar.'}</Empty> :
      Object.entries(groups).map(([k, list]) => <div key={k} className="mb-3"><div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-tx3">{searching ? ymLabel(k) : fmtDate(k)}</div><Card className="!py-0">{list.map(t => <TxRow key={t.id} t={t} />)}</Card></div>)}
  </div>
}
