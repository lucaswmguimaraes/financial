import { describe, it, expect, beforeEach } from 'vitest'
import { setUser, setMode } from '../lib/storage'
import { todayStr, todayYM, ymAdd } from '../lib/format'
import * as R from './repo'
import * as L from './logic'
import { runMigrations, collectUserData, restoreBackup, summarize } from './safety'

const mdate = (off: number, day: number) => `${ymAdd(todayYM(), off)}-${String(day).padStart(2, '0')}`
const txsA = [
  { id: 't1', desc: 'Salário', value: 5000, date: mdate(0, 5), cat: 'c9', type: 'income', createdAt: 1 },
  { id: 't2', desc: 'Aluguel', value: 1500, date: mdate(0, 6), cat: 'c1', type: 'expense', createdAt: 2 },
  { id: 't3', desc: 'Cinema', value: 100, date: mdate(0, 7), cat: 'c5', type: 'expense', createdAt: 3 },
  { id: 't4', desc: 'Curso', value: 200, date: mdate(0, 8), cat: 'c6', type: 'expense', createdAt: 4 },
  { id: 't5', desc: 'Pet', value: 80, date: mdate(0, 8), cat: 'cX', type: 'expense', createdAt: 5 },
  { id: 't6', desc: 'Geladeira', value: 300, date: mdate(-2, 5), cat: 'c1', type: 'expense', installmentId: 'inst1', instCurr: 2, instTotal: 10, createdAt: 6 },
]
const catsA = [{ id: 'c1', name: 'Moradia', emoji: '🏠', budget: 0 }, { id: 'c5', name: 'Lazer', emoji: '🎬', budget: 0 }, { id: 'c6', name: 'Educação', emoji: '📚', budget: 0 }, { id: 'c9', name: 'Salário / Renda', emoji: '💰', budget: 0 }, { id: 'cX', name: 'Pet', emoji: '🐶', budget: 0 }]
const seed: Record<string, string> = {
  fp_users: JSON.stringify([{ id: 'uA', name: 'Lucas' }, { id: 'uB', name: 'Namorada' }]),
  fp_uA_pf_txs: JSON.stringify(txsA), fp_uA_pf_cats: JSON.stringify(catsA),
  fp_uA_pf_insts: JSON.stringify([{ id: 'inst1', desc: 'Geladeira', value: 300, cat: 'c1', total: 10, remaining: 8, day: 5, createdAt: 0 }]),
  fp_uA_pf_plan: JSON.stringify({ c1: 1600 }), fp_uA_schema: '1',
  fp_uB_pf_txs: JSON.stringify([{ id: 'b1', desc: 'Dela', value: 77, date: mdate(0, 3), cat: 'c2', type: 'expense', createdAt: 1 }]),
}
const c = (id: string) => R.getCats().find(x => x.id === id)!

beforeEach(() => {
  localStorage.clear(); Object.entries(seed).forEach(([k, v]) => localStorage.setItem(k, v))
  setUser('uA'); setMode('pf'); runMigrations()
})

describe('preservação de dados', () => {
  it('lançamentos antigos ficam byte a byte iguais e a namorada não é tocada', () => {
    expect(localStorage.getItem('fp_uA_pf_txs')).toBe(seed.fp_uA_pf_txs)
    expect(localStorage.getItem('fp_uB_pf_txs')).toBe(seed.fp_uB_pf_txs)
    expect(localStorage.getItem('fp_uA_pf_plan')).toBe(seed.fp_uA_pf_plan)
    expect(Object.keys(localStorage).some(k => k.startsWith('fp_uB_schema'))).toBe(false)
  })
  it('snapshot antes da migração + campos só adicionados', () => {
    const snap = Object.keys(localStorage).find(k => k.startsWith('fpbak_uA_'))!
    expect(JSON.parse(localStorage.getItem(snap)!).data.pf_txs).toBe(seed.fp_uA_pf_txs)
    expect(c('c6').group).toBe('nec'); expect(c('cX').group).toBeNull(); expect(c('cX').name).toBe('Pet')
    const i = R.getInstallments()[0]; expect([i.remaining, i.firstNum, i.autoFromYM]).toEqual([8, 2, todayYM()])
  })
  it('backup → perda → restauração devolve tudo', () => {
    const data = collectUserData(); localStorage.setItem('fp_uA_pf_txs', '[]')
    expect(restoreBackup({ app: 'financaspro', userId: 'uA', userName: 'Lucas', exportedAt: '', data })).toBe(true)
    expect(localStorage.getItem('fp_uA_pf_txs')).toBe(seed.fp_uA_pf_txs)
    expect(localStorage.getItem('fp_uB_pf_txs')).toBe(seed.fp_uB_pf_txs)
    expect(summarize(collectUserData()).pf.lanc).toBe(6)
  })
})

