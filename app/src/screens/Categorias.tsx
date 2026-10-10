import { useState } from 'react'
import { Pencil, Archive, RotateCcw, Trash2, Plus } from 'lucide-react'
import { session, uid } from '../lib/storage'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import type { Category, Group } from '../domain/types'
import { Card, Title, Button, Sheet, Field, Input, Select, Note, toast, cx } from '../ui/kit'

export function Categorias() {
  const cats = R.getCats(), txs = R.getTxs(), pf = session.mode === 'pf'
  const [ed, setEd] = useState<Partial<Category> | null>(null)
  const used = (id: string) => txs.filter(t => t.cat === id).length + R.getRecurrents().filter(r => r.cat === id).length + R.getInstallments().filter(i => i.cat === id).length
  const groups: (Group | 'none')[] = pf ? ['nec', 'des', 'inv', 'rec', 'none'] : ['pj', 'rec', 'none']
  const save = () => {
    if (!ed?.name?.trim()) return toast('Digite o nome', 'bad'); if (!ed.group) return toast('Escolha o grupo', 'bad')
    const all = R.getCats(), data = { name: ed.name.trim(), emoji: ed.emoji || '📦', budget: +(ed.budget || 0), group: ed.group }
    R.saveCats(ed.id ? all.map(c => c.id === ed.id ? { ...c, ...data } : c) : [...all, { id: uid(), ...data }]); toast(ed.id ? 'Atualizada — lançamentos antigos acompanham' : 'Criada'); setEd(null)
  }
  const del = (c: Category) => {
    const n = used(c.id)
    if (n) { if (!confirm(`“${c.name}” está em uso (${n} registro(s)). Ela será ARQUIVADA: some das opções, mas o histórico fica intacto. Continuar?`)) return; R.saveCats(R.getCats().map(x => x.id === c.id ? { ...x, archived: true } : x)); toast('Arquivada') }
    else { if (!confirm(`Excluir “${c.name}”? (não há lançamentos nela)`)) return; R.saveCats(R.getCats().filter(x => x.id !== c.id)); toast('Excluída') }
  }
  const Row = ({ c }: { c: Category }) => <div className={cx('flex items-center gap-3 border-b border-line py-2.5 last:border-0', c.archived && 'opacity-50')}>
    <span className="grid size-10 place-items-center rounded-xl bg-s2 text-lg">{c.emoji}</span>
    <span className="min-w-0 flex-1"><b className="block truncate text-sm">{c.name}</b><small className="text-[11px] text-tx3">{used(c.id)} lanç.{c.budget ? ` · limite padrão R$ ${c.budget}` : ''}</small></span>
    <button aria-label="Editar" onClick={() => setEd(c)} className="p-1.5 text-tx2"><Pencil size={15} /></button>
    {c.archived ? <button aria-label="Reativar" onClick={() => R.saveCats(R.getCats().map(x => x.id === c.id ? { ...x, archived: false } : x))} className="p-1.5 text-ok"><RotateCcw size={15} /></button>
      : <button aria-label="Excluir ou arquivar" onClick={() => del(c)} className="p-1.5 text-tx3">{used(c.id) ? <Archive size={15} /> : <Trash2 size={15} />}</button>}
  </div>
  return <div>
    {pf && <Note>📐 <b>Regra 50-30-20:</b> cada categoria pertence a um grupo. É assim que o app sabe se um gasto é Necessidade (50%), Desejo (30%) ou Investimento (20%). Dúvidas sobre onde encaixar? Veja o Mapa de Categorias no Guia.</Note>}
    <Button variant="primary" className="mt-3 w-full" onClick={() => setEd({ emoji: '📦', group: pf ? 'nec' : 'pj' })}><Plus size={16} /> Nova categoria</Button>
    {groups.map(g => {
      const list = cats.filter(c => !c.archived && (g === 'none' ? !c.group : c.group === g)); if (!list.length) return null
      const G = g === 'none' ? null : L.GROUPS[g]
      return <div key={g}><Title>{G ? `${G.e} ${G.l}${G.t ? ` · ${G.t}%` : ''}` : <span className="text-warn">⚠ Sem grupo — defina para entrar no 50-30-20</span>}</Title>
        {G && <p className="-mt-1 mb-2 text-[11px] text-tx3">{G.hint}</p>}<Card className="!py-0">{list.map(c => <Row key={c.id} c={c} />)}</Card></div>
    })}
    {cats.some(c => c.archived) && <><Title>🗄️ Arquivadas (histórico preservado)</Title><Card className="!py-0">{cats.filter(c => c.archived).map(c => <Row key={c.id} c={c} />)}</Card></>}
    <Sheet open={!!ed} onClose={() => setEd(null)} title={ed?.id ? 'Editar categoria' : 'Nova categoria'} footer={<Button variant="primary" className="flex-1" onClick={save}>Salvar</Button>}>
      {ed && <><div className="grid grid-cols-[72px_1fr] gap-2.5"><Field label="Emoji"><Input value={ed.emoji || ''} maxLength={2} className="text-center" onChange={e => setEd({ ...ed, emoji: e.target.value })} /></Field><Field label="Nome"><Input value={ed.name || ''} placeholder="Ex: Pet" onChange={e => setEd({ ...ed, name: e.target.value })} /></Field></div>
        <Field label="Grupo"><Select value={ed.group || ''} onChange={e => setEd({ ...ed, group: e.target.value as Group })}>{!ed.group && <option value="">— escolha —</option>}{(Object.keys(L.GROUPS) as Group[]).filter(k => pf ? k !== 'pj' : true).map(k => <option key={k} value={k}>{L.GROUPS[k].e} {L.GROUPS[k].l}{L.GROUPS[k].t ? ` (${L.GROUPS[k].t}%)` : ''}</option>)}</Select></Field>
        {ed.group && <div className="-mt-1 mb-3 text-xs text-tx3">{L.GROUPS[ed.group].hint}</div>}
        <Field label="Limite mensal padrão (opcional)" hint="Usado quando o mês não tem orçamento próprio."><Input type="number" inputMode="decimal" value={ed.budget || ''} onChange={e => setEd({ ...ed, budget: e.target.value as never })} /></Field></>}
    </Sheet>
  </div>
}
