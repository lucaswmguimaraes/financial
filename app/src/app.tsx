import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Home, List, Plus, Landmark, LayoutGrid, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import { session, setMode, setUser, useStoreVersion, getUsers, ldg, type Mode, type User } from './lib/storage'
import { todayYM, ymAdd, ymLabel } from './lib/format'
import { runMigrations, lastBackupDays } from './domain/safety'
import { cx, toast, Toaster } from './ui/kit'
import { Login } from './screens/Login'
import { Dashboard } from './screens/Dashboard'
import { Lancamentos } from './screens/Lancamentos'
import { TxSheet } from './screens/TxSheet'
import { BatchSheet } from './screens/BatchSheet'
import { Contas } from './screens/Contas'
import { Mais } from './screens/Mais'
import { Recorrentes, Parcelamentos, Vencimentos, Futuro } from './screens/Agenda'
import { Planejamento } from './screens/Planejamento'
import { Categorias } from './screens/Categorias'
import { Patrimonio, Metas } from './screens/Patrimonio'
import { Historico, Relatorio, Alertas } from './screens/Analise'
import { Guia } from './screens/Guia'
import { Config } from './screens/Config'

export const ROUTES: Record<string, { title: string; el: () => ReactNode; tab?: string }> = {
  inicio: { title: 'Início', el: () => <Dashboard />, tab: 'inicio' },
  lancamentos: { title: 'Lançamentos', el: () => <Lancamentos />, tab: 'lancamentos' },
  contas: { title: 'Contas & Cartões', el: () => <Contas />, tab: 'contas' },
  mais: { title: 'Mais', el: () => <Mais />, tab: 'mais' },
  recorrentes: { title: 'Recorrentes', el: () => <Recorrentes /> },
  parcelamentos: { title: 'Parcelamentos', el: () => <Parcelamentos /> },
  vencimentos: { title: 'Vencimentos', el: () => <Vencimentos /> },
  planejamento: { title: 'Planejamento', el: () => <Planejamento /> },
  futuro: { title: 'Visão Futura', el: () => <Futuro /> },
  patrimonio: { title: 'Patrimônio', el: () => <Patrimonio /> },
  metas: { title: 'Metas', el: () => <Metas /> },
  historico: { title: 'Histórico', el: () => <Historico /> },
  relatorio: { title: 'Relatório', el: () => <Relatorio /> },
  categorias: { title: 'Categorias', el: () => <Categorias /> },
  alertas: { title: 'Alertas', el: () => <Alertas /> },
  guia: { title: 'Guia de Uso', el: () => <Guia /> },
  config: { title: 'Backup & Conta', el: () => <Config /> },
}

interface Ctx { user: User; ym: string; setYm: (k: string) => void; go: (r: string) => void; route: string; openTx: (id?: string) => void; openBatch: () => void; logout: () => void }
const AppCtx = createContext<Ctx>(null as never)
export const useApp = () => { useStoreVersion(); return useContext(AppCtx) }

