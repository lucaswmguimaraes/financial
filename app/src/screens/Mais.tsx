import { useApp } from '../app'
import { BookOpen, Repeat, CreditCard, Bell, Target, Telescope, Gem, Trophy, LineChart, FileBarChart, Tags, AlertTriangle, ShieldCheck, LogOut } from 'lucide-react'
import * as L from '../domain/logic'
import type { ReactNode } from 'react'
import { lastBackupDays } from '../domain/safety'

export function Mais() {
  const { go, logout, ym } = useApp()
  const bk = lastBackupDays(), pc = L.pendingCount(ym)
  const Item = ({ r, icon, label, sub, color }: { r: string; icon: ReactNode; label: string; sub?: ReactNode; color: string }) =>
    <button onClick={() => go(r)} className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-s1 p-3.5 text-left active:scale-[.98] transition">
      <span className="grid size-9 place-items-center rounded-xl" style={{ background: color + '22', color }}>{icon}</span>
      <span><b className="block text-sm">{label}</b>{sub && <small className="text-[11px] text-tx3">{sub}</small>}</span></button>
  return <div>
    <button onClick={() => go('guia')} className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-ok/30 bg-gradient-to-br from-ok/15 to-info/10 p-4 text-left">
      <span className="grid size-11 place-items-center rounded-xl bg-ok/20 text-ok"><BookOpen size={22} /></span>
      <span className="flex-1"><b className="block">Guia de Uso</b><small className="text-xs text-tx2">Rotina, padrões de cadastro, mapa de categorias e checklist</small></span></button>
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tx3">Organizar</div>
    <div className="grid grid-cols-2 gap-2.5">
      <Item r="recorrentes" icon={<Repeat size={18} />} label="Recorrentes" sub={pc ? `${pc} pendente(s) no mês` : 'contas fixas'} color="#a78bfa" />
      <Item r="parcelamentos" icon={<CreditCard size={18} />} label="Parcelamentos" sub="compras parceladas" color="#60a5fa" />
      <Item r="vencimentos" icon={<Bell size={18} />} label="Vencimentos" sub="próximos 30 dias" color="#fb923c" />
      <Item r="planejamento" icon={<Target size={18} />} label="Planejamento" sub="orçamento do mês" color="#5eead4" />
      <Item r="categorias" icon={<Tags size={18} />} label="Categorias" sub="e grupos 50-30-20" color="#fbbf24" />
      <Item r="alertas" icon={<AlertTriangle size={18} />} label="Alertas" sub="limites por categoria" color="#f87171" />
    </div>
    <div className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-tx3">Acompanhar</div>
    <div className="grid grid-cols-2 gap-2.5">
      <Item r="futuro" icon={<Telescope size={18} />} label="Visão Futura" sub="6 meses à frente" color="#38bdf8" />
      <Item r="historico" icon={<LineChart size={18} />} label="Histórico" sub="12 meses" color="#34d399" />
      <Item r="relatorio" icon={<FileBarChart size={18} />} label="Relatório" sub="mês e ano" color="#e879f9" />
      <Item r="patrimonio" icon={<Gem size={18} />} label="Patrimônio" sub="bolsões e reserva" color="#a78bfa" />
      <Item r="metas" icon={<Trophy size={18} />} label="Metas" sub="objetivos" color="#facc15" />
      <Item r="config" icon={<ShieldCheck size={18} />} label="Backup & Conta" sub={bk === null ? <span className="text-warn">nenhum backup</span> : bk >= 7 ? <span className="text-warn">há {bk} dias</span> : `há ${bk} dia(s)`} color="#5eead4" />
    </div>
    <button onClick={logout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3 text-sm text-tx3"><LogOut size={16} /> Sair</button>
  </div>
}
