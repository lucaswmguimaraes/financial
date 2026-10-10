export type TxType = 'income' | 'expense'
export type PayMethod = 'pix' | 'debito' | 'credito' | 'dinheiro' | 'boleto' | 'transf'
export type Group = 'nec' | 'des' | 'inv' | 'rec' | 'pj'

export interface Category { id: string; name: string; emoji: string; budget: number; group?: Group | null; archived?: boolean }
export interface Tx {
  id: string; desc: string; value: number; date: string; cat: string; note?: string; type: TxType
  recurringId?: string | null; installmentId?: string | null; instCurr?: number; instTotal?: number
  payMethod?: PayMethod; acctId?: string; cardId?: string; status?: 'pago' | 'pendente'; createdAt: number
}
export type Freq = 'monthly' | 'weekly' | 'biweekly' | 'yearly'
export interface Recurrent { id: string; desc: string; value: number; cat: string; type: TxType; freq: Freq; day: number | null; endDate: string | null; payMethod?: PayMethod; acctId?: string; cardId?: string; createdAt: number }
export interface Installment {
  id: string; desc: string; value: number; cat: string; total: number; remaining: number; day: number; createdAt: number
  startYM?: string; firstNum?: number; autoFromYM?: string; legacy?: boolean; payMethod?: PayMethod; acctId?: string; cardId?: string
}
export interface Goal { id: string; name: string; target: number; current: number; emoji: string; deadline: string; createdAt: number }
export interface Alert { id: string; catId: string; limit: number }
export type PatType = 'reserva' | 'invest' | 'custom'
export interface Pat { id: string; name: string; value: number; emoji: string; type: PatType; inst: string; note: string; createdAt: number; updatedAt: number }
export interface PatHist { id: string; patId: string; patName: string; oldVal: number; newVal: number; note: string; date: string; createdAt: number }
export type AcctType = 'corrente' | 'poupanca' | 'pagamento' | 'carteira'
export interface Account { id: string; bank: string; nick?: string; type: AcctType; initialBalance: number; initialDate: string; inPatrimonio?: boolean; archived?: boolean; createdAt?: number }
export interface Card { id: string; name: string; bank?: string; kind: 'credit' | 'debit'; acctId?: string | null; limit?: number; closeDay?: number | null; dueDay?: number | null; sharesLimitWith?: string | null; archived?: boolean; createdAt?: number }
export interface InvPay { id: string; cardId: string; invKey: string; acctId: string; value: number; date: string; createdAt: number }
export interface Transfer { id: string; from: string; to: string; value: number; date: string; note?: string; createdAt: number }
export interface Adj { id: string; acctId: string; value: number; date: string; reportedBalance: number; note?: string; createdAt: number }
export interface Settings { rollover?: boolean; rolloverFrom?: string }
