import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { fmt, fmtK, sum } from '../lib/format'
import type { ReactNode } from 'react'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler)
ChartJS.defaults.font.family = 'DM Sans'
ChartJS.defaults.color = '#9aa0b4'
export const COLORS = ['#5eead4', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#34d399', '#e879f9', '#38bdf8', '#4ade80', '#facc15', '#f472b6']
const grid = { color: 'rgba(255,255,255,0.05)' }

export function Donut({ labels, data, colors = COLORS, height = 190 }: { labels: string[]; data: number[]; colors?: string[]; height?: number }) {
  const total = sum(data, x => x)
  return <div style={{ height }}><Doughnut plugins={[ChartDataLabels]} data={{ labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] }}
    options={{ maintainAspectRatio: false, cutout: '58%', layout: { padding: 4 }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${fmt(c.raw as number)} (${((c.raw as number) / total * 100).toFixed(1)}%)` } },
      datalabels: { color: '#0b0d12', font: { weight: 700, size: 11 }, formatter: (v: number) => v / total >= 0.07 ? Math.round(v / total * 100) + '%' : '' } } }} /></div>
}
export function Bars({ labels, sets, height = 220 }: { labels: string[]; sets: { label: string; data: number[]; color: string }[]; height?: number }) {
  return <div style={{ height }}><Bar plugins={[ChartDataLabels]} data={{ labels, datasets: sets.map(s => ({ label: s.label, data: s.data, backgroundColor: s.color, borderRadius: 5, borderSkipped: false })) }}
    options={{ maintainAspectRatio: false, layout: { padding: { top: 18 } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 9, font: { size: 11 } } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.raw as number)}` } },
      datalabels: { anchor: 'end', align: 'end', offset: 1, color: '#c9cdd9', font: { size: 9, weight: 600 }, formatter: (v: number) => v ? fmtK(v) : '' } },
      scales: { x: { grid: { display: false } }, y: { grid, ticks: { font: { size: 10 }, callback: v => 'R$' + fmtK(+v) } } } }} /></div>
}
export function Lines({ labels, sets, height = 220 }: { labels: string[]; sets: { label: string; data: number[]; color: string; dash?: boolean }[]; height?: number }) {
  return <div style={{ height }}><Line data={{ labels, datasets: sets.map(s => ({ label: s.label, data: s.data, borderColor: s.color, backgroundColor: s.color + '18', fill: !s.dash, tension: .35, pointRadius: 2.5, borderDash: s.dash ? [4, 3] : undefined })) }}
    options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 9, font: { size: 11 } } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.raw as number)}` } } },
      scales: { x: { grid: { display: false } }, y: { grid, ticks: { font: { size: 10 }, callback: v => 'R$' + fmtK(+v) } } } }} /></div>
}
/** Ranking com valor, % e barra — o "ver os números" de verdade. */
export function Rank({ rows, total }: { rows: { l: ReactNode; v: number; c?: string }[]; total?: number }) {
  const t = total ?? sum(rows, r => r.v), max = Math.max(...rows.map(r => r.v), 1)
  return <div className="flex flex-col gap-2.5">{rows.map((r, i) => {
    const c = r.c || COLORS[i % COLORS.length]
    return <div key={i} className="text-[13px]">
      <div className="flex items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ background: c }} /><span className="min-w-0 flex-1 truncate text-tx2">{r.l}</span><b className="num">{fmt(r.v)}</b><span className="num w-11 text-right text-[11px] text-tx3">{t ? (r.v / t * 100).toFixed(1).replace('.', ',') + '%' : ''}</span></div>
      <div className="ml-[18px] mt-1 h-1 overflow-hidden rounded-full bg-s3"><div className="h-full rounded-full" style={{ width: `${r.v / max * 100}%`, background: c }} /></div>
    </div>
  })}</div>
}
