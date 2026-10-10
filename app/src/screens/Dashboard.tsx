import { useApp } from '../app'
import { fmt, pct, sum, ymAdd, ymShort, todayYM } from '../lib/format'
import { session } from '../lib/storage'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import { Card, Title, Stat, Progress, Button, Note, cx } from '../ui/kit'
import { Donut, Bars, Rank, COLORS } from '../ui/charts'
import { BookOpen } from 'lucide-react'

export function RuleCard({ ym }: { ym: string }) {
  const { go } = useApp()
  const s = L.ruleStats(L.monthTxs(ym))
  return <Card>
    <div className="mb-1 flex items-center justify-between"><h3 className="text-[11px] font-semibold uppercase tracking-wider text-tx3">📐 Regra 50-30-20</h3>{s.income > 0 && <span className="num text-[11px] text-tx3">renda {fmt(s.income)}</span>}</div>
    <p className="mb-3 text-xs leading-relaxed text-tx2">Da renda do mês: <b className="text-tx">50%</b> necessidades, <b className="text-tx">30%</b> desejos, <b className="text-tx">20%</b> investir.</p>
    {!s.income ? <Note>Lance a receita do mês para calcular a regra.</Note> :
      <div className="flex flex-col gap-3">{(['nec', 'des', 'inv'] as const).map(k => {
        const g = L.GROUPS[k], t = g.t!, v = s[k], p = v / s.income * 100, meta = s.income * t / 100
        const col = k === 'inv' ? (p >= t ? 'var(--color-ok)' : 'var(--color-warn)') : p > t + 5 ? 'var(--color-bad)' : p > t ? 'var(--color-warn)' : 'var(--color-ok)'
        return <div key={k}>
          <div className="mb-1 flex items-center justify-between text-[13px]"><span>{g.e} {g.l}</span><span className="num font-semibold" style={{ color: col }}>{pct(p)} <span className="font-normal text-tx3">/ {t}%</span></span></div>
          <Progress value={Math.min(p, 100)} color={col} mark={t} />
          <div className="num mt-1 text-[11px] text-tx3">{fmt(v)} de {fmt(meta)} • {k === 'inv' ? (meta - v > 0 ? `faltam ${fmt(meta - v)}` : 'meta atingida ✅') : (meta - v >= 0 ? `restam ${fmt(meta - v)}` : <span className="text-bad">passou {fmt(v - meta)}</span>)}</div>
        </div>
      })}
        {s.none > 0 && <button onClick={() => go('categorias')} className="text-left text-xs text-warn">⚠ {fmt(s.none)} em categorias sem grupo — definir em Categorias ›</button>}
      </div>}
  </Card>
}

