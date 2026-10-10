export const fmt = (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtK = (v: number) => { const a = Math.abs(v); return (v < 0 ? '-' : '') + (a >= 1000 ? (a / 1000).toFixed(1).replace('.', ',') + 'k' : a.toFixed(0)) }
export const pct = (v: number, d = 1) => v.toFixed(d).replace('.', ',') + '%'
export const pad2 = (n: number) => String(n).padStart(2, '0')
export const isoLocal = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
export const todayStr = () => isoLocal(new Date())
export const fmtDate = (d: string) => new Date(d.slice(0, 10) + 'T12:00').toLocaleDateString('pt-BR')
export const fmtDateShort = (d: string) => new Date(d.slice(0, 10) + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')

// meses no formato 'YYYY-MM'
export const ymOf = (d: string | number | Date) => {
  const x = typeof d === 'string' ? new Date(d.slice(0, 10) + 'T12:00') : new Date(d)
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}`
}
export const ymAdd = (k: string, n: number) => { const [y, m] = k.split('-').map(Number); return ymOf(new Date(y, m - 1 + n, 1)) }
/** b - a, em meses */
export const ymDiff = (a: string, b: string) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma) }
export const todayYM = () => ymOf(new Date())
export const ymLabel = (k: string) => { const [y, m] = k.split('-').map(Number); const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1) }
export const ymShort = (k: string) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 15).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') }
export const dateIn = (k: string, day: number) => { const [y, m] = k.split('-').map(Number); const last = new Date(y, m, 0).getDate(); return `${k}-${pad2(Math.min(Math.max(day || 1, 1), last))}` }
export const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((s, x) => s + (+f(x) || 0), 0)
