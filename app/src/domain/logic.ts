// Regras de negócio — portadas 1:1 da v2 (index.html) e cobertas por testes.
import { session } from '../lib/storage'
import { sum, ymOf, ymAdd, ymDiff, todayStr, todayYM, dateIn } from '../lib/format'
import * as R from './repo'
import type { Category, Group, Tx, Installment, Card, Account, PayMethod } from './types'

// ═══ GRUPOS 50-30-20 ═══
export const GROUPS: Record<Group, { l: string; e: string; t?: number; hint: string }> = {
  nec: { l: 'Necessidade', e: '🏠', t: 50, hint: 'o que você precisa para viver: moradia, contas da casa, mercado, transporte, saúde, educação' },
  des: { l: 'Desejo', e: '🎬', t: 30, hint: 'o que é escolha: restaurante, delivery, lazer, roupas, assinaturas, presentes, viagens' },
  inv: { l: 'Investimento', e: '📈', t: 20, hint: 'o que constrói o futuro: aportes, reserva de emergência, previdência, amortizar dívida' },
  rec: { l: 'Receita', e: '💰', hint: 'entradas de dinheiro: salário, freelas, rendimentos, reembolsos' },
  pj: { l: 'Empresa (PJ)', e: '🏢', hint: 'custos e receitas do CNPJ' },
}
export const DEF_GROUP: Record<string, Group> = { c1: 'nec', c2: 'nec', c3: 'nec', c4: 'nec', c6: 'nec', c5: 'des', c7: 'des', c10: 'des', c8: 'inv', c9: 'rec', p1: 'rec', p7: 'rec' }
export const activeCats = () => R.getCats().filter(c => !c.archived)
export const expenseCats = () => activeCats().filter(c => c.group !== 'rec')
export const monthTxs = (k: string) => R.getTxs().filter(t => ymOf(t.date) === k)

export function ruleStats(txs: Tx[]) {
  const cats = R.getCats(); const income = sum(txs.filter(t => t.type === 'income'), t => t.value)
  const g = { nec: 0, des: 0, inv: 0, none: 0 }
  txs.filter(t => t.type === 'expense').forEach(t => {
    const k = cats.find(x => x.id === t.cat)?.group
    if (k === 'nec' || k === 'des' || k === 'inv') g[k] += t.value; else g.none += t.value
  })
  return { income, ...g }
}

// ═══ ORÇAMENTO POR MÊS ═══
export function planFor(k: string): Record<string, number> {
  const pm = R.getPlanM(); if (pm[k]) return pm[k]
  const prev = Object.keys(pm).filter(x => x < k).sort().pop()
  return prev ? pm[prev] : R.getPlan()
}
export const budgetOf = (c: Category, k: string) => { const p = planFor(k); return p[c.id] !== undefined ? p[c.id] : (c.budget || 0) }
export const spentOf = (cid: string, k: string) => sum(R.getTxs().filter(t => t.type === 'expense' && t.cat === cid && ymOf(t.date) === k), t => t.value)
export function carryOf(c: Category, k: string): number {
  const st = R.getSettings(); if (!st.rollover || !st.rolloverFrom) return 0
  const p = ymAdd(k, -1); if (p < st.rolloverFrom) return 0
  return availOf(c, p) - spentOf(c.id, p)
}
export const availOf = (c: Category, k: string): number => budgetOf(c, k) + carryOf(c, k)
export function dailyAllowance(k: string) {
  if (k !== todayYM()) return null
  const cats = expenseCats(); if (!sum(cats, c => availOf(c, k))) return null
  const all = R.getCats()
  const spent = sum(monthTxs(k).filter(t => t.type === 'expense' && all.find(c => c.id === t.cat)?.group !== 'inv'), t => t.value)
  const bud = sum(cats.filter(c => c.group !== 'inv'), c => availOf(c, k))
  const now = new Date(), last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), left = last - now.getDate() + 1
  return { perDay: (bud - spent) / left, left, rest: bud - spent }
}

