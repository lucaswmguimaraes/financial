import { useRef, useState } from 'react'
import { pushAll, syncInfo } from '../lib/cloud'
import { ImportSheet, localAccounts } from './ImportSheet'
import { Download, Upload, Smartphone, Share2 } from 'lucide-react'
import { useApp } from '../app'
import { fmt } from '../lib/format'
import { session } from '../lib/storage'
import { exportBackup, parseBackup, restoreBackup, summarize, collectUserData, lastBackupDays } from '../domain/safety'
import { Card, Title, Button, Note, toast } from '../ui/kit'

export function Config() {
  const { user } = useApp()
  const file = useRef<HTMLInputElement>(null), [imp, setImp] = useState(false), sync = syncInfo()
  const bk = lastBackupDays(), s = summarize(collectUserData())
  const line = (x: typeof s.pf) => `${x.lanc} lançamentos • receitas ${fmt(x.receitas)} • despesas ${fmt(x.despesas)}`
  const doExport = async () => { const r = await exportBackup(user.name); if (r !== 'aborted') toast('Backup gerado — guarde no iCloud/Arquivos') }
  const onFile = (f?: File) => {
    if (!f) return
    f.text().then(text => {
      const b = parseBackup(text); if (typeof b === 'string') return toast(b, 'bad')
      if (b.userId !== session.userId && !confirm(`⚠️ Este backup é de "${b.userName}", não de ${user.name}.\n\nSó continue se for realmente seu (ex.: celular novo). Os dados serão gravados APENAS em ${user.name}.`)) return
      const inc = summarize(b.data)
      if (!confirm(`Restaurar backup de ${new Date(b.exportedAt).toLocaleString('pt-BR')}?\n\nATUAL:\nPF: ${line(s.pf)}\nPJ: ${line(s.pj)}\n\nBACKUP:\nPF: ${line(inc.pf)}\nPJ: ${line(inc.pj)}\n\nOs dados atuais serão substituídos (uma cópia de segurança é guardada antes).`)) return
      try { const ok = restoreBackup(b); pushAll(); toast(ok ? 'Backup restaurado e conferido ✓' : 'Atenção: conferência divergiu', ok ? 'ok' : 'bad') } catch (e) { toast((e as Error).message, 'bad') }
    })
    if (file.current) file.current.value = ''
  }
  return <div>
    <Card><div className="text-sm"><b>{user.avatar} {user.name}</b><div className="text-xs text-tx3">{user.email}</div></div>
      <div className="mt-3 text-xs text-tx2"><div>PF: {line(s.pf)}</div><div>PJ: {line(s.pj)}</div></div></Card>
    <Title>Nuvem</Title>
    <Card><p className="text-sm text-tx2">{sync.state === 'ok' ? '☁️ Tudo sincronizado com a sua conta.' : sync.state === 'pending' ? '🔄 Enviando alterações…' : sync.state === 'offline' ? '📴 Sem internet — o que você lançar fica no celular e sobe sozinho quando voltar.' : `⚠️ Erro ao sincronizar: ${sync.lastError}`}</p>
      <p className="mt-2 text-xs text-tx3">Entre com o mesmo e-mail em outro celular e os dados aparecem lá. Cada alteração guarda a versão anterior no servidor.</p>
      {localAccounts().length > 0 && <Button className="mt-3 w-full" onClick={() => setImp(true)}>Trazer dados antigos deste celular</Button>}</Card>
    <ImportSheet open={imp} onClose={() => setImp(false)} />
    <Title>Backup</Title>
    <Card><p className="mb-3 text-sm text-tx2">Gera um arquivo só com os <b>seus</b> dados. No iPhone, salve em Arquivos ou iCloud Drive.</p>
      <div className={`mb-3 text-xs ${bk === null || bk >= 7 ? 'text-warn' : 'text-tx3'}`}>{bk === null ? 'Nenhum backup ainda' : `Último backup há ${bk} dia(s)`}</div>
      <div className="flex gap-2"><Button variant="primary" className="flex-1" onClick={doExport}><Download size={16} /> Fazer backup</Button><Button className="flex-1" onClick={() => file.current?.click()}><Upload size={16} /> Restaurar</Button></div>
      <input ref={file} type="file" accept=".json,application/json" className="hidden" onChange={e => onFile(e.target.files?.[0])} /></Card>
    <Title>Convidar amigos</Title>
    <Card><p className="mb-3 text-sm text-tx2">Mande o link para quem quiser usar. Cada pessoa cria a própria conta no próprio celular — vocês <b>não</b> veem os dados uns dos outros.</p>
      <Button className="w-full" onClick={async () => { const url = location.origin + import.meta.env.BASE_URL, text = 'Uso o FinançasPro para controlar meus gastos. É grátis e os dados ficam só no seu celular:'; try { if (navigator.share) { await navigator.share({ title: 'FinançasPro', text, url }); return } } catch { return } await navigator.clipboard?.writeText(`${text} ${url}`); toast('Link copiado') }}><Share2 size={16} /> Compartilhar o app</Button></Card>
    <Title>Instalar como app</Title>
    <Card><div className="flex gap-3 text-sm text-tx2"><Smartphone size={20} className="shrink-0 text-ok" /><p>No Safari: <b>Compartilhar → Adicionar à Tela de Início</b>. Abre em tela cheia e o iPhone protege melhor os dados.</p></div></Card>
    <div className="mt-4"><Note>A versão anterior (sem nuvem) segue em <a className="text-ok underline" href="/financial/legacy/">/financial/legacy/</a> com os dados como estavam antes da importação. O backup em arquivo continua valendo como cópia extra.</Note></div>
  </div>
}
