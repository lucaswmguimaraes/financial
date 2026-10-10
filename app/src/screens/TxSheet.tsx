import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../app'
import { session, ldg, svg, uid } from '../lib/storage'
import { todayStr, ymOf, ymAdd, ymLabel, pct } from '../lib/format'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import type { Tx, TxType, PayMethod, Freq } from '../domain/types'
import { Sheet, Field, Input, Select, Segmented, Toggle, Button, Note, toast } from '../ui/kit'

interface Form { type: TxType; desc: string; value: string; date: string; cat: string; note: string; pay: PayMethod | ''; acct: string; card: string; status: 'pago' | 'pendente'; isInst: boolean; instTotal: string; instCurr: string; isRec: boolean; freq: Freq; recDay: string; recEnd: string }

export function TxSheet({ open, id, onClose }: { open: boolean; id?: string; onClose: () => void }) {
  const { ym } = useApp()
  const editing = id ? R.getTxs().find(t => t.id === id) : undefined
  const blank = (): Form => {
    const last = ldg<{ payMethod?: PayMethod; acctId?: string; cardId?: string }>('lastPay_' + session.mode, {})
    const date = ym === ymOf(todayStr()) ? todayStr() : `${ym}-01`
    return { type: 'expense', desc: '', value: '', date, cat: '', note: '', pay: last.payMethod || '', acct: last.acctId || '', card: last.cardId || '', status: 'pago', isInst: false, instTotal: '', instCurr: '1', isRec: false, freq: 'monthly', recDay: '', recEnd: '' }
  }
  const [f, setF] = useState<Form>(blank), [catTouched, setCatTouched] = useState(false), [sugg, setSugg] = useState('')
  useEffect(() => {
    if (!open) return
    setSugg(''); setCatTouched(!!editing)
    setF(editing ? { ...blank(), type: editing.type, desc: editing.desc, value: String(editing.value), date: editing.date, cat: editing.cat, note: editing.note || '', pay: editing.payMethod || '', acct: editing.acctId || '', card: editing.cardId || '', status: editing.status || 'pago' } : blank())
  }, [open, id]) // eslint-disable-line
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF(x => ({ ...x, [k]: v }))
  const cats = R.getCats().filter(c => !c.archived || c.id === f.cat)
  const ordered = useMemo(() => { const inc = cats.filter(c => c.group === 'rec'), exp = cats.filter(c => c.group !== 'rec'); return f.type === 'income' ? [...inc, ...exp] : [...exp, ...inc] }, [cats, f.type])
  const cat = f.cat || ordered[0]?.id || ''
  const accts = R.getAccts().filter(a => !a.archived || a.id === f.acct), cards = R.getCards().filter(c => c.kind === 'credit' && (!c.archived || c.id === f.card))
  const methods: PayMethod[] = f.type === 'income' ? ['pix', 'transf', 'dinheiro'] : ['pix', 'debito', 'credito', 'dinheiro', 'boleto', 'transf']
  const cred = f.pay === 'credito', selCard = cards.find(c => c.id === f.card)

  const onDesc = (desc: string) => {
    set('desc', desc)
    const hit = L.suggestFromHistory(desc, f.type, id)
    if (!hit) { setSugg(''); return }
    const c = R.getCats().find(x => x.id === hit.cat && !x.archived)
    if (c && !catTouched) { setF(x => ({ ...x, desc, cat: c.id, ...(!id && hit.payMethod ? { pay: hit.payMethod, acct: hit.acctId || '', card: hit.cardId || '' } : {}) })); setSugg(`Categoria e pagamento sugeridos pelo histórico (“${hit.desc}”)`) }
  }
  // dica 50-30-20 ao lançar
  const ruleHint = (() => {
    if (session.mode !== 'pf' || f.type !== 'expense') return null
    const c = R.getCats().find(x => x.id === cat); if (!c) return null
    const g = c.group ? L.GROUPS[c.group] : null
    if (!g || !g.t) return <Note tone="warn">{c.name} não tem grupo 50-30-20 — defina em Categorias.</Note>
    const k = ymOf(f.date || todayStr()), s = L.ruleStats(L.monthTxs(k).filter(t => t.id !== id)), v = parseFloat(f.value) || 0
    if (!s.income) return <Note>{g.e} {c.name} é <b>{g.l}</b> (meta {g.t}%). Ainda não há receita em {ymLabel(k)} para comparar.</Note>
    const grp = c.group as 'nec' | 'des' | 'inv', now = s[grp] / s.income * 100, after = (s[grp] + v) / s.income * 100, over = grp !== 'inv' && after > g.t
    return <Note tone={over ? 'warn' : 'ok'}>{g.e} {c.name} é <b>{g.l}</b> (meta {g.t}%). Em {ymLabel(k)} já usou <b>{pct(now)}</b>{v ? <> → com este gasto <b>{pct(after)}</b></> : null}.{over && ' Acima da meta.'}</Note>
  })()

  const save = () => {
    const value = parseFloat(f.value.replace(',', '.'))
    if (!f.desc.trim() || !value || !f.date || !cat) return toast('Preencha descrição, valor, data e categoria', 'bad')
    const payMethod = f.pay || undefined, cardId = payMethod === 'credito' ? f.card || undefined : undefined, acctId = payMethod && payMethod !== 'credito' ? f.acct || undefined : undefined
    const status = payMethod === 'credito' ? undefined : f.status
    const pay = { payMethod, cardId, acctId, status }, desc = f.desc.trim(), note = f.note.trim(), txs = R.getTxs()
    if (editing) {
      const i = txs.findIndex(t => t.id === editing.id); txs[i] = { ...txs[i], desc, value, date: f.date, cat, note, type: f.type, ...pay }
    } else {
      let recurringId: string | null = null, installmentId: string | null = null
      const instTot = parseInt(f.instTotal) || 0, instCur = parseInt(f.instCurr) || 1, isInst = f.isInst && f.type === 'expense' && instTot >= 2
      if (f.isRec) { const r = { id: uid(), desc, value, cat, type: f.type, freq: f.freq, day: parseInt(f.recDay) || null, endDate: f.recEnd || null, payMethod, cardId, acctId, createdAt: Date.now() }; R.saveRecurrents([...R.getRecurrents(), r]); recurringId = r.id }
      if (isInst) { const sYM = ymOf(f.date); const i = { id: uid(), desc, value, cat, total: instTot, remaining: instTot - instCur, day: new Date(f.date + 'T12:00').getDate(), startYM: sYM, firstNum: instCur, autoFromYM: ymAdd(sYM, 1), payMethod, cardId, acctId, createdAt: Date.now() }; R.saveInstallments([...R.getInstallments(), i]); installmentId = i.id }
      const t: Tx = { id: uid(), desc, value, date: f.date, cat, note, type: f.type, recurringId, installmentId, instCurr: isInst ? instCur : undefined, instTotal: isInst ? instTot : undefined, ...pay, createdAt: Date.now() }
      txs.push(t)
    }
    R.saveTxs(txs); if (payMethod) svg('lastPay_' + session.mode, { payMethod, cardId, acctId })
    toast(editing ? 'Atualizado' : f.isInst ? 'Salvo — próximas parcelas entram no início de cada mês' : f.isRec ? 'Salvo + recorrência' : 'Lançamento salvo')
    onClose()
  }

  return <Sheet open={open} onClose={onClose} title={editing ? 'Editar lançamento' : 'Novo lançamento'} footer={<><Button className="flex-1" onClick={onClose}>Cancelar</Button><Button className="flex-[2]" variant="primary" onClick={save}>Salvar</Button></>}>
    <Segmented value={f.type} onChange={v => setF(x => ({ ...x, type: v, isInst: false }))} options={[{ v: 'expense', l: '📉 Despesa' }, { v: 'income', l: '📈 Receita' }]} />
    <div className="mt-4" />
    <Field label="Valor (R$)"><Input inputMode="decimal" type="number" step="0.01" placeholder="0,00" value={f.value} onChange={e => set('value', e.target.value)} className="!font-display !text-2xl" autoFocus={!editing} /></Field>
    <Field label="Descrição" hint={sugg && <span className="text-ok">🏷️ {sugg}</span>}><Input placeholder="Ex: iFood, Aluguel, Salário…" value={f.desc} onChange={e => onDesc(e.target.value)} /></Field>
    <div className="grid grid-cols-2 gap-2.5">
      <Field label="Data"><Input type="date" value={f.date} onChange={e => set('date', e.target.value)} /></Field>
      <Field label="Categoria"><Select value={cat} onChange={e => { set('cat', e.target.value); setCatTouched(true) }}>{ordered.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}{c.archived ? ' (arquivada)' : ''}</option>)}</Select></Field>
    </div>
    {ruleHint && <div className="-mt-1 mb-3">{ruleHint}</div>}
    <div className="mb-3 rounded-2xl border border-line bg-s2/60 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tx3">💳 Pagamento</div>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Forma" className="!mb-0"><Select value={f.pay} onChange={e => set('pay', e.target.value as PayMethod)}><option value="">— não informado —</option>{methods.map(m => <option key={m} value={m}>{L.PAY_ICO[m]} {L.PAY[m]}</option>)}</Select></Field>
        {cred ? <Field label="Cartão" className="!mb-0"><Select value={f.card} onChange={e => set('card', e.target.value)}><option value="">Não informado</option>{cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          : f.pay ? <Field label={f.type === 'income' ? 'Conta de destino' : f.pay === 'dinheiro' ? 'Carteira' : 'Conta de origem'} className="!mb-0"><Select value={f.acct} onChange={e => set('acct', e.target.value)}><option value="">Não informada</option>{accts.map(a => <option key={a.id} value={a.id}>{L.acctName(a)}</option>)}</Select></Field> : null}
        {f.pay && !cred && <Field label="Status" className="col-span-2 !mb-0"><Segmented value={f.status} onChange={v => set('status', v)} options={[{ v: 'pago', l: '✅ Pago' }, { v: 'pendente', l: '⏳ Pendente' }]} /></Field>}
      </div>
      {cred && <div className="mt-2"><Note>{selCard ? <>Entra na fatura de <b>{ymLabel(L.invKeyOf(selCard, f.date || todayStr()))}</b>. Não reduz o saldo da conta agora — só quando a fatura for paga.</> : 'Escolha o cartão para saber em qual fatura cai.'}</Note></div>}
      {!accts.length && !cards.length && f.pay && <div className="mt-2 text-[11px] text-tx3">Cadastre contas e cartões na aba Contas para acompanhar saldos.</div>}
    </div>
    <Field label="Observação (opcional)"><Input placeholder="Ex: presente aniversário da mãe" value={f.note} onChange={e => set('note', e.target.value)} /></Field>
    {!editing && <div className="rounded-2xl border border-line bg-s2/60 px-3 py-2">
      {f.type === 'expense' && <Toggle checked={f.isInst} onChange={v => setF(x => ({ ...x, isInst: v, isRec: v ? false : x.isRec }))} label="💳 Compra parcelada" />}
      {f.isInst && <div className="grid grid-cols-2 gap-2.5 pt-2"><Field label="Total de parcelas"><Input type="number" inputMode="numeric" placeholder="12" value={f.instTotal} onChange={e => set('instTotal', e.target.value)} /></Field><Field label="Esta é a parcela nº"><Input type="number" inputMode="numeric" value={f.instCurr} onChange={e => set('instCurr', e.target.value)} /></Field>
        <div className="col-span-2 -mt-1 mb-2"><Note>Lance o valor de UMA parcela. As próximas entram sozinhas na revisão do início de cada mês, até a última.</Note></div></div>}
      <Toggle checked={f.isRec} onChange={v => setF(x => ({ ...x, isRec: v, isInst: v ? false : x.isInst }))} label="🔁 Repete todo mês (recorrente)" />
      {f.isRec && <div className="grid grid-cols-2 gap-2.5 pt-2"><Field label="Frequência"><Select value={f.freq} onChange={e => set('freq', e.target.value as Freq)}><option value="monthly">Mensal</option><option value="weekly">Semanal</option><option value="biweekly">Quinzenal</option><option value="yearly">Anual</option></Select></Field>
        <Field label="Dia do vencimento"><Input type="number" inputMode="numeric" placeholder="Ex: 5" value={f.recDay} onChange={e => set('recDay', e.target.value)} /></Field>
        <Field label="Termina em (opcional)" className="col-span-2"><Input type="date" value={f.recEnd} onChange={e => set('recEnd', e.target.value)} /></Field></div>}
    </div>}
  </Sheet>
}