export function Dashboard() {
  const { ym, go, openBatch } = useApp()
  const txs = L.monthTxs(ym), cats = R.getCats()
  const inc = sum(txs.filter(t => t.type === 'income'), t => t.value), exp = sum(txs.filter(t => t.type === 'expense'), t => t.value), bal = inc - exp
  const accts = R.getAccts().filter(a => !a.archived), totAc = sum(accts, a => L.acctBalance(a).cur)
  const pats = R.getPats(), patAcc = accts.filter(a => a.inPatrimonio), totPat = sum(pats, p => p.value) + sum(patAcc, a => L.acctBalance(a).cur)
  const da = L.dailyAllowance(ym), pc = L.pendingCount(ym)
  const byCat = Object.entries(txs.filter(t => t.type === 'expense').reduce<Record<string, number>>((m, t) => (m[t.cat] = (m[t.cat] || 0) + t.value, m), {})).sort((a, b) => b[1] - a[1])
  const catLbl = (id: string) => { const c = cats.find(x => x.id === id); return c ? `${c.emoji} ${c.name}` : '—' }
  const months = [5, 4, 3, 2, 1, 0].map(i => ymAdd(ym, -i)), mt = months.map(k => L.monthTxs(k))
  const incA = mt.map(t => sum(t.filter(x => x.type === 'income'), x => x.value)), expA = mt.map(t => sum(t.filter(x => x.type === 'expense'), x => x.value))
  const alerts = R.getAlerts()
  return <div className="flex flex-col gap-3">
    {pc > 0 && <Card className="!border-ok/30 !bg-ok/5"><div className="flex items-center gap-3"><div className="flex-1 text-sm"><b>📥 {pc} lançamento(s) do início do mês</b><div className="text-xs text-tx3">Recorrentes e parcelas aguardando confirmação</div></div><Button size="sm" variant="primary" onClick={openBatch}>Revisar</Button></div></Card>}
    <div className="grid grid-cols-2 gap-2.5">
      <Stat label="Receitas" value={fmt(inc)} tone="ok" sub="no mês" />
      <Stat label="Despesas" value={fmt(exp)} tone="bad" sub="no mês (competência)" />
      <Stat label="Saldo do mês" value={fmt(bal)} tone={bal >= 0 ? 'ok' : 'bad'} sub="receitas − despesas" />
      {da ? <Stat label="Por dia" value={fmt(da.perDay)} tone={da.perDay < 0 ? 'bad' : 'info'} sub={`${fmt(da.rest)} p/ ${da.left} dia(s)`} onClick={() => go('planejamento')} />
        : <Stat label="Lançamentos" value={txs.length} sub="no mês" onClick={() => go('lancamentos')} />}
      {accts.length > 0 && <Stat label="Em contas" value={fmt(totAc)} tone={totAc >= 0 ? 'ok' : 'bad'} sub="saldo bancário hoje" onClick={() => go('contas')} />}
      {totPat > 0 && <Stat label="Patrimônio" value={fmt(totPat)} tone="pur" sub={`${pats.length} bolsão(ões)${patAcc.length ? ` + ${patAcc.length} conta(s)` : ''}`} onClick={() => go('patrimonio')} />}
    </div>
    {ym > todayYM() && <Note>Mês futuro: só aparece o que já foi lançado ou agendado.</Note>}
    {session.mode === 'pf' && <RuleCard ym={ym} />}
    <Title>Gastos por categoria</Title>
    <Card>{byCat.length ? <><Donut labels={byCat.map(([id]) => catLbl(id))} data={byCat.map(x => x[1])} /><div className="mt-4"><Rank rows={byCat.map(([id, v], i) => ({ l: catLbl(id), v, c: COLORS[i % COLORS.length] }))} total={exp} /></div></> : <div className="py-6 text-center text-sm text-tx3">Sem despesas no mês</div>}</Card>
    <Title>Últimos 6 meses</Title>
    <Card><Bars labels={months.map(ymShort)} sets={[{ label: 'Receitas', data: incA, color: 'rgba(94,234,212,.75)' }, { label: 'Despesas', data: expA, color: 'rgba(248,113,113,.75)' }]} />
      <table className="num mt-3 w-full text-xs"><thead><tr className="text-tx3"><th className="py-1 text-left font-medium" /><th className="text-right font-medium">Receitas</th><th className="text-right font-medium">Despesas</th><th className="text-right font-medium">Saldo</th></tr></thead>
        <tbody>{months.map((k, i) => <tr key={k} className={cx('border-t border-line', k === ym && 'bg-s2')}><td className="py-1.5 capitalize">{ymShort(k)}</td><td className="text-right text-ok">{fmt(incA[i])}</td><td className="text-right text-bad">{fmt(expA[i])}</td><td className={cx('text-right font-semibold', incA[i] - expA[i] >= 0 ? 'text-ok' : 'text-bad')}>{fmt(incA[i] - expA[i])}</td></tr>)}</tbody></table>
      <p className="mt-2 text-[11px] text-tx3">Mês zerado = ainda não atualizado, não significa gasto zero.</p></Card>
    {alerts.length > 0 && <><Title>Alertas</Title><Card className="flex flex-col gap-3">{alerts.map(a => { const c = cats.find(x => x.id === a.catId); if (!c) return null; const sp = sum(txs.filter(t => t.type === 'expense' && t.cat === a.catId), t => t.value); const over = sp > a.limit, warn = sp / a.limit >= .8
      return <div key={a.id}><div className="mb-1 flex justify-between text-[13px]"><span>{c.emoji} {c.name}</span><span className={cx('num', over ? 'text-bad' : warn ? 'text-warn' : 'text-tx2')}>{fmt(sp)} / {fmt(a.limit)}</span></div><Progress value={sp} max={a.limit} color={over ? 'var(--color-bad)' : warn ? 'var(--color-warn)' : 'var(--color-ok)'} /></div> })}</Card></>}
    <button onClick={() => go('guia')} className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-line py-3 text-sm text-tx2"><BookOpen size={16} /> Guia de uso e rotina</button>
  </div>
}
