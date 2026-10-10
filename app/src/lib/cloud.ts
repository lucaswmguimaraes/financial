// Nuvem (Supabase) — sincronização "local primeiro".
// • O app continua lendo/gravando no localStorage (rápido e funciona offline).
// • Cada chave do usuário (ex.: pf_txs) vira uma linha em fin_docs, protegida por RLS.
// • Conflito entre aparelhos: itens são UNIDOS por id (nunca se apaga o que o outro lançou).
// • O servidor guarda toda versão anterior em fin_docs_history (trigger).
import { createClient } from '@supabase/supabase-js'
import { session, setWriteHook, touch } from './storage'

// Chave PUBLICÁVEL (feita para ficar no navegador). Quem protege os dados é o RLS.
export const supabase = createClient('https://wsoxlsrwodulrncpeoqd.supabase.co', 'sb_publishable_MMU7lGRgd7Gcj3EE83oJVA_RDN3GeLf',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
export const APP_URL = 'https://lucaswmguimaraes.github.io/financial/'

type Meta = Record<string, { at: number; dirty?: boolean }>
const metaKey = () => `fpsync_${session.userId}`
const readMeta = (): Meta => { try { return JSON.parse(localStorage.getItem(metaKey()) || '{}') } catch { return {} } }
const writeMeta = (m: Meta) => localStorage.setItem(metaKey(), JSON.stringify(m))
const localKey = (k: string) => `fp_${session.userId}_${k}`
const device = (() => { try { let d = localStorage.getItem('fp_device'); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('fp_device', d) } return d } catch { return 'x' } })()

export type SyncState = 'ok' | 'pending' | 'offline' | 'error'
let state: SyncState = 'ok'; let lastError = ''
export const syncInfo = () => ({ state, lastError })
const setState = (s: SyncState, e = '') => { if (s !== state || e !== lastError) { state = s; lastError = e; touch() } }

const timers: Record<string, ReturnType<typeof setTimeout>> = {}
function markDirty(k: string) {
  const m = readMeta(); m[k] = { at: m[k]?.at || 0, dirty: true }; writeMeta(m); setState('pending')
  clearTimeout(timers[k]); timers[k] = setTimeout(() => pushKey(k), 700)
}
export async function pushKey(k: string) {
  const raw = localStorage.getItem(localKey(k)); if (raw == null || !session.userId) return
  const at = Date.now()
  const { error } = await supabase.from('fin_docs').upsert({ key: k, data: JSON.parse(raw), updated_at: at, device })
  if (error) { setState(navigator.onLine ? 'error' : 'offline', error.message); return false }
  const m = readMeta(); m[k] = { at }; writeMeta(m)
  if (!Object.values(m).some(x => x.dirty)) setState('ok')
  return true
}
export async function pushAll() {
  const pre = localKey(''), keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith(pre)) keys.push(k.slice(pre.length)) }
  const m = readMeta(); keys.forEach(k => { m[k] = { at: m[k]?.at || 0, dirty: true } }); writeMeta(m)
  for (const k of keys) await pushKey(k)
}

/** Une duas versões sem perder nada: listas por id (a local vence no mesmo id), objetos campo a campo. */
export function mergeValues(remote: unknown, local: unknown): unknown {
  if (Array.isArray(remote) && Array.isArray(local)) {
    const byId = new Map<string, unknown>(); const extra: unknown[] = []
    for (const x of [...remote, ...local]) { const id = (x as { id?: string })?.id; if (id) byId.set(id, x); else if (!extra.some(e => JSON.stringify(e) === JSON.stringify(x))) extra.push(x) }
    return [...byId.values(), ...extra]
  }
  if (remote && local && typeof remote === 'object' && typeof local === 'object') return { ...(remote as object), ...(local as object) }
  return local ?? remote
}

/** Baixa da nuvem e reconcilia com o que está no aparelho. */
export async function pull() {
  if (!session.userId) return
  const { data, error } = await supabase.from('fin_docs').select('key,data,updated_at')
  if (error) { setState(navigator.onLine ? 'error' : 'offline', error.message); return }
  const m = readMeta(); let changed = false
  for (const row of data) {
    const k = row.key as string, lk = localKey(k), local = localStorage.getItem(lk), meta = m[k]
    if (meta && row.updated_at <= meta.at) continue // nada novo na nuvem
    if (local != null && meta?.dirty) { // mudou nos dois lados → une
      const merged = mergeValues(row.data, JSON.parse(local)); localStorage.setItem(lk, JSON.stringify(merged)); m[k] = { at: row.updated_at, dirty: true }
    } else if (local != null && !meta) { // aparelho tinha dado que nunca sincronizou → une também
      const merged = mergeValues(row.data, JSON.parse(local)); localStorage.setItem(lk, JSON.stringify(merged)); m[k] = { at: row.updated_at, dirty: JSON.stringify(merged) !== JSON.stringify(row.data) }
    } else { localStorage.setItem(lk, JSON.stringify(row.data)); m[k] = { at: row.updated_at } }
    changed = true
  }
  writeMeta(m); if (changed) touch()
  for (const [k, v] of Object.entries(m)) if (v.dirty) await pushKey(k)
  // chaves locais que a nuvem ainda não tem
  const pre = localKey(''), remoteKeys = new Set(data.map(r => r.key))
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith(pre) && !remoteKeys.has(k.slice(pre.length)) && !m[k.slice(pre.length)]) markDirty(k.slice(pre.length)) }
  if (!Object.values(readMeta()).some(x => x.dirty)) setState('ok')
}

let started = false
export function startSync() {
  setWriteHook(markDirty)
  if (started) return; started = true
  addEventListener('online', () => pull())
  addEventListener('offline', () => setState('offline'))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull() })
  setInterval(() => { if (document.visibilityState === 'visible') pull() }, 60_000)
}
export function stopSync() { setWriteHook(null) }

/** Confere a nuvem contra o aparelho (usado depois de importar). */
export async function cloudSummary() {
  const { data, error } = await supabase.from('fin_docs').select('key,data').in('key', ['pf_txs', 'pj_txs'])
  if (error) throw error
  const r: Record<string, { lanc: number; total: number }> = {}
  for (const row of data) { const t = row.data as { value: number }[]; r[row.key] = { lanc: t.length, total: t.reduce((a, x) => a + (+x.value || 0), 0) } }
  return r
}