const routeFromHash = () => { const r = location.hash.replace(/^#\/?/, ''); return ROUTES[r] ? r : 'inicio' }

export function App() {
  useStoreVersion()
  const [user, setU] = useState<User | null>(null)
  const [ym, setYm] = useState(todayYM())
  const [route, setRoute] = useState(routeFromHash())
  const [tx, setTx] = useState<{ open: boolean; id?: string }>({ open: false })
  const [batch, setBatch] = useState(false)
  useEffect(() => { const f = () => { setRoute(routeFromHash()); window.scrollTo(0, 0) }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])

  const login = (u: User, isNew?: boolean) => {
    setUser(u.id); setMode('pf'); setU(u); setYm(todayYM())
    try { navigator.storage?.persist?.() } catch { /* opcional */ }
    const err = runMigrations(); if (err) toast(err, 'bad')
    const d = lastBackupDays(); if (d === null || d >= 7) setTimeout(() => toast('Faça um backup 💾 (Mais → Backup & Conta)', 'bad'), 1200)
    location.hash = isNew ? '#/guia' : '#/inicio'
    if (isNew) setTimeout(() => toast('Bem-vindo! Comece pelo checklist do Guia 👇'), 400)
  }
  const logout = () => { setUser(null); setU(null) }
  if (!user || !session.userId) return <><Toaster /><Login users={getUsers()} onLogin={login} /></>

  const ctx: Ctx = { user, ym, setYm, route, go: r => { location.hash = '#/' + r }, openTx: id => setTx({ open: true, id }), openBatch: () => setBatch(true), logout }
  const R = ROUTES[route], isTab = !!R.tab
  return <AppCtx.Provider value={ctx}>
    <Toaster />
    <Header title={R.title} back={!isTab} />
    <main key={route + session.mode} className="anim-pop px-4 pb-28 pt-3">{R.el()}</main>
    <TabBar />
    <TxSheet open={tx.open} id={tx.id} onClose={() => setTx({ open: false })} />
    <BatchSheet open={batch} onClose={() => setBatch(false)} />
  </AppCtx.Provider>
}

function Header({ title, back }: { title: string; back: boolean }) {
  const { ym, setYm, user } = useApp()
  const m = session.mode, bk = lastBackupDays()
  return <header className="pt-safe sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
    <div className="flex items-center gap-2 px-4 pb-2 pt-3">
      {back ? <button onClick={() => history.back()} className="grid size-9 place-items-center rounded-xl bg-s2 text-tx2"><ArrowLeft size={18} /></button>
        : <div className="grid size-9 place-items-center rounded-xl bg-s2 text-lg">{user.avatar}</div>}
      <div className="min-w-0 flex-1"><h1 className="truncate font-display text-[22px] font-semibold leading-tight">{title}</h1>
        <div className="text-[11px] text-tx3">{user.name}{bk !== null && bk >= 7 ? <span className="text-warn"> • backup há {bk} dias</span> : null}</div></div>
      <div className="flex rounded-xl border border-line bg-s2 p-0.5 text-xs font-bold">
        {(['pf', 'pj'] as Mode[]).map(x => <button key={x} onClick={() => setMode(x)} className={cx('rounded-lg px-2.5 py-1.5 transition', m === x ? (x === 'pf' ? 'bg-ok text-bg' : 'bg-pj text-bg') : 'text-tx3')}>{x.toUpperCase()}</button>)}
      </div>
    </div>
    <div className="flex items-center justify-between px-3 pb-2">
      <button onClick={() => setYm(ymAdd(ym, -1))} className="grid size-8 place-items-center rounded-lg text-tx2 active:bg-s2"><ChevronLeft size={18} /></button>
      <button onClick={() => setYm(todayYM())} className="text-sm font-semibold">{ymLabel(ym)}{ym !== todayYM() && <span className="ml-1.5 text-[10px] font-normal text-ok">voltar a hoje</span>}</button>
      <button onClick={() => setYm(ymAdd(ym, 1))} className="grid size-8 place-items-center rounded-lg text-tx2 active:bg-s2"><ChevronRight size={18} /></button>
    </div>
  </header>
}

function TabBar() {
  const { route, go, openTx } = useApp()
  const tab = ROUTES[route].tab || 'mais'
  const T = ({ id, icon, label }: { id: string; icon: ReactNode; label: string }) =>
    <button onClick={() => go(id)} className={cx('flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition', tab === id ? 'text-ok' : 'text-tx3')}>{icon}{label}</button>
  return <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] border-t border-line bg-s1/90 backdrop-blur-xl">
    <div className="flex items-end px-2 pt-1.5">
      <T id="inicio" icon={<Home size={21} />} label="Início" />
      <T id="lancamentos" icon={<List size={21} />} label="Lançamentos" />
      <div className="flex flex-1 justify-center"><button aria-label="Novo lançamento" onClick={() => openTx()} className={cx('-mt-6 grid size-14 place-items-center rounded-2xl text-bg shadow-lg shadow-ok/20 active:scale-90 transition', session.mode === 'pf' ? 'bg-ok' : 'bg-pj')}><Plus size={26} strokeWidth={2.6} /></button></div>
      <T id="contas" icon={<Landmark size={21} />} label="Contas" />
      <T id="mais" icon={<LayoutGrid size={21} />} label="Mais" />
    </div>
  </nav>
}
export { ldg }
