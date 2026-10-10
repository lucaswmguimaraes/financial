import { useState } from 'react'
import { getUsers, saveUsers, uid, type User } from '../lib/storage'
import { Button, Input, Segmented, cx } from '../ui/kit'

const EMOJIS = ['😀', '😎', '🦊', '🐼', '🌸', '🚀', '💎', '🌙', '🔥', '🍀']
const COLORS = ['#5eead4', '#fbbf24', '#f87171', '#a78bfa', '#60a5fa', '#fb923c', '#34d399', '#e879f9', '#38bdf8', '#facc15']

// Mesmo esquema de login do app antigo (senha em btoa, lista fp_users) para manter compatibilidade.
export function Login({ users, onLogin }: { users: User[]; onLogin: (u: User) => void }) {
  const [tab, setTab] = useState<'login' | 'register'>(users.length ? 'login' : 'register')
  const [email, setEmail] = useState(''), [pass, setPass] = useState(''), [name, setName] = useState(''), [avatar, setAvatar] = useState(EMOJIS[0]), [err, setErr] = useState('')
  const doLogin = () => { const u = getUsers().find(x => x.email === email.trim() && x.pass === btoa(pass)); if (!u) return setErr('E-mail ou senha incorretos'); onLogin(u) }
  const doRegister = () => {
    if (!name.trim() || !email.trim() || pass.length < 4) return setErr('Preencha todos (senha mín. 4 caracteres)')
    const all = getUsers(); if (all.find(x => x.email === email.trim())) return setErr('E-mail já cadastrado')
    const u: User = { id: uid(), name: name.trim(), email: email.trim(), pass: btoa(pass), avatar, createdAt: Date.now() }
    saveUsers([...all, u]); onLogin(u)
  }
  return <div className="pt-safe flex min-h-dvh flex-col justify-center px-6 py-10">
    <div className="mb-8 text-center"><h1 className="font-display text-4xl font-bold">Finanças<span className="text-ok">Pro</span></h1><p className="mt-1 text-sm text-tx3">Controle financeiro do casal, cada um no seu celular</p></div>
    {users.length > 0 && tab === 'login' && <div className="mb-5 flex flex-col gap-2">{users.map((u, i) =>
      <button key={u.id} onClick={() => { setEmail(u.email); setErr('') }} className={cx('flex items-center gap-3 rounded-2xl border bg-s1 p-3 text-left transition', email === u.email ? 'border-ok/50' : 'border-line')}>
        <span className="grid size-10 place-items-center rounded-xl text-xl" style={{ background: COLORS[i % COLORS.length] + '33' }}>{u.avatar}</span><span><b className="block text-sm">{u.name}</b><small className="text-tx3">{u.email}</small></span></button>)}</div>}
    <Segmented value={tab} onChange={v => { setTab(v); setErr('') }} options={[{ v: 'login', l: 'Entrar' }, { v: 'register', l: 'Criar conta' }]} />
    <div className="mt-4 flex flex-col gap-3">
      {tab === 'register' && <><Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">{EMOJIS.map(e => <button key={e} onClick={() => setAvatar(e)} className={cx('grid size-10 place-items-center rounded-xl border text-xl', avatar === e ? 'border-ok bg-ok/10' : 'border-line bg-s2')}>{e}</button>)}</div></>}
      <Input type="email" placeholder="E-mail" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
      <Input type="password" placeholder="Senha" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? doLogin() : doRegister())} />
      {err && <div className="text-sm text-bad">{err}</div>}
      <Button variant="primary" onClick={tab === 'login' ? doLogin : doRegister}>{tab === 'login' ? 'Entrar' : 'Criar conta'}</Button>
    </div>
  </div>
}
