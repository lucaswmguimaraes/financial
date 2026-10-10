// Acesso aos dados — mesmas chaves e mesmos padrões do app antigo.
import { ld, sv, ldg, svg, session } from '../lib/storage'
import type { Category, Tx, Recurrent, Installment, Goal, Alert, Pat, PatHist, Account, Card, InvPay, Transfer, Adj, Settings } from './types'

export const DEF_PF: Category[] = [
  { id: 'c1', name: 'Moradia', emoji: '🏠', budget: 0 }, { id: 'c2', name: 'Alimentação', emoji: '🍔', budget: 0 },
  { id: 'c3', name: 'Transporte', emoji: '🚗', budget: 0 }, { id: 'c4', name: 'Saúde', emoji: '💊', budget: 0 },
  { id: 'c5', name: 'Lazer', emoji: '🎬', budget: 0 }, { id: 'c6', name: 'Educação', emoji: '📚', budget: 0 },
  { id: 'c7', name: 'Vestuário', emoji: '👗', budget: 0 }, { id: 'c8', name: 'Investimentos', emoji: '📈', budget: 0 },
  { id: 'c9', name: 'Salário / Renda', emoji: '💰', budget: 0 }, { id: 'c10', name: 'Outros', emoji: '📦', budget: 0 },
]
export const DEF_PJ: Category[] = [
  { id: 'p1', name: 'Receita de Serviços', emoji: '💲', budget: 0 }, { id: 'p2', name: 'Impostos MEI/PJ', emoji: '🏛️', budget: 0 },
  { id: 'p3', name: 'Equipamentos', emoji: '💻', budget: 0 }, { id: 'p4', name: 'Marketing', emoji: '📣', budget: 0 },
  { id: 'p5', name: 'Contador', emoji: '🧾', budget: 0 }, { id: 'p6', name: 'Softwares', emoji: '🖥️', budget: 0 },
  { id: 'p7', name: 'Pró-labore', emoji: '👤', budget: 0 }, { id: 'p8', name: 'DAS/Guia', emoji: '📄', budget: 0 },
  { id: 'p9', name: 'Outros PJ', emoji: '📦', budget: 0 },
]

export const getCats = () => ld<Category[]>('cats', session.mode === 'pf' ? DEF_PF : DEF_PJ)
export const saveCats = (c: Category[]) => sv('cats', c)
export const getTxs = () => ld<Tx[]>('txs', [])
export const saveTxs = (t: Tx[]) => sv('txs', t)
export const getRecurrents = () => ld<Recurrent[]>('recs', [])
export const saveRecurrents = (r: Recurrent[]) => sv('recs', r)
export const getInstallments = () => ld<Installment[]>('insts', [])
export const saveInstallments = (i: Installment[]) => sv('insts', i)
export const getAlerts = () => ld<Alert[]>('alerts', [])
export const saveAlerts = (a: Alert[]) => sv('alerts', a)
export const getPlan = () => ld<Record<string, number>>('plan', {})
export const getPlanM = () => ld<Record<string, Record<string, number>>>('planm', {})
export const savePlanM = (p: Record<string, Record<string, number>>) => sv('planm', p)
export const getSettings = () => ld<Settings>('settings', {})
export const saveSettings = (s: Settings) => sv('settings', s)
export const getAccts = () => ld<Account[]>('accts', [])
export const saveAccts = (a: Account[]) => sv('accts', a)
export const getCards = () => ld<Card[]>('cards', [])
export const saveCards = (c: Card[]) => sv('cards', c)
export const getInvPays = () => ld<InvPay[]>('invpays', [])
export const saveInvPays = (p: InvPay[]) => sv('invpays', p)
export const getTransfers = () => ld<Transfer[]>('transfers', [])
export const saveTransfers = (t: Transfer[]) => sv('transfers', t)
export const getAdjs = () => ld<Adj[]>('adjs', [])
export const saveAdjs = (a: Adj[]) => sv('adjs', a)
// globais do usuário (não separados por PF/PJ, como no app antigo)
export const getGoals = () => ldg<Goal[]>('goals', [])
export const saveGoals = (g: Goal[]) => svg('goals', g)
export const getPats = () => ldg<Pat[]>('pats', [])
export const savePats = (p: Pat[]) => svg('pats', p)
export const getPatHist = () => ldg<PatHist[]>('patHist', [])
export const savePatHist = (h: PatHist[]) => svg('patHist', h)
