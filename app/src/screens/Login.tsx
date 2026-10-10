import { useState } from 'react'
import { Lock, Mail, User as UserIcon, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase, APP_URL } from '../lib/cloud'
import { Button, Input, Note, cx } from '../ui/kit'

const EMOJIS = ['😀', '😎', '🦊', '🐼', '🌸', '🚀', '💎', '🌙', '🔥', '🍀']
const ERR: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar — veja a caixa de entrada (e o spam).',
  'User already registered': 'Já existe uma conta com este e-mail. Entre ou recupere a senha.',
}
const tr = (m: string) => ERR[m] || (/rate limit/i.test(m) ? 'Muitas tentativas agora. Aguarde alguns minutos.' : /at least 6/i.test(m) ? 'A senha precisa de pelo menos 6 caracteres.' : m)

// Senha das contas antigas (só deste aparelho) — usada para autorizar a importação.
export async function hashPass(pass: string, salt: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pass))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
const safeBtoa = (s: string) => { try { return btoa(s) } catch { return '' } }
export async function checkLocalPass(u: { pass: string; passHash?: string; salt?: string }, pass: string) {
  return u.passHash && u.salt ? (await hashPass(pass, u.salt)) === u.passHash : u.pass === safeBtoa(pass)
}

type Mode = 'login' | 'signup' | 'forgot' | 'newpass'
export function Login({ recovery, onRecovered }: { recovery?: boolean; onRecovered?: () => void }) {
  const [mode, setMode] = useState<Mode>(recovery ? 'newpass' : 'login')
  const [email, setEmail] = useState(''), [pass, setPass] = useState(''), [name, setName] = useState(''), [avatar, setAvatar] = useState(EMOJIS[0])
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const go = (m: Mode) => { setMode(m); setMsg(null) }
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(null); try { await fn() } catch (e) { setMsg({ ok: false, t: tr((e as Error).message) }) } setBusy(false) }
  const actions: Record<Mode, () => Promise<void>> = {
    login: async () => { const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass }); if (error) throw error },
    signup: async () => {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pass, options: { emailRedirectTo: APP_URL, data: { name: name.trim(), avatar } } })
      if (error) throw error
      if (!data.session) setMsg({ ok: true, t: `Conta criada! Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail (veja o spam) e depois entre aqui.` })
    },
    forgot: async () => { const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: APP_URL }); if (error) throw error; setMsg({ ok: true, t: 'Se existir uma conta com este e-mail, você vai receber um link para criar uma nova senha.' }) },
    newpass: async () => { const { error } = await supabase.auth.updateUser({ password: pass }); if (error) throw error; onRecovered?.() },
  }
  const validEmail = /\S+@\S+\.\S+/.test(email)
  const can = { login: validEmail && pass.length >= 6, signup: validEmail && pass.length >= 6 && !!name.trim(), forgot: validEmail, newpass: pass.length >= 6 }[mode]
  const submit = () => { if (can && !busy) run(actions[mode]) }
  return <form onSubmit={e => { e.preventDefault(); submit() }} className="pt-safe flex min-h-dvh flex-col justify-center px-6 py-10">
    <div className="mb-8 text-center">
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="mx-auto mb-4 size-16 rounded-2xl" />
      <h1 className="font-display text-4xl font-bold">Finanças<span className="text-ok">Pro</span></h1>
      <p className="mt-1 text-sm text-tx3">{{ login: 'Entre para ver suas finanças', signup: 'Crie sua conta', forgot: 'Recuperar senha', newpass: 'Defina sua nova senha' }[mode]}</p></div>
    {(mode === 'signup' || mode === 'forgot') && <button type="button" onClick={() => go('login')} className="mb-3 flex items-center gap-1 text-sm text-tx3"><ArrowLeft size={14} /> Voltar</button>}
    <div className="flex flex-col gap-3">
      {mode === 'signup' && <><div className="relative"><UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3" /><Input className="!pl-9" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></div>
        <div className="flex flex-wrap gap-1.5">{EMOJIS.map(e => <button type="button" key={e} onClick={() => setAvatar(e)} className={cx('grid size-10 place-items-center rounded-xl border text-xl', avatar === e ? 'border-ok bg-ok/10' : 'border-line bg-s2')}>{e}</button>)}</div></>}
      {mode !== 'newpass' && <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3" /><Input className="!pl-9" type="email" inputMode="email" autoCapitalize="none" placeholder="E-mail" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>}
      {mode !== 'forgot' && <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3" /><Input className="!pl-9" type="password" placeholder={mode === 'newpass' ? 'Nova senha (mín. 6)' : 'Senha (mín. 6)'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={pass} onChange={e => setPass(e.target.value)} /></div>}
      {msg && <div className={cx('rounded-xl border px-3 py-2.5 text-sm leading-relaxed', msg.ok ? 'border-ok/30 bg-ok/5 text-ok' : 'border-bad/30 bg-bad/5 text-bad')}>{msg.t}</div>}
      <Button type="submit" variant="primary" disabled={!can || busy}>{busy && <Loader2 size={16} className="animate-spin" />}{{ login: 'Entrar', signup: 'Criar conta', forgot: 'Enviar link de recuperação', newpass: 'Salvar nova senha' }[mode]}</Button>
      {mode === 'login' && <div className="flex justify-between text-sm"><button type="button" onClick={() => go('forgot')} className="p-1 text-tx2">Esqueci minha senha</button><button type="button" onClick={() => go('signup')} className="p-1 font-semibold text-ok">Criar conta</button></div>}
      {mode === 'signup' && <Note><span className="flex gap-2"><Lock size={14} className="mt-0.5 shrink-0" /><span>Seus dados ficam na sua conta, protegidos: só você acessa — nem quem te indicou o app consegue ver. Funciona em qualquer celular, e uma cópia fica no aparelho para usar sem internet.</span></span></Note>}
      {mode === 'login' && <p className="mt-2 text-center text-[11px] text-tx3">Já usava o app antes? Crie a conta com seu e-mail — os dados deste celular são importados com conferência no primeiro acesso.</p>}
    </div>
  </form>
}