// ═══ PARCELAS ═══
export function instMeta(i: Installment) {
  const startYM = i.startYM || ymOf(i.createdAt); const firstNum = i.firstNum || Math.max(1, i.total - i.remaining)
  const launched = R.getTxs().filter(t => t.installmentId === i.id).map(t => t.instCurr || 0)
  const paid = Math.max(firstNum, ...launched)
  return { startYM, firstNum, paid, left: Math.max(0, i.total - paid), autoFromYM: i.autoFromYM || ymAdd(startYM, 1) }
}
export const instNumFor = (i: Installment, k: string) => { const m = instMeta(i); return m.firstNum + ymDiff(m.startYM, k) }
// Uso real: a parcela seguinte costumava ser lançada como um parcelamento NOVO (ex.: "Viagem" 1/10 e
// outro registro "Viagem" 2/10). A mesma compra é identificada por descrição + total de parcelas.
const chainKey = (desc: string, total: number) => desc.trim().toLowerCase() + '|' + total
export function pendingInsts(k: string) {
  const txs = R.getTxs(), seen = new Set<string>()
  const launched = new Set(txs.filter(t => t.installmentId && t.instCurr && t.instTotal).map(t => chainKey(t.desc, t.instTotal!) + '|' + t.instCurr))
  return R.getInstallments().flatMap(i => {
    const m = instMeta(i), n = instNumFor(i, k)
    if (k < m.autoFromYM || n <= m.firstNum || n > i.total) return []
    if (txs.some(t => t.installmentId === i.id && t.instCurr === n)) return []
    const ck = chainKey(i.desc, i.total) + '|' + n
    if (launched.has(ck) || seen.has(ck)) return [] // mesma compra já lançada (ou já sugerida) por outro registro
    // o registro mais recente da mesma compra é quem continua a sequência
    const newer = R.getInstallments().some(o => o.id !== i.id && chainKey(o.desc, o.total) === chainKey(i.desc, i.total) && Math.abs(o.value - i.value) < 0.05 && instMeta(o).firstNum > m.firstNum)
    if (newer) return []
    seen.add(ck)
    const lookalike = txs.some(t => ymOf(t.date) === k && t.type === 'expense' && !t.installmentId && Math.abs(t.value - i.value) < 0.01 && t.desc.toLowerCase().includes(i.desc.toLowerCase().slice(0, 6)))
    return [{ inst: i, n, lookalike }]
  })
}
export function pendingRecs(k: string) {
  const txs = monthTxs(k)
  return R.getRecurrents().filter(r => !txs.some(t => t.recurringId === r.id) && !(r.endDate && ymOf(r.endDate) < k))
}
export const pendingCount = (k: string) => pendingRecs(k).length + pendingInsts(k).length
export const statusFor = (date: string) => (date > todayStr() ? 'pendente' : 'pago') as 'pago' | 'pendente'
const FREQ_LBL: Record<string, string> = { monthly: 'Mensal', weekly: 'Semanal', biweekly: 'Quinzenal', yearly: 'Anual' }
export { FREQ_LBL }
/** Lança recorrentes ("r:id") e parcelas ("i:id:n") do mês. Idempotente: nunca duplica. */
export function launchBatch(k: string, keys: string[]) {
  const recs = R.getRecurrents(), insts = R.getInstallments(), txs = R.getTxs(); let n = 0
  keys.forEach(v => {
    const [kind, id, num] = v.split(':')
    if (kind === 'r') {
      const r = recs.find(x => x.id === id); if (!r || txs.some(t => t.recurringId === r.id && ymOf(t.date) === k)) return
      const date = dateIn(k, r.day || 1)
      txs.push({ id: uidLocal(), desc: r.desc, value: r.value, date, cat: r.cat, note: `Recorrente (${FREQ_LBL[r.freq]})`, type: r.type, recurringId: r.id, payMethod: r.payMethod, acctId: r.acctId, cardId: r.cardId, status: r.payMethod === 'credito' ? undefined : statusFor(date), createdAt: Date.now() }); n++
    } else {
      const i = insts.find(x => x.id === id), nn = +num; if (!i || txs.some(t => t.installmentId === i.id && t.instCurr === nn)) return
      const date = dateIn(k, i.day || 1)
      txs.push({ id: uidLocal(), desc: i.desc, value: i.value, date, cat: i.cat, note: `Parcela ${nn}/${i.total}`, type: 'expense', installmentId: i.id, instCurr: nn, instTotal: i.total, payMethod: i.payMethod, acctId: i.acctId, cardId: i.cardId, status: i.payMethod === 'credito' ? undefined : statusFor(date), createdAt: Date.now() }); n++
    }
  })
  R.saveTxs(txs); return n
}
const uidLocal = () => '_' + Math.random().toString(36).substr(2, 9)

// ═══ CONTAS, CARTÕES, FATURAS ═══
export const PAY: Record<PayMethod, string> = { pix: 'Pix', debito: 'Débito', credito: 'Crédito', dinheiro: 'Dinheiro', boleto: 'Boleto', transf: 'Transferência' }
export const PAY_ICO: Record<PayMethod, string> = { pix: '⚡', debito: '💳', credito: '💳', dinheiro: '💵', boleto: '🧾', transf: '🔄' }
export const ACCT_TYPES = { corrente: 'Conta corrente', poupanca: 'Poupança', pagamento: 'Conta de pagamento', carteira: 'Carteira (espécie)' }
export const acctName = (a?: Account | null) => a ? (a.nick || a.bank) : 'Conta não informada'
export const isPaid = (t: Tx) => t.status !== 'pendente'

