// Importa os dados de uma conta ANTIGA deste aparelho (fp_<idAntigo>_*) para a conta na nuvem.
// Regras: exige a senha antiga; mostra os totais antes; gera snapshot; NÃO apaga nem altera as
// chaves antigas; une (nunca sobrescreve) se a conta na nuvem já tiver algo; confere a nuvem no final.
import { useState } from 'react'
import { getUsers, session, touch } from '../lib/storage'
import { pushAll, cloudSummary, mergeValues } from '../lib/cloud'
import { fmt } from '../lib/format'
import { summarize, takeSnapshot, runMigrations } from '../domain/safety'
import { checkLocalPass } from './Login'
import { Sheet, Button, Input, Note, toast, cx } from '../ui/kit'

export const importedKey = (oldId: string) => `fpimported_${oldId}`
export function localAccounts() {
  return getUsers().filter(u => u.id !== session.userId && !localStorage.getItem(importedKey(u.id)) && Object.keys(localStorage).some(k => k.startsWith(`fp_${u.id}_`) && k.endsWith('_txs')))
}
const dataOf = (id: string) => { const pre = `fp_${id}_`, d: Record<string, string> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith(pre)) d[k.slice(pre.length)] = localStorage.getItem(k)! } return d }

export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accounts = localAccounts()
  const [sel, setSel] = useState(''), [pass, setPass] = useState(''), [busy, setBusy] = useState(false), [step, setStep] = useState<'pick' | 'confirm' | 'done'>('pick'), [result, setResult] = useState('')
  const acc = accounts.find(a => a.id === sel)
  const s = acc ? summarize(dataOf(acc.id)) : null
  const verify = async () => { if (!acc) return; setBusy(true); const ok = await checkLocalPass(acc as never, pass); setBusy(false); if (!ok) return toast('Senha da conta antiga incorreta', 'bad'); setStep('confirm') }
  const doImport = async () => {
    if (!acc || !s) return; setBusy(true)
    try {
      if (!takeSnapshot('antes de importar conta antiga')) throw new Error('Sem espaço para a cópia de segurança')
      const src = dataOf(acc.id), pre = `fp_${session.userId}_`
      for (const [k, v] of Object.entries(src)) {
        if (k === 'lastBackup') continue
        const cur = localStorage.getItem(pre + k)
        localStorage.setItem(pre + k, cur == null ? v : JSON.stringify(mergeValues(JSON.parse(cur), JSON.parse(v))))
      }
      runMigrations(); touch(); await pushAll()
      const cloud = await cloudSummary(), mine = summarize(dataOf(session.userId!))
      const ok = (['pf', 'pj'] as const).every(m => (cloud[m + '_txs']?.lanc || 0) === mine[m].lanc && Math.abs((cloud[m + '_txs']?.total || 0) - (mine[m].receitas + mine[m].despesas)) < 0.01)
      if (!ok) throw new Error('A conferência da nuvem não bateu — nada foi apagado; tente de novo com internet estável')
      localStorage.setItem(importedKey(acc.id), new Date().toISOString())
      setResult(`PF: ${mine.pf.lanc} lançamentos · PJ: ${mine.pj.lanc} lançamentos — conferidos na nuvem ✓`); setStep('done')
    } catch (e) { toast((e as Error).message, 'bad') }
    setBusy(false)
  }
  const line = (x: { lanc: number; receitas: number; despesas: number }) => `${x.lanc} lançamentos • receitas ${fmt(x.receitas)} • despesas ${fmt(x.despesas)}`
  return <Sheet open={open} onClose={onClose} title="Trazer dados deste celular">
    {step === 'pick' && <>
      <p className="mb-3 text-sm text-tx2">Encontrei dados salvos neste aparelho pela versão anterior. Escolha a sua conta antiga e digite a senha dela para importar para a nuvem.</p>
      {!accounts.length && <p className="text-sm text-tx3">Nada para importar neste aparelho.</p>}
      <div className="flex flex-col gap-2">{accounts.map(a => <button key={a.id} onClick={() => setSel(a.id)} className={cx('flex items-center gap-3 rounded-2xl border p-3 text-left', sel === a.id ? 'border-ok/50 bg-ok/5' : 'border-line bg-s2')}><span className="text-xl">{a.avatar}</span><span><b className="block text-sm">{a.name}</b><small className="text-tx3">{a.email}</small></span></button>)}</div>
      {acc && <div className="mt-3 flex flex-col gap-2"><Input type="password" placeholder={`Senha antiga de ${acc.name}`} value={pass} onChange={e => setPass(e.target.value)} /><Button variant="primary" disabled={busy || !pass} onClick={verify}>Continuar</Button></div>}
    </>}
    {step === 'confirm' && s && <>
      <Note>Vou importar os dados de <b>{acc!.name}</b>:<br />PF: {line(s.pf)}<br />PJ: {line(s.pj)}</Note>
      <ul className="my-3 list-disc pl-5 text-xs leading-relaxed text-tx2"><li>Uma cópia de segurança é guardada antes.</li><li>Os dados antigos deste aparelho <b>não são apagados nem alterados</b>.</li><li>No final, confiro na nuvem se a quantidade e os totais batem.</li></ul>
      <Button variant="primary" className="w-full" disabled={busy} onClick={doImport}>{busy ? 'Importando e conferindo…' : 'Importar agora'}</Button>
    </>}
    {step === 'done' && <><Note tone="ok">{result}</Note><p className="mt-3 text-sm text-tx2">Pronto! A partir de agora seus dados ficam na sua conta e aparecem em qualquer celular em que você entrar.</p><Button variant="primary" className="mt-3 w-full" onClick={onClose}>Ver meus dados</Button></>}
  </Sheet>
}
