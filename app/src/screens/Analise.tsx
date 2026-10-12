import { useState } from 'react'
import { Plus, Trash2, Download } from 'lucide-react'
import { useApp } from '../app'
import { fmt, pct, sum, ymAdd, ymOf, ymShort, ymLabel } from '../lib/format'
import { session, uid } from '../lib/storage'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import { Card, Title, Stat, Button, Sheet, Field, Input, Select, Segmented, Progress, Empty, toast, cx } from '../ui/kit'
import { Lines, Rank } from '../ui/charts'

export function Historico() {
  const { ym } = useApp()
  const months = Array.from({ length: 12 }, (_, i) => ymAdd(ym, i - 11))
  const rows = months.map(k => { const t = L.monthTxs(k), inc = sum(t.filter(x => x.type === 'income'), x => x.value), exp = sum(t.filter(x => x.type === 'expense'), x => x.value); return { k, inc, exp, bal: inc - exp, rate: inc > 0 ? (inc - exp) / inc * 100 : null } })
  return <div>
    <Card><Lines labels={months.map(ymShort)} sets={[{ label: 'Receitas', data: rows.map(r => r.inc), color: '#5eead4' }, { label: 'Despesas', data: rows.map(r => r.exp), color: '#f87171' }, { label: 'Saldo', data: rows.map(r => r.bal), color: '#60a5fa', dash: true }]} /></Card>
    <Title>Mês a mês</Title>
    <Card className="!px-3 !py-1"><table className="num w-full text-xs"><thead><tr className="text-tx3"><th className="py-2 text-left font-medium">Mês</th><th className="text-right font-medium">Despesas</th><th className="text-right font-medium">Saldo</th><th className="text-right font-medium">Poupou</th></tr></thead>
      <tbody>{[...rows].reverse().map(r => <tr key={r.k} className="border-t border-line"><td className="py-2">{ymShort(r.k)} {r.k.slice(2, 4)}</td><td className="text-right text-bad">{fmt(r.exp)}</td><td className={cx('text-right font-semibold', r.bal >= 0 ? 'text-ok' : 'text-bad')}>{fmt(r.bal)}</td><td className={cx('text-right', r.rate === null ? 'text-tx3' : r.rate >= 20 ? 'text-ok' : 'text-warn')}>{r.rate === null ? '—' : pct(r.rate, 0)}</td></tr>)}</tbody></table></Card>
    <p className="mt-2 text-[11px] text-tx3">“Poupou” = quanto da renda sobrou. Meta saudável: 20% ou mais. Meses zerados podem ser só meses não atualizados.</p>
  </div>
}

export function Relatorio() {
  const { ym } = useApp()
  const [per, setPer] = useState<'month' | 'year'>('month')
  const txs = per === 'month' ? L.monthTxs(ym) : R.getTxs().filter(t => t.date.slice(0, 4) === ym.slice(0, 4))
  const inc = sum(txs.filter(t => t.type === 'income'), t => t.value), exp = sum(txs.filter(t => t.type === 'expense'), t => t.value), bal = inc - exp
  const fixed = sum(txs.filter(t => t.type === 'expense' && t.recurringId), t => t.value), inst = sum(txs.filter(t => t.type === 'expense' && t.installmentId), t => t.value)
  const cats = R.getCats(), byCat = Object.entries(txs.filter(t => t.type === 'expense').reduce<Record<string, number>>((m, t) => (m[t.cat] = (m[t.cat] || 0) + t.value, m), {})).sort((a, b) => b[1] - a[1])
  const top = [...txs.filter(t => t.type === 'expense')].sort((a, b) => b.value - a.value).slice(0, 5)
  const exportCSV = () => {
    const rows = [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)', 'Forma', 'Conta/Cartão', 'Recorrente', 'Parcela', 'Observação']]
    ;[...R.getTxs()].sort((a, b) => b.date.localeCompare(a.date)).forEach(t => rows.push([t.date, t.desc, cats.find(c => c.id === t.cat)?.name || '', t.type === 'income' ? 'Receita' : 'Despesa', t.value.toFixed(2).replace('.', ','), t.payMethod ? L.PAY[t.payMethod] : '', t.cardId ? R.getCards().find(c => c.id === t.cardId)?.name || '' : t.acctId ? L.acctName(R.getAccts().find(a => a.id === t.acctId)) : '', t.recurringId ? 'Sim' : 'Não', t.installmentId ? `${t.instCurr}/${t.instTotal}` : '', t.note || '']))
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = `financas_${session.mode}_${ym}.csv`; a.click(); toast('CSV exportado')
  }
  return <div>
    <Segmented value={per} onChange={setPer} options={[{ v: 'month', l: ymLabel(ym) }, { v: 'year', l: `Ano ${ym.slice(0, 4)}` }]} />
    <div className="mt-3 grid grid-cols-2 gap-2.5">
      <Stat label="Receitas" value={fmt(inc)} tone="ok" /><Stat label="Despesas" value={fmt(exp)} tone="bad" />
      <Stat label="Saldo" value={fmt(bal)} tone={bal >= 0 ? 'ok' : 'bad'} sub={inc ? `poupou ${pct(bal / inc * 100, 0)} da renda` : undefined} />
      <Stat label="Fixas" value={fmt(fixed)} tone="pur" sub={`parcelas ${fmt(inst)} · variáveis ${fmt(exp - fixed - inst)}`} />
    </div>
    <Title>Despesas por categoria</Title><Card>{byCat.length ? <Rank rows={byCat.map(([id, v]) => { const c = cats.find(x => x.id === id); return { l: c ? `${c.emoji} ${c.name}` : '—', v } })} /> : <span className="text-sm text-tx3">Sem despesas</span>}</Card>
    {top.length > 0 && <><Title>Maiores gastos</Title><Card className="!py-0">{top.map(t => <div key={t.id} className="flex justify-between border-b border-line py-2.5 text-sm last:border-0"><span className="truncate">{t.desc}</span><b className="num">{fmt(t.value)}</b></div>)}</Card></>}
    <Button className="mt-4 w-full" onClick={exportCSV}><Download size={16} /> Exportar CSV (planilha)</Button>
  </div>
}

