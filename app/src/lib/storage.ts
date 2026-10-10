// Camada de armazenamento — COMPATÍVEL com o app antigo (index.html v1/v2).
// As chaves são exatamente as mesmas:
//   fp_users                       lista de usuários
//   fp_<userId>_<pf|pj>_<chave>    dados por usuário e por modo
//   fp_<userId>_<chave>            dados globais do usuário (metas, patrimônio, schema…)
//   fpbak_<userId>_<timestamp>     cópias de segurança automáticas
// Regra: nunca renomear nem apagar chaves existentes; migrações só ADICIONAM campos.
import { useSyncExternalStore } from 'react'

export type Mode = 'pf' | 'pj'
export interface User { id: string; name: string; email: string; pass: string; avatar: string; createdAt: number }

let userId: string | null = null
let mode: Mode = 'pf'
let version = 0
const listeners = new Set<() => void>()
const emit = () => { version++; listeners.forEach(l => l()) }

export const session = {
  get userId() { return userId },
  get mode() { return mode },
}
export function setUser(id: string | null) { userId = id; emit() }
export function setMode(m: Mode) { mode = m; emit() }
export function touch() { emit() }

/** Re-renderiza o componente sempre que algo for gravado. */
export function useStoreVersion() {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l) }, () => version)
}

const need = () => { if (!userId) throw new Error('sem usuário logado'); return userId }
export const UK = (k: string, m: Mode = mode) => `fp_${need()}_${m}_${k}`
export const GK = (k: string) => `fp_${need()}_${k}`

function read<T>(key: string, d: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : d } catch { return d }
}
function write(key: string, v: unknown) { localStorage.setItem(key, JSON.stringify(v)); emit() }

export const ld = <T,>(k: string, d: T, m: Mode = mode) => read<T>(UK(k, m), d)
export const sv = (k: string, v: unknown, m: Mode = mode) => write(UK(k, m), v)
export const ldg = <T,>(k: string, d: T) => read<T>(GK(k), d)
export const svg = (k: string, v: unknown) => write(GK(k), v)

export const getUsers = () => read<User[]>('fp_users', [])
export const saveUsers = (u: User[]) => write('fp_users', u)

export const uid = () => '_' + Math.random().toString(36).substr(2, 9)
