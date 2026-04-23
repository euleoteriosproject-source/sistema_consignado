import Link from "next/link";
import {
  Gem, Check, ArrowRight, LayoutDashboard, Users, ShoppingBag,
  FileText, TrendingUp, AlertTriangle, PackageCheck, Wallet,
  ChevronRight, BarChart3, Bell, CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ─── dados estáticos ─── */
const plans = [
  {
    name: "Basic", price: "R$ 147", period: "/mês", badge: null,
    checkoutUrl: "https://pay.kiwify.com.br/NEKCCPY",
    features: ["1 gestor(a)", "20 revendedoras", "50 produtos", "1 GB armazenamento", "Relatórios Excel", "Suporte por e-mail"],
  },
  {
    name: "Pro", price: "R$ 197", period: "/mês", badge: "Mais popular",
    checkoutUrl: "https://pay.kiwify.com.br/ch1Oa1i",
    features: ["3 gestores(as)", "100 revendedoras", "Produtos ilimitados", "5 GB armazenamento", "Relatórios Excel", "Suporte prioritário"],
  },
  {
    name: "Premium", price: "R$ 397", period: "/mês", badge: null,
    checkoutUrl: "https://pay.kiwify.com.br/SZKBie2",
    features: ["Gestores(as) ilimitados(as)", "Revendedoras ilimitadas", "Produtos ilimitados", "20 GB armazenamento", "Relatórios Excel", "Suporte dedicado"],
  },
];

const pains = [
  { emoji: "📓", text: "Controla tudo no caderno ou planilha bagunçada?" },
  { emoji: "😰", text: "Não sabe quais revendedoras estão com peças atrasadas?" },
  { emoji: "💸", text: "Perde comissão porque não calcula direito na hora do acerto?" },
  { emoji: "🔍", text: "Não consegue ver qual produto vende mais?" },
];

const steps = [
  { n: "01", title: "Cadastre suas revendedoras", desc: "Adicione nome, contato, documentos e defina o(a) gestor(a) responsável por cada uma." },
  { n: "02", title: "Monte o lote de consignado", desc: "Selecione as peças, quantidades e valores. O sistema separa o estoque automaticamente." },
  { n: "03", title: "Registre vendas e devoluções", desc: "Quando a revendedora retorna, informe o que foi vendido, devolvido ou perdido." },
  { n: "04", title: "Faça o acerto em segundos", desc: "O sistema calcula valor vendido, comissão e líquido a receber. Sem erros, sem discussão." },
];

/* ─── componente de mockup do dashboard ─── */
function DashboardMockup() {
  return (
    <div className="w-full rounded-xl border bg-background shadow-2xl overflow-hidden text-xs select-none pointer-events-none">
      {/* barra de título */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/60 border-b">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-2 text-muted-foreground text-[10px]">consignado.app/dashboard</span>
      </div>

      <div className="flex h-[420px]">
        {/* sidebar */}
        <div className="w-40 border-r bg-muted/20 p-3 flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-1.5 mb-4">
            <Gem className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">Consignado</span>
          </div>
          {[
            { icon: <LayoutDashboard className="h-3 w-3" />, label: "Dashboard", active: true },
            { icon: <Users className="h-3 w-3" />, label: "Revendedoras" },
            { icon: <ShoppingBag className="h-3 w-3" />, label: "Produtos" },
            { icon: <PackageCheck className="h-3 w-3" />, label: "Consignados" },
            { icon: <Wallet className="h-3 w-3" />, label: "Financeiro" },
            { icon: <FileText className="h-3 w-3" />, label: "Relatórios" },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* conteúdo */}
        <div className="flex-1 p-4 overflow-hidden bg-muted/10">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-sm">Visão geral</span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Bell className="h-3 w-3 text-amber-500" />
              <span className="text-amber-600 font-medium">3 lotes atrasados</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: "Revendedoras ativas", value: "47", icon: <Users className="h-3 w-3 text-blue-500" />, color: "text-blue-600" },
              { label: "Em consignado", value: "R$ 18.450", icon: <ShoppingBag className="h-3 w-3 text-amber-500" />, color: "text-amber-600" },
              { label: "A receber", value: "R$ 6.320", icon: <CircleDollarSign className="h-3 w-3 text-green-500" />, color: "text-green-600" },
              { label: "Vendas no mês", value: "R$ 9.870", icon: <TrendingUp className="h-3 w-3 text-primary" />, color: "text-primary" },
            ].map((k) => (
              <div key={k.label} className="bg-background rounded-lg border p-2">
                <div className="flex items-center gap-1 mb-1">{k.icon}<span className="text-[9px] text-muted-foreground leading-tight">{k.label}</span></div>
                <span className={`font-bold text-sm ${k.color}`}>{k.value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {/* gráfico fake */}
            <div className="col-span-3 bg-background rounded-lg border p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[10px]">Vendas mensais</span>
                <BarChart3 className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex items-end gap-1 h-20 px-1">
                {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-sm bg-primary/80"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[8px] text-muted-foreground">
                      {["Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* alertas */}
            <div className="col-span-2 bg-background rounded-lg border p-2 flex flex-col gap-1.5">
              <span className="font-medium text-[10px] mb-0.5">Alertas</span>
              {[
                { name: "Carla S.", days: "12 dias", color: "text-red-500 bg-red-50" },
                { name: "Marta L.", days: "8 dias", color: "text-amber-600 bg-amber-50" },
                { name: "Priya N.", days: "5 dias", color: "text-amber-500 bg-amber-50" },
              ].map((a) => (
                <div key={a.name} className={`flex items-center justify-between px-1.5 py-1 rounded text-[9px] ${a.color}`}>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {a.name}
                  </span>
                  <span className="font-medium">{a.days}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gem className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Consignado</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/cadastro">
              <Button size="sm">Teste grátis <ArrowRight className="ml-1 h-3 w-3" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">14 dias grátis · sem cartão de crédito</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
            Pare de perder peças.<br />
            <span className="text-primary">Pare de perder dinheiro.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Sistema completo para quem distribui semijoias por consignação.
            Controle revendedoras, lotes, acertos e relatórios — tudo em um só lugar.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/cadastro">
              <Button size="lg" className="gap-2 text-base px-6">
                Começar gratuitamente <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button size="lg" variant="outline" className="text-base px-6">Ver como funciona</Button>
            </a>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-4xl mx-auto mt-12 px-4">
          <DashboardMockup />
          <p className="text-center text-xs text-muted-foreground mt-3">
            Preview real do sistema — o que você vai usar todo dia
          </p>
        </div>
      </section>

      {/* Dores */}
      <section className="bg-muted/40 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Você se identifica com isso?</h2>
          <p className="text-center text-muted-foreground mb-10">Se sim, o Consignado foi feito pra você.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {pains.map((p) => (
              <div key={p.text} className="bg-background border rounded-xl p-4 flex flex-col gap-2">
                <span className="text-3xl">{p.emoji}</span>
                <p className="text-sm font-medium leading-snug">{p.text}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-muted-foreground text-sm">
            Com o Consignado, cada um desses problemas deixa de existir.{" "}
            <Link href="/login" className="text-primary font-medium underline underline-offset-2">Teste grátis por 14 dias →</Link>
          </p>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="container mx-auto px-4 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Como funciona</h2>
        <p className="text-center text-muted-foreground mb-12">Simples do jeito certo. Quatro passos e você está no controle.</p>
        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <div key={s.n} className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-primary/20">{s.n}</span>
                {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground hidden md:block ml-auto" />}
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t" />

      {/* Funcionalidades visuais */}
      <section id="funcionalidades" className="container mx-auto px-4 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Tudo que você precisa, nada que não precisa</h2>
        <p className="text-center text-muted-foreground mb-14">Cada funcionalidade pensada para quem trabalha com consignado de semijoias.</p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[
            {
              icon: <LayoutDashboard className="h-5 w-5 text-primary" />,
              title: "Dashboard com visão completa",
              desc: "Veja em segundos: quanto está em consignado, quanto vai receber, quais revendedoras estão atrasadas. Tudo na primeira tela, sem precisar procurar.",
              tags: ["KPIs em tempo real", "Alertas de atraso", "Gráfico de vendas"],
            },
            {
              icon: <Users className="h-5 w-5 text-primary" />,
              title: "Gestão completa de revendedoras",
              desc: "Cadastre com foto, documentos, endereço e referências. Acompanhe saldo em aberto, histórico de consignados e desempenho de cada revendedora.",
              tags: ["Documentos no sistema", "Saldo em aberto", "Histórico completo"],
            },
            {
              icon: <PackageCheck className="h-5 w-5 text-primary" />,
              title: "Controle de lotes ponta a ponta",
              desc: "Monte o lote, entregue, registre o que foi vendido, devolvido ou perdido. O estoque atualiza sozinho. Nunca mais 'cadê aquela peça?'.",
              tags: ["Estoque automático", "Rastro de cada peça", "Status em tempo real"],
            },
            {
              icon: <CircleDollarSign className="h-5 w-5 text-primary" />,
              title: "Acerto financeiro sem erro",
              desc: "Informe o que foi vendido e o sistema calcula comissão, valor líquido e forma de pagamento. Em 30 segundos o acerto está feito e registrado.",
              tags: ["Cálculo automático", "Histórico de acertos", "Relatório financeiro"],
            },
            {
              icon: <TrendingUp className="h-5 w-5 text-primary" />,
              title: "Ranking de revendedoras",
              desc: "Descubra quem são suas melhores revendedoras, quem está vendendo pouco e quem nunca devolve no prazo. Dados para tomar decisões com confiança.",
              tags: ["Top vendedoras", "Análise de desempenho", "Exportação Excel"],
            },
            {
              icon: <FileText className="h-5 w-5 text-primary" />,
              title: "Relatórios prontos em Excel",
              desc: "Exporte relatórios de revendedoras, consignados, financeiro e ranking com um clique. Para você, para sua contadora, para quem precisar.",
              tags: ["4 tipos de relatório", "Formato XLSX", "Filtros por período"],
            },
          ].map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="mt-0.5 p-2 bg-primary/10 rounded-lg h-fit">{f.icon}</div>
              <div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{f.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {f.tags.map((t) => (
                    <span key={t} className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="container mx-auto px-4 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Planos e preços</h2>
        <p className="text-center text-muted-foreground mb-12">
          Comece com 14 dias grátis. Sem cartão. Cancele quando quiser.
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.badge ? "border-primary shadow-xl ring-2 ring-primary/20 scale-105" : ""}
            >
              <CardHeader>
                {plan.badge && <Badge className="w-fit mb-2">{plan.badge}</Badge>}
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full" variant={plan.badge ? "default" : "outline"}>
                    Assinar agora
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          Setup completo incluso: configuração, cadastro e treinamento · R$ 300–500 (única vez)
        </p>
      </section>

      {/* CTA final */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Pronta para ter o controle de volta?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            14 dias grátis, sem cartão, sem compromisso. Se não mudar sua rotina, não paga nada.
          </p>
          <Link href="/cadastro">
            <Button size="lg" variant="secondary" className="gap-2 text-base px-8">
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-primary" />
            <span className="font-semibold">Consignado</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Consignado. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
