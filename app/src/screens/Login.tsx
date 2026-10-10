import { useState } from 'react'
import { Lock } from 'lucide-react'
import { getUsers, saveUsers, uid, type User } from '../lib/storage'
import { Button, Input, Segmented, Note, cx } from '../ui/kit'

const EMOJIS = ['😀', '😎', '🦊', '🐼', '🌸', '🚀', '💎', '🌙', '🔥', '🍀']
const COLORS = ['#5eead4', '#fbbf24', '#f87171', '#a78bfa', '#60a5fa', '#fb923c', '#34d399', '#e879f9', '#38bdf8', '#facc15']

// Senha: contas novas guardam só o hash SHA-256 com salt. Contas antigas (campo `pass` em btoa)
// continuam funcionando. Contas novas recebem `pass` impossível ('!…') para a /legacy/ não aceitar senha vazia.
// Contas antigas continuam funcionando e o campo antigo NÃO é alterado, para a versão /legacy/ seguir entrando.
export async function hashPass(pass: string, salt: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pass))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
type U = User & { passHash?: string; salt?: string }
async function checkPass(u: U, pass: string) { return u.passHash && u.salt ? (await hashPass(pass, u.salt)) === u.passHash : u.pass === btoa(unescape(encodeURIComponent(pass))) || u.pass === safeBtoa(pass) }
const safeBtoa = (s: string) => { try { return btoa(s) } catch { return '' } }

export function Login({ users, onLogin }: { users: User[]; onLogin: (u: User, isNew?: boolean) => void }) {
  const [tab, setTab] = useState<'login' | 'register'>(users.length ? 'login' : 'register')
  const [email, setEmail] = useState(''), [pass, setPass] = useState(''), [pass2, setPass2] = useState(''), [name, setName] = useState(''), [avatar, setAvatar] = useState(EMOJIS[0]), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const norm = (e: string) => e.trim().toLowerCase()
  const doLogin = async () => {
    setBusy(true); const u = getUsers().find(x => norm(x.email) === norm(email)) as U | undefined
    const ok = u && await checkPass(u, pass); setBusy(false)
    if (!u || !ok) return setErr('E-mail ou senha incorretos')
    onLogin(u)
  }
  const doRegister = async () => {
    if (!name.trim() || !email.trim()) return setErr('Preencha nome e e-mail')
    if (pass.length < 6) return setErr('Senha com pelo menos 6 caracteres')
    if (pass !== pass2) return setErr('As senhas não conferem')
    const all = getUsers(); if (all.find(x => norm(x.email) === norm(email))) return setErr('Já existe uma conta com este e-mail neste aparelho')
    setBusy(true); const salt = uid() + uid()
    const u: U = { id: uid(), name: name.trim(), email: email.trim(), pass: '!' + uid(), passHash: await hashPass(pass, salt), salt, avatar, createdAt: Date.now() }
    saveUsers([...all, u]); setBusy(false); onLogin(u, true)
  }
  const submit = () => tab === 'login' ? doLogin() : doRegister()
  return <div className="pt-safe flex min-h-dvh flex-col justify-center px-6 py-10">
    <div className="mb-8 text-center">
      <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="mx-auto mb-4 size-16 rounded-2xl" />
      <h1 className="font-display text-4xl font-bold">Finanças<span className="text-ok">Pro</span></h1>
      <p className="mt-1 text-sm text-tx3">Seu controle financeiro pessoal, simples e privado</p></div>
    {users.length > 0 && tab === 'login' && <div className="mb-5 flex flex-col gap-2">{users.map((u, i) =>
      <button key={u.id} onClick={() => { setEmail(u.email); setErr('') }} className={cx('flex items-center gap-3 rounded-2xl border bg-s1 p-3 text-left transition', email === u.email ? 'border-ok/50' : 'border-line')}>
        <span className="grid size-10 place-items-center rounded-xl text-xl" style={{ background: COLORS[i % COLORS.length] + '33' }}>{u.avatar}</span><span><b className="block text-sm">{u.name}</b><small className="text-tx3">{u.email}</small></span></button>)}</div>}
    <Segmented value={tab} onChange={v => { setTab(v); setErr('') }} options={[{ v: 'login', l: 'Entrar' }, { v: 'register', l: 'Criar conta' }]} />
    <div className="mt-4 flex flex-col gap-3">
      {tab === 'register' && <><Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
        <div className="flex flex-wrap gap-1.5">{EMOJIS.map(e => <button key={e} onClick={() => setAvatar(e)} className={cx('grid size-10 place-items-center rounded-xl border text-xl', avatar === e ? 'border-ok bg-ok/10' : 'border-line bg-s2')}>{e}</button>)}</div></>}
      <Input type="email" inputMode="email" placeholder="E-mail" autoComplete="username" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} />
      <Input type="password" placeholder="Senha" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && tab === 'login' && submit()} />
      {tab === 'register' && <Input type="password" placeholder="Repita a senha" autoComplete="new-password" value={pass2} onChange={e => setPass2(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />}
      {err && <div className="text-sm text-bad">{err}</div>}
      <Button variant="primary" disabled={busy} onClick={submit}>{tab === 'login' ? 'Entrar' : 'Criar conta'}</Button>
      {tab === 'register' && <Note><span className="flex gap-2"><Lock size={14} className="mt-0.5 shrink-0" /><span><b>Seus dados ficam só neste aparelho.</b> Nada vai para servidor, e ninguém — nem quem te indicou o app — consegue ver. Por isso, faça backup toda semana e anote a senha: ela não pode ser recuperada.</span></span></Note>}
    </div>
  </div>
}