describe('50-30-20 e orçamento', () => {
  it('Educação conta como Necessidade; sem grupo separado', () => {
    const s = L.ruleStats(L.monthTxs(todayYM()))
    expect(s.nec / s.income).toBeCloseTo(0.34); expect(s.none).toBe(80)
  })
  it('orçamento herdado, editado por mês e sobra acumulada', () => {
    expect(L.budgetOf(c('c1'), todayYM())).toBe(1600)
    R.savePlanM({ [todayYM()]: { c1: 1800 } })
    expect([L.budgetOf(c('c1'), ymAdd(todayYM(), -1)), L.budgetOf(c('c1'), todayYM()), L.budgetOf(c('c1'), ymAdd(todayYM(), 1))]).toEqual([1600, 1800, 1800])
    R.saveSettings({ rollover: true, rolloverFrom: todayYM() })
    expect(L.availOf(c('c1'), ymAdd(todayYM(), 1))).toBe(2100)
  })
})

describe('parcelas', () => {
  it('legado: só gera a partir do mês atual e nunca duplica', () => {
    expect(L.pendingInsts(todayYM()).map(x => x.n)).toEqual([4])
    expect(L.pendingInsts(ymAdd(todayYM(), -1))).toEqual([])
    L.launchBatch(todayYM(), ['i:inst1:4']); L.launchBatch(todayYM(), ['i:inst1:4'])
    expect(R.getTxs().filter(t => t.installmentId === 'inst1').length).toBe(2)
  })
})

describe('contas e cartões (cenários do documento)', () => {
  beforeEach(() => {
    R.saveAccts([{ id: 'A', bank: 'Inter', initialBalance: 1000, initialDate: mdate(0, 1), type: 'corrente' }, { id: 'B', bank: 'Santander', initialBalance: 2000, initialDate: mdate(0, 1), type: 'corrente' }])
    R.saveCards([{ id: 'K', name: 'Santander Free', kind: 'credit', acctId: 'B', closeDay: 28, dueDay: 5, limit: 5000 }])
  })
  const bal = (id: string) => L.acctBalance(R.getAccts().find(a => a.id === id)!).cur
  const add = (t: object) => R.saveTxs([...R.getTxs(), { id: Math.random() + '', cat: 'c2', type: 'expense', createdAt: 1, date: todayStr(), ...t } as never])
  const card = () => R.getCards()[0]
  it('pix, crédito, fatura parcial/total, transferência, corte e pendente', () => {
    add({ desc: 'Pix', value: 50, payMethod: 'pix', acctId: 'A', status: 'pago' }); expect(bal('A')).toBe(950)
    add({ desc: 'C&A', value: 200, payMethod: 'credito', cardId: 'K' }); expect(bal('B')).toBe(2000)
    const k = L.invKeyOf(card(), todayStr()); expect(L.invoiceOf(card(), k).total).toBe(200)
    R.saveInvPays([{ id: 'p1', cardId: 'K', invKey: k, acctId: 'B', value: 120, date: todayStr(), createdAt: 1 }])
    expect(bal('B')).toBe(1880); expect(L.invoiceOf(card(), k).total - L.invoiceOf(card(), k).paid).toBe(80)
    const despesas = L.monthTxs(todayYM()).filter(t => t.type === 'expense').length
    R.saveTransfers([{ id: 'x', from: 'A', to: 'B', value: 100, date: todayStr(), createdAt: 1 }])
    expect([bal('A'), bal('B')]).toEqual([850, 1980]); expect(L.monthTxs(todayYM()).filter(t => t.type === 'expense').length).toBe(despesas)
    add({ desc: 'antes do corte', value: 999, payMethod: 'pix', acctId: 'A', date: mdate(-1, 20) }); expect(bal('A')).toBe(850)
    add({ desc: 'boleto futuro', value: 300, payMethod: 'boleto', acctId: 'A', status: 'pendente' })
    const a = R.getAccts()[0]; expect(L.acctBalance(a).cur).toBe(850); expect(L.acctBalance(a).prev).toBe(550)
  })
  it('PJ não vê contas do PF', () => { setMode('pj'); expect([R.getAccts().length, R.getCards().length]).toEqual([0, 0]) })
})