export function Alertas() {
  const { ym } = useApp()
  const alerts = R.getAlerts(), cats = L.activeCats(), txs = L.monthTxs(ym)
  const [ed, setEd] = useState<{ catId: string; limit: string } | null>(null)
  const save = () => { if (!ed?.catId || !parseFloat(ed.limit)) return toast('Preencha os campos', 'bad'); R.saveAlerts([...R.getAlerts().filter(a => a.catId !== ed.catId), { id: uid(), catId: ed.catId, limit: parseFloat(ed.limit) }]); setEd(null); toast('Alerta salvo 🔔') }
  return <div>
    <p className="mb-3 text-sm text-tx2">Avisa no Início quando uma categoria passa de 80% do limite. Use para as 2–3 categorias que mais escapam.</p>
    <Button variant="primary" className="w-full" onClick={() => setEd({ catId: cats[0]?.id || '', limit: '' })}><Plus size={16} /> Novo alerta</Button>
    <div className="mt-3 flex flex-col gap-2">{!alerts.length ? <Empty>Nenhum alerta ainda</Empty> : alerts.map(a => { const c = R.getCats().find(x => x.id === a.catId); if (!c) return null; const sp = sum(txs.filter(t => t.type === 'expense' && t.cat === a.catId), t => t.value), over = sp > a.limit, warn = sp / a.limit >= .8
      return <Card key={a.id} className="!p-3.5"><div className="mb-2 flex items-center justify-between text-sm"><span>{c.emoji} {c.name}</span><span className="flex items-center gap-2"><span className={cx('num', over ? 'text-bad' : warn ? 'text-warn' : '')}>{fmt(sp)} / {fmt(a.limit)}</span><button onClick={() => R.saveAlerts(R.getAlerts().filter(x => x.id !== a.id))} className="text-tx3"><Trash2 size={14} /></button></span></div><Progress value={sp} max={a.limit} color={over ? 'var(--color-bad)' : warn ? 'var(--color-warn)' : 'var(--color-ok)'} /></Card> })}</div>
    <Sheet open={!!ed} onClose={() => setEd(null)} title="Novo alerta" footer={<Button variant="primary" className="flex-1" onClick={save}>Salvar</Button>}>
      {ed && <><Field label="Categoria"><Select value={ed.catId} onChange={e => setEd({ ...ed, catId: e.target.value })}>{cats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</Select></Field><Field label="Limite mensal (R$)"><Input type="number" inputMode="decimal" value={ed.limit} onChange={e => setEd({ ...ed, limit: e.target.value })} /></Field></>}
    </Sheet>
  </div>
}
export { ymOf }
