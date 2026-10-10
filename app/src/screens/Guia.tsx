import { useState, type ReactNode } from 'react'
import { ChevronDown, CheckCircle2, Circle } from 'lucide-react'
import { useApp } from '../app'
import { ldg, svg, session } from '../lib/storage'
import { todayYM, ymLabel } from '../lib/format'
import * as R from '../domain/repo'
import * as L from '../domain/logic'
import { lastBackupDays } from '../domain/safety'
import { Card, Title, Note, cx } from '../ui/kit'

// ── checklist: marcações guardadas por usuário e por período (chave nova, não mexe em nada antigo)
const weekKey = () => { const d = new Date(), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-W${Math.ceil(((+t - +y) / 864e5 + 1) / 7)}` }
type Checks = Record<string, Record<string, boolean>>
function useChecks() {
  const all = ldg<Checks>('guideChecks', {})
  const toggle = (period: string, id: string) => { const c = ldg<Checks>('guideChecks', {}); c[period] = { ...(c[period] || {}), [id]: !c[period]?.[id] }; svg('guideChecks', c) }
  return { all, toggle }
}

function Check({ done, auto, label, sub, onToggle }: { done: boolean; auto?: boolean; label: ReactNode; sub?: ReactNode; onToggle?: () => void }) {
  return <button disabled={auto} onClick={onToggle} className="flex w-full items-start gap-3 border-b border-line py-2.5 text-left last:border-0">
    {done ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" /> : <Circle size={20} className="mt-0.5 shrink-0 text-tx3" />}
    <span className="min-w-0 flex-1"><span className={cx('block text-sm', done && 'text-tx3 line-through')}>{label}</span>{sub && <span className="block text-[11px] text-tx3">{sub}</span>}</span>
    {auto && <span className="rounded bg-s3 px-1.5 py-0.5 text-[9px] uppercase text-tx3">auto</span>}
  </button>
}

function Section({ id, icon, title, sub, children, open, setOpen }: { id: string; icon: string; title: string; sub: string; children: ReactNode; open: string; setOpen: (s: string) => void }) {
  const on = open === id
  return <Card className="!p-0 overflow-hidden"><button onClick={() => setOpen(on ? '' : id)} className="flex w-full items-center gap-3 p-4 text-left">
    <span className="text-2xl">{icon}</span><span className="flex-1"><b className="block">{title}</b><small className="text-xs text-tx3">{sub}</small></span><ChevronDown size={18} className={cx('text-tx3 transition', on && 'rotate-180')} /></button>
    {on && <div className="anim-pop border-t border-line px-4 pb-4 pt-3 text-sm leading-relaxed text-tx2 [&_b]:text-tx [&_h4]:mb-1.5 [&_h4]:mt-4 [&_h4]:text-xs [&_h4]:font-semibold [&_h4]:uppercase [&_h4]:tracking-wider [&_h4]:text-tx3 [&_li]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>}
  </Card>
}

const Row = ({ a, b }: { a: ReactNode; b: ReactNode }) => <div className="grid grid-cols-[42%_1fr] gap-3 border-b border-line py-2 text-[13px] last:border-0"><span className="text-tx">{a}</span><span>{b}</span></div>

export function Guia() {
  const { go, ym } = useApp()
  const [open, setOpen] = useState('checklist')
  const { all, toggle } = useChecks()
  const wk = 'w:' + weekKey(), mk = 'm:' + todayYM()
  const accts = R.getAccts().filter(a => !a.archived), cards = R.getCards().filter(c => !c.archived), cats = L.activeCats()
  const noGroup = session.mode === 'pf' ? cats.filter(c => !c.group).length : 0
  const bk = lastBackupDays(), pending = L.pendingCount(todayYM()), hasPlan = !!R.getPlanM()[todayYM()] || Object.keys(R.getPlan()).length > 0
  const untagged = L.monthTxs(todayYM()).filter(t => t.type === 'expense' && !t.payMethod).length
  const setup = [
    { done: accts.length > 0, label: 'Cadastrar contas com o saldo de hoje', sub: 'Contas → + Conta. Data do saldo = hoje.', r: 'contas' },
    { done: cards.length > 0, label: 'Cadastrar cartões (fechamento e vencimento)', sub: 'Um por cartão, mesmo se for do mesmo banco.', r: 'contas' },
    { done: noGroup === 0, label: 'Toda categoria com grupo 50-30-20', sub: noGroup ? `${noGroup} sem grupo` : 'Categorias → ✏️', r: 'categorias' },
    { done: R.getRecurrents().length > 0, label: 'Cadastrar as contas fixas como recorrentes', sub: 'Aluguel, internet, salário, assinaturas…', r: 'recorrentes' },
    { done: hasPlan, label: 'Definir o orçamento do mês', sub: 'Planejamento → Editar', r: 'planejamento' },
  ]
  const ck = (p: string, id: string) => !!all[p]?.[id]
  const weekly = [
    { id: 'lanc', label: 'Todos os gastos da semana lançados', sub: 'Compare com o extrato e as notificações do banco' },
    { id: 'pay', label: 'Forma de pagamento preenchida nos lançamentos', sub: untagged ? `${untagged} despesa(s) do mês sem forma de pagamento` : 'Tudo certo neste mês', auto: true, done: untagged === 0 },
    { id: 'concil', label: 'Saldos conferidos com o app do banco (Conciliar)', sub: 'Se não bater, procure o lançamento faltante antes de ajustar' },
    { id: 'bk', label: 'Backup feito nos últimos 7 dias', sub: bk === null ? 'Nenhum backup ainda' : `Último há ${bk} dia(s)`, auto: true, done: bk !== null && bk < 7 },
  ]
  const monthly = [
    { id: 'batch', label: 'Revisar “Início do mês” (recorrentes + parcelas)', sub: pending ? `${pending} pendente(s)` : 'Nada pendente', auto: true, done: pending === 0 },
    { id: 'fatura', label: 'Pagar as faturas pelo botão “Pagar” (não lançar como gasto)' },
    { id: 'orc', label: 'Ajustar o orçamento do mês', sub: 'Planejamento → Editar' },
    { id: 'regra', label: 'Revisar o 50-30-20 do mês que fechou — juntos', sub: 'O que passou do limite? O que muda no próximo?' },
    { id: 'pat', label: 'Atualizar bolsões de patrimônio e metas', sub: 'Valor de hoje de cada investimento' },
  ]
  const doneCount = setup.filter(s => s.done).length + weekly.filter(w => w.auto ? w.done : ck(wk, w.id)).length + monthly.filter(m => m.auto ? m.done : ck(mk, m.id)).length
  const total = setup.length + weekly.length + monthly.length
  const sp = { open, setOpen }

  return <div className="flex flex-col gap-2.5">
    <Card className="!border-ok/30 !bg-gradient-to-br from-ok/10 to-info/5"><b className="font-display text-lg">Um padrão, os dois iguais</b>
      <p className="mt-1 text-sm text-tx2">Este guia é a “regra da casa”: como lançar, onde classificar e quando revisar. Se os dois seguirem o mesmo padrão, os números ficam comparáveis e ninguém se perde.</p>
      <div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-s3"><div className="h-full rounded-full bg-ok transition-all" style={{ width: `${doneCount / total * 100}%` }} /></div><span className="num text-xs text-tx2">{doneCount}/{total}</span></div></Card>

    <Section id="checklist" icon="✅" title="Checklist" sub="Configuração, semana e mês — o que está pendente" {...sp}>
      <h4>Configuração inicial (uma vez, nesta ordem)</h4>
      {setup.map((s, i) => <Check key={i} done={s.done} label={`${i + 1}. ${s.label}`} sub={<>{s.sub} <span className="text-ok">abrir ›</span></>} onToggle={() => go(s.r)} />)}
      <h4>Esta semana</h4>
      {weekly.map(w => <Check key={w.id} done={w.auto ? !!w.done : ck(wk, w.id)} auto={w.auto} label={w.label} sub={w.sub} onToggle={() => toggle(wk, w.id)} />)}
      <h4 className="capitalize">Este mês · {ymLabel(todayYM())}</h4>
      {monthly.map(m => <Check key={m.id} done={m.auto ? !!m.done : ck(mk, m.id)} auto={m.auto} label={m.label} sub={m.sub} onToggle={() => toggle(mk, m.id)} />)}
      <p className="mt-3 text-[11px] text-tx3">Itens “auto” são verificados pelo próprio app. Os demais vocês marcam; a semana e o mês recomeçam sozinhos.</p>
    </Section>

    <Section id="regras" icon="⭐" title="As 7 regras de ouro" sub="O mínimo para os números fazerem sentido" {...sp}>
      <ol>
        <li><b>Lance no dia, no celular de quem pagou.</b> Cada um registra o que saiu do próprio bolso. Leva 15 segundos no +.</li>
        <li><b>Um gasto = um lançamento.</b> Nunca lance o pagamento da fatura como despesa: as compras do cartão já contaram. Use “Pagar” no cartão.</li>
        <li><b>Data = dia da compra.</b> Mesmo no crédito. O app calcula sozinho em qual fatura cai.</li>
        <li><b>Sempre preencha forma de pagamento e conta/cartão.</b> É isso que mantém os saldos certos.</li>
        <li><b>Parcelado: lance só a parcela</b> e marque “Compra parcelada”. As próximas aparecem no início de cada mês.</li>
        <li><b>Toda categoria tem um grupo 50-30-20.</b> Na dúvida, consulte o Mapa de Categorias abaixo — e não crie categoria nova por impulso.</li>
        <li><b>Backup toda semana</b> (Mais → Backup & Conta). Os dados vivem só no seu celular.</li>
      </ol>
    </Section>

    <Section id="rotina" icon="🗓️" title="Rotina e ordem de uso" sub="O que fazer em cada aba, e quando" {...sp}>
      <h4>Todo dia (1 min)</h4><ul><li>Tocou no cartão ou fez Pix? Toque no <b>+</b>: valor → descrição → categoria → forma/conta. O app sugere categoria e conta pelo histórico.</li></ul>
      <h4>Toda semana · domingo (10–15 min)</h4><ol>
        <li><b>Lançamentos</b>: filtre “Pagamento → Não informado” e complete o que faltou.</li>
        <li><b>Contas</b>: abra o app do banco e use <b>Conciliar</b> em cada conta. Diferença? Procure o lançamento que faltou antes de ajustar.</li>
        <li><b>Início</b>: veja “Por dia” — é quanto ainda dá para gastar até o fim do mês sem estourar o orçamento.</li>
        <li><b>Backup</b>.</li></ol>
      <h4>Início do mês · dias 1 a 5 (20 min, juntos)</h4><ol>
        <li><b>Início → Revisar</b> lançamentos do início do mês (recorrentes + parcelas). Desmarque o que não aconteceu.</li>
        <li><b>Contas → Pagar</b> a fatura que fechou, escolhendo a conta de onde saiu o dinheiro.</li>
        <li><b>Planejamento → Editar</b>: ajuste o orçamento do mês novo (ou mantenha o herdado).</li>
        <li><b>Início → 50-30-20</b> e <b>Histórico</b> do mês que fechou: onde passou? O que muda?</li>
        <li><b>Patrimônio</b> e <b>Metas</b>: atualize os valores dos investimentos.</li></ol>
      <h4>Uma vez por ano</h4><ul><li>Revisar categorias (juntar as pouco usadas, arquivar as mortas), recorrentes que mudaram de valor e a meta da reserva de emergência.</li></ul>
    </Section>

    <Section id="cadastro" icon="✍️" title="Padrão de cadastro" sub="Como lançar cada situação, do mesmo jeito" {...sp}>
      <h4>Descrição</h4><ul><li>Use o <b>nome do lugar ou da pessoa</b>: “iFood”, “Pão de Açúcar”, “Uber”, “Dr. Paulo”. Evite “comida”, “compra”, “coisas”.</li><li>Mesma descrição para o mesmo lugar — é assim que a sugestão automática e a busca funcionam.</li><li>Detalhe vai na <b>Observação</b>: “presente da mãe”, “dividido com Ana”.</li></ul>
      <h4>Qual tipo usar</h4>
      <Row a="Acontece todo mês com valor parecido" b={<><b>Recorrente</b> (aluguel, salário, internet, academia, assinaturas)</>} />
      <Row a="Compra dividida em X vezes" b={<><b>Parcelada</b> — lance o valor de uma parcela e o total de parcelas</>} />
      <Row a="Qualquer outra coisa" b={<><b>Avulso</b> (padrão)</>} />
      <h4>Situações comuns</h4>
      <Row a="Compra no crédito" b="Forma Crédito + cartão. Data da compra. Não mexe no saldo da conta agora." />
      <Row a="Pagar fatura do cartão" b={<>Contas → cartão → <b>Pagar</b>. Nunca como despesa.</>} />
      <Row a="Pix, débito, boleto" b="Forma + conta de origem. Boleto futuro: status Pendente." />
      <Row a="Passar dinheiro entre suas contas" b={<>Contas → <b>Transferir</b>. Não é gasto nem receita.</>} />
      <Row a="Sacar dinheiro" b="Transferir da conta para a Carteira (cadastre uma conta tipo Carteira)." />
      <Row a="Investir / guardar" b={<>Despesa na categoria <b>Investimentos</b> (conta nos 20%) e atualize o bolsão em Patrimônio.</>} />
      <Row a="Salário" b="Receita pelo valor líquido (o que cai na conta), recorrente." />
      <Row a="Reembolso ou estorno" b="Edite o gasto original para o valor final. Se já passou o mês, lance receita “Reembolso”." />
      <Row a="Conta dividida entre vocês" b="Cada um lança só a sua parte, com observação “dividido com …”. Quem pagou tudo e recebeu Pix depois: lance o total e uma receita do Pix recebido." />
      <Row a="Esqueci de lançar algo antigo" b="Lance com a data real. O app recalcula saldos e relatórios." />
      <Row a="Conta não informada" b="Lançamentos antigos ficam assim. Classifique quando puder — não precisa ser tudo." />
    </Section>

    <Section id="mapa" icon="🗺️" title="Mapa de categorias" sub="Onde vai cada gasto e em qual grupo" {...sp}>
      <p className="mb-2">A regra 50-30-20 separa a renda em <b>🏠 Necessidades (50%)</b> — sem isso a vida não funciona; <b>🎬 Desejos (30%)</b> — escolhas que dava para cortar; <b>📈 Investimento (20%)</b> — o futuro.</p>
      <h4>🏠 Necessidades</h4>
      <Row a="🏠 Moradia" b="aluguel/financiamento, condomínio, luz, água, gás, internet, celular, IPTU, manutenção" />
      <Row a="🍔 Alimentação" b="mercado, feira, padaria do dia a dia" />
      <Row a="🚗 Transporte" b="combustível, transporte público, Uber para trabalho, seguro, IPVA, manutenção" />
      <Row a="💊 Saúde" b="plano, farmácia, consultas, exames, terapia" />
      <Row a="📚 Educação" b="faculdade, cursos de carreira, livros técnicos" />
      <h4>🎬 Desejos</h4>
      <Row a="🎬 Lazer" b="restaurante, delivery, bar, cinema, shows, viagens, hobbies" />
      <Row a="👗 Vestuário" b="roupas, calçados, acessórios" />
      <Row a="📦 Outros" b="presentes, salão/estética, assinaturas de streaming, compras pontuais" />
      <h4>📈 Investimento</h4>
      <Row a="📈 Investimentos" b="aportes, reserva de emergência, previdência, amortização extra de dívida" />
      <h4>Casos que geram dúvida</h4>
      <Row a="Delivery / iFood" b="Desejo (Lazer). Mercado é Necessidade — quer ver separado? Crie “Delivery” no grupo Desejo." />
      <Row a="Academia" b="Desejo, a menos que seja indicação médica (aí Saúde)." />
      <Row a="Streaming e apps" b="Desejo. Se forem muitos, crie “Assinaturas” (Desejo) para enxergar o total." />
      <Row a="Pet" b="Ração e veterinário = Necessidade; banho/acessórios = Desejo. Simples: crie “Pet” como Necessidade." />
      <Row a="Juros, multas, tarifas" b="Necessidade (crie “Tarifas e juros”) — e vale investigar para eliminar." />
      <Row a="Doações e dízimo" b="Desejo, ou Necessidade se for compromisso fixo de vocês — decidam juntos e mantenham." />
      <h4>Quando criar uma categoria nova</h4><ul><li>Só se o gasto aparece <b>todo mês</b> e vocês querem acompanhar separado. Bom número: 10 a 15 categorias.</li><li>Criou? Os dois criam com o <b>mesmo nome e grupo</b>.</li><li>Não usa mais? <b>Arquive</b> — o histórico fica.</li></ul>
      <button onClick={() => go('categorias')} className="mt-2 text-sm font-semibold text-ok">Abrir Categorias ›</button>
    </Section>

    <Section id="numeros" icon="🔢" title="Como ler os números" sub="Saldo do mês × saldo em contas × patrimônio" {...sp}>
      <Row a="Saldo do mês" b="Receitas − despesas do mês (competência). Mostra se vocês viveram dentro da renda." />
      <Row a="Saldo em contas" b="Dinheiro de verdade nos bancos hoje. Compras no crédito só reduzem quando a fatura é paga." />
      <Row a="Previsto" b="Saldo em contas considerando pendentes e agendados." />
      <Row a="Patrimônio" b="Bolsões (reserva, investimentos) + contas marcadas. Não cadastre a mesma conta como bolsão." />
      <Row a="Por dia" b="Quanto do orçamento ainda dá para gastar por dia até o fim do mês (sem contar investimentos)." />
      <Row a="Poupou %" b="Quanto da renda sobrou no mês. Saudável: 20% ou mais." />
      <Note>Mês sem lançamentos não significa gasto zero — pode ser só um mês ainda não atualizado.</Note>
    </Section>

    <Section id="casal" icon="💑" title="Uso a dois" sub="Cada um no seu celular, o mesmo padrão" {...sp}>
      <ul><li>Cada um tem seus dados <b>só no próprio celular</b> — nada se mistura.</li><li>Usem o <b>mesmo mapa de categorias</b> para poder comparar o 50-30-20 lado a lado.</li><li>Despesas da casa: combinem quem lança o quê (ex.: quem paga o aluguel lança o aluguel).</li><li>Revisão mensal juntos (dias 1–5): cada um abre seu Início e compara os três grupos.</li><li>Metas em comum (viagem, casamento): cada um cria a meta e atualiza a sua parte.</li></ul>
    </Section>

    <Section id="seguranca" icon="🛡️" title="Seus dados" sub="Onde ficam e como não perder" {...sp}>
      <ul><li>Os dados ficam no Safari deste celular. Limpar histórico do Safari ou ficar muito tempo sem abrir pode apagá-los — por isso o <b>backup semanal</b>.</li><li>Adicione o app à <b>Tela de Início</b> (Compartilhar → Adicionar à Tela de Início): ele vira app e o iPhone protege melhor os dados.</li><li>Trocou de celular? Instale, crie o login e use <b>Restaurar</b> com o último backup.</li><li>Antes de cada atualização do app, uma cópia automática é guardada.</li></ul>
      <button onClick={() => go('config')} className="mt-2 text-sm font-semibold text-ok">Ir para Backup ›</button>
    </Section>
    <Title> </Title>
    <p className="text-center text-[11px] text-tx3">Base: regra 50-30-20 (Elizabeth Warren, “All Your Worth”), reserva de 6 meses de gastos e o regime de competência para cartão de crédito.</p>
    {ym !== todayYM() && <p className="text-center text-[11px] text-tx3">O checklist sempre mostra o mês atual.</p>}
  </div>
}