export function invKeyOf(card: Card, date: string) { const d = new Date(date + 'T12:00'); const close = card.closeDay || 31; return d.getDate() <= close ? ymOf(d) : ymAdd(ymOf(d), 1) }
export function invDates(card: Card, k: string) {
  const close = dateIn(k, card.closeDay || 31)
  const due = (card.dueDay || 10) > (card.closeDay || 31) ? dateIn(k, card.dueDay || 10) : dateIn(ymAdd(k, 1), card.dueDay || 10)
  return { close, due }
}
export const cardCharges = (card: Card) => R.getTxs().filter(t => t.cardId === card.id && t.payMethod === 'credito')
export type InvStatus = 'aberta' | 'fechada' | 'paga' | 'parcial' | 'vencida'
export function invoiceOf(card: Card, k: string) {
  const items = cardCharges(card).filter(t => invKeyOf(card, t.date) === k)
  const total = sum(items, t => t.type === 'expense' ? t.value : -t.value)
  const pays = R.getInvPays().filter(p => p.cardId === card.id && p.invKey === k), paid = sum(pays, p => p.value)
  const { close, due } = invDates(card, k), today = todayStr()
  const status: InvStatus = today <= close ? 'aberta' : paid >= total - 0.005 ? 'paga' : paid > 0 ? 'parcial' : today > due ? 'vencida' : 'fechada'
  return { k, items, total, paid, pays, close, due, status }
}
export function cardLimitUse(card: Card) {
  const all = R.getCards()
  const group = all.filter(c => c.id === card.id || c.sharesLimitWith === card.id || card.sharesLimitWith === c.id)
  const used = sum(group, c => sum(cardCharges(c), t => t.type === 'expense' ? t.value : -t.value) - sum(R.getInvPays().filter(p => p.cardId === c.id), p => p.value))
  const limit = card.sharesLimitWith ? (all.find(c => c.id === card.sharesLimitWith)?.limit || card.limit) : card.limit
  return { used, limit: limit || 0, avail: (limit || 0) - used }
}
export interface Move { date: string; desc: string; cat: string; method: string; value: number; paid: boolean; kind: string }
export function acctMoves(a: Account): Move[] {
  const from = a.initialDate || '0000-00-00', mv: Move[] = [], cats = R.getCats(), accts = R.getAccts(), cards = R.getCards()
  R.getTxs().filter(t => t.acctId === a.id && t.payMethod !== 'credito' && t.date >= from).forEach(t => {
    const c = cats.find(x => x.id === t.cat)
    mv.push({ date: t.date, desc: t.desc, cat: c ? `${c.emoji} ${c.name}` : '', method: t.payMethod ? PAY[t.payMethod] : '', value: t.type === 'income' ? t.value : -t.value, paid: isPaid(t), kind: t.type })
  })
  R.getTransfers().filter(x => (x.from === a.id || x.to === a.id) && x.date >= from).forEach(x => {
    const other = accts.find(o => o.id === (x.from === a.id ? x.to : x.from))
    mv.push({ date: x.date, desc: `${x.from === a.id ? 'Transferência para' : 'Transferência de'} ${acctName(other)}`, cat: '🔄 Transferência', method: 'Transferência', value: x.from === a.id ? -x.value : x.value, paid: true, kind: 'transfer' })
  })
  R.getInvPays().filter(p => p.acctId === a.id && p.date >= from).forEach(p => {
    const c = cards.find(x => x.id === p.cardId)
    mv.push({ date: p.date, desc: `Fatura ${c?.name || ''} (${p.invKey})`, cat: '💳 Fatura', method: 'Pagamento de fatura', value: -p.value, paid: true, kind: 'invpay' })
  })
  R.getAdjs().filter(x => x.acctId === a.id).forEach(x => mv.push({ date: x.date, desc: `Ajuste de conciliação${x.note ? ' — ' + x.note : ''}`, cat: '⚖️ Ajuste', method: 'Ajuste', value: x.value, paid: true, kind: 'adj' }))
  return mv.sort((x, y) => x.date.localeCompare(y.date))
}
export function acctBalance(a: Account, k = todayYM()) {
  const mv = acctMoves(a), today = todayStr(), ini = +a.initialBalance || 0
  const cur = ini + sum(mv.filter(m => m.paid && m.date <= today), m => m.value)
  const prev = ini + sum(mv, m => m.value)
  const mm = mv.filter(m => ymOf(m.date) === k && m.paid)
  return { cur, prev, inM: sum(mm.filter(m => m.value > 0), m => m.value), outM: -sum(mm.filter(m => m.value < 0), m => m.value), moves: mv }
}

// ═══ PATRIMÔNIO / RESERVA ═══
export function emergencyInfo() {
  const pats = R.getPats(), tRes = sum(pats.filter(p => p.type === 'reserva'), p => p.value)
  let total = 0, n = 0
  for (let i = 1; i <= 3; i++) { const exp = sum(monthTxs(ymAdd(todayYM(), -i)).filter(t => t.type === 'expense'), t => t.value); if (exp > 0) { total += exp; n++ } }
  const avg = n ? total / n : 0
  return { tRes, avg, target: avg * 6, months: avg > 0 ? tRes / avg : 0 }
}

// ═══ SUGESTÃO PELO HISTÓRICO ═══
export function suggestFromHistory(desc: string, type: Tx['type'], excludeId?: string | null) {
  const d = desc.trim().toLowerCase(); if (d.length < 3) return null
  const txs = R.getTxs().filter(t => t.type === type && t.id !== excludeId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return txs.find(t => t.desc.toLowerCase() === d) || txs.find(t => t.desc.toLowerCase().startsWith(d)) || txs.find(t => t.desc.toLowerCase().includes(d)) || null
}

export const modeLabel = () => session.mode === 'pf' ? 'Pessoa Física' : 'PJ / MEI'
