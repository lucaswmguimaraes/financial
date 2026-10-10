import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { fmt } from '../lib/format'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={cx('rounded-2xl border border-line bg-s1 p-4', onClick && 'cursor-pointer active:scale-[.99] transition', className)}>{children}</div>
}
export function Title({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return <div className={cx('mb-2.5 mt-5 flex items-center justify-between gap-2', className)}><h2 className="text-[11px] font-semibold uppercase tracking-[.08em] text-tx3">{children}</h2>{right}</div>
}
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft'; size?: 'sm' | 'md' }
export function Button({ variant = 'soft', size = 'md', className, ...p }: BtnProps) {
  return <button {...p} className={cx('inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition active:scale-95 disabled:opacity-40',
    size === 'sm' ? 'h-8 px-3 text-xs' : 'h-11 px-4 text-sm',
    variant === 'primary' && 'bg-ok text-bg', variant === 'soft' && 'border border-line2 bg-s2 text-tx', variant === 'ghost' && 'text-tx2', variant === 'danger' && 'bg-bad/15 text-bad', className)} />
}
export function IconBtn({ className, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={cx('grid size-9 place-items-center rounded-xl border border-line bg-s2 text-tx2 active:scale-90 transition', className)} />
}
export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return <label className={cx('mb-3 block', className)}><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-tx3">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-tx3">{hint}</span>}</label>
}
const inputCls = 'w-full rounded-xl border border-line2 bg-s2 px-3.5 py-2.5 text-tx outline-none placeholder:text-tx3 focus:border-ok/60'
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, 'appearance-none', p.className)} />
export const Money = ({ v, className, sign }: { v: number; className?: string; sign?: boolean }) => <span className={cx('num', className)}>{sign && v > 0 ? '+' : ''}{fmt(v)}</span>

export function Progress({ value, max = 100, color = 'var(--color-ok)', mark }: { value: number; max?: number; color?: string; mark?: number }) {
  const w = max > 0 ? Math.min(100, Math.max(0, value / max * 100)) : 0
  return <div className="relative h-2 overflow-hidden rounded-full bg-s3"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${w}%`, background: color }} />{mark !== undefined && <div className="absolute inset-y-0 w-0.5 bg-white/40" style={{ left: `${mark}%` }} />}</div>
}
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: ReactNode }[]; onChange: (v: T) => void }) {
  return <div className="flex rounded-xl border border-line bg-s2 p-1">{options.map(o => <button key={o.v} type="button" onClick={() => onChange(o.v)} className={cx('flex-1 rounded-lg py-2 text-sm font-semibold transition', value === o.v ? 'bg-s3 text-tx shadow' : 'text-tx3')}>{o.l}</button>)}</div>
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 py-1.5 text-left text-sm text-tx2">
    <span>{label}</span><span className={cx('relative h-6 w-10 shrink-0 rounded-full transition', checked ? 'bg-ok' : 'bg-s3')}><span className={cx('absolute top-0.5 size-5 rounded-full bg-white transition-all', checked ? 'left-[18px]' : 'left-0.5')} /></span></button>
}
export const Empty = ({ children }: { children: ReactNode }) => <div className="rounded-2xl border border-dashed border-line2 px-4 py-8 text-center text-sm text-tx3">{children}</div>
export const Note = ({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'ok' }) =>
  <div className={cx('rounded-xl border-l-[3px] bg-s2 px-3 py-2 text-xs leading-relaxed', tone === 'info' && 'border-info text-tx2', tone === 'warn' && 'border-warn text-warn', tone === 'ok' && 'border-ok text-tx2')}>{children}</div>

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => { if (!open) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o } }, [open])
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center">
    <div className="anim-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
    <div className="anim-sheet relative flex max-h-[92dvh] w-full max-w-[430px] flex-col rounded-t-3xl border-t border-line2 bg-s1">
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-s3" />
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3"><h3 className="font-display text-xl font-semibold">{title}</h3><IconBtn onClick={onClose} aria-label="Fechar"><X size={16} /></IconBtn></div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-4">{children}</div>
      {footer && <div className="pb-safe flex gap-2 border-t border-line px-5 pt-3">{footer}</div>}
    </div>
  </div>
}

// toast global simples
let pushToast: (m: string, tone?: 'ok' | 'bad') => void = () => {}
export const toast = (m: string, tone: 'ok' | 'bad' = 'ok') => pushToast(m, tone)
export function Toaster() {
  const [t, setT] = useState<{ m: string; tone: string; id: number } | null>(null)
  useEffect(() => { pushToast = (m, tone = 'ok') => { const id = Date.now(); setT({ m, tone, id }); setTimeout(() => setT(x => x?.id === id ? null : x), 3200) } }, [])
  if (!t) return null
  return <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-[60] flex justify-center px-4"><div key={t.id} className={cx('anim-pop max-w-[400px] rounded-2xl border bg-s2/95 px-4 py-3 text-sm shadow-2xl backdrop-blur', t.tone === 'bad' ? 'border-bad/40' : 'border-ok/40')}>{t.tone === 'bad' ? '⚠️ ' : '✓ '}{t.m}</div></div>
}

export const Stat = ({ label, value, sub, tone, onClick, icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'bad' | 'info' | 'pur' | 'warn'; onClick?: () => void; icon?: ReactNode }) =>
  <Card onClick={onClick} className="relative overflow-hidden !p-3.5">
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-tx3">{icon}{label}</div>
    <div className={cx('num mt-1 font-display text-[22px] font-semibold leading-tight', tone === 'ok' && 'text-ok', tone === 'bad' && 'text-bad', tone === 'info' && 'text-info', tone === 'pur' && 'text-pur', tone === 'warn' && 'text-warn')}>{value}</div>
    {sub && <div className="mt-0.5 text-[11px] leading-snug text-tx3">{sub}</div>}
  </Card>
