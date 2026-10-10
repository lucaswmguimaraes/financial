// Backup, restauração, snapshots e migrações — mesmo formato de arquivo e mesmas
// chaves da v2, então backups gerados na versão antiga restauram aqui e vice-versa.
import { session, setMode, ldg, svg, touch } from '../lib/storage'
import { ymOf, ymAdd, todayYM, sum } from '../lib/format'
import * as R from './repo'
import { DEF_GROUP } from './logic'
import type { Mode } from '../lib/storage'

export const SCHEMA_VERSION = 2
const prefix = () => `fp_${session.userId}_`

export function collectUserData(): Record<string, string> {
  const pre = prefix(), data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith(pre)) data[k.slice(pre.length)] = localStorage.getItem(k)! }
  return data
}
export function summarize(data: Record<string, string>) {
  const r: Record<Mode, { lanc: number; receitas: number; despesas: number }> = {} as never
  ;(['pf', 'pj'] as Mode[]).forEach(m => {
    let t: { type: string; value: number }[] = []; try { t = JSON.parse(data[m + '_txs'] || '[]') } catch { /* vazio */ }
    r[m] = { lanc: t.length, receitas: sum(t.filter(x => x.type === 'income'), x => +x.value), despesas: sum(t.filter(x => x.type === 'expense'), x => +x.value) }
  })
  return r
}
export function takeSnapshot(reason: string) {
  try {
    const key = `fpbak_${session.userId}_${Date.now()}`
    localStorage.setItem(key, JSON.stringify({ reason, at: new Date().toISOString(), data: collectUserData() }))
    const mine = Object.keys(localStorage).filter(k => k.startsWith(`fpbak_${session.userId}_`)).sort()
    while (mine.length > 3) localStorage.removeItem(mine.shift()!) // só remove snapshots antigos, nunca dados
    return true
  } catch { return false }
}

function migrateV2() {
  const save = session.mode
  ;(['pf', 'pj'] as Mode[]).forEach(m => {
    setMode(m)
    R.saveCats(R.getCats().map(c => c.group !== undefined ? c : { ...c, group: DEF_GROUP[c.id] || (m === 'pj' ? 'pj' : null) }))
    const txs = R.getTxs()
    R.saveInstallments(R.getInstallments().map(i => {
      if (i.startYM) return i
      const first = txs.filter(t => t.installmentId === i.id).sort((a, b) => (a.instCurr || 0) - (b.instCurr || 0))[0]
      const startYM = first ? ymOf(first.date) : ymOf(i.createdAt)
      const firstNum = first?.instCurr || Math.max(1, i.total - i.remaining)
      const autoFromYM = [ymAdd(startYM, 1), todayYM()].sort()[1]
      return { ...i, startYM, firstNum, autoFromYM, legacy: true }
    }))
  })
  setMode(save)
}
/** Roda ao entrar. Snapshot antes; só adiciona campos. */
export function runMigrations(): string | null {
  const cur = ldg<number>('schema', 0)
  if (cur >= SCHEMA_VERSION) return null
  if (!takeSnapshot(`antes da migração v${cur}→v${SCHEMA_VERSION}`)) return 'Sem espaço para cópia de segurança — atualização adiada'
  if (cur < 2) migrateV2()
  svg('schema', SCHEMA_VERSION)
  return null
}

export async function exportBackup(userName: string) {
  const data = collectUserData()
  const payload = { app: 'financaspro', version: SCHEMA_VERSION, userId: session.userId, userName, exportedAt: new Date().toISOString(), summary: summarize(data), data }
  const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const name = `financaspro_backup_${userName.replace(/\W+/g, '_')}_${stamp}.json`
  const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' })
  svg('lastBackup', Date.now())
  try {
    const f = new File([blob], name, { type: 'application/json' })
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Backup FinançasPro' }); return 'shared' }
  } catch (e) { if ((e as Error).name === 'AbortError') return 'aborted' }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); return 'downloaded'
}

export interface BackupFile { app: string; userId: string; userName: string; exportedAt: string; data: Record<string, string> }
export function parseBackup(text: string): BackupFile | string {
  let b: BackupFile; try { b = JSON.parse(text) } catch { return 'Arquivo inválido' }
  if (b.app !== 'financaspro' || !b.data || typeof b.data !== 'object') return 'Não é um backup do FinançasPro'
  return b
}
/** Grava o backup SOMENTE no usuário logado, depois de snapshot. Retorna se a conferência bateu. */
export function restoreBackup(b: BackupFile) {
  if (!takeSnapshot('antes de restaurar backup')) throw new Error('Sem espaço para cópia de segurança — restauração cancelada')
  const pre = prefix()
  Object.keys(collectUserData()).forEach(k => localStorage.removeItem(pre + k))
  Object.entries(b.data).forEach(([k, v]) => localStorage.setItem(pre + k, v))
  const after = summarize(collectUserData()), inc = summarize(b.data)
  touch()
  return (['pf', 'pj'] as Mode[]).every(m => after[m].lanc === inc[m].lanc && Math.abs(after[m].despesas - inc[m].despesas) < 0.005 && Math.abs(after[m].receitas - inc[m].receitas) < 0.005)
}
export const lastBackupDays = () => { const l = ldg<number>('lastBackup', 0); return l ? Math.floor((Date.now() - l) / 864e5) : null }
