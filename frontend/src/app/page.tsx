import Link from "next/link";
import { Gem, Check, ArrowRight, LayoutDashboard, Users, ShoppingBag, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Basic",
    price: "R$ 97",
    period: "/mês",
    badge: null,
    features: [
      "1 gestora",
      "20 revendedoras",
      "50 produtos",
      "1 GB de armazenamento",
      "Relatórios Excel",
      "Suporte por e-mail",
    ],
  },
  {
    name: "Pro",
    price: "R$ 197",
    period: "/mês",
    badge: "Mais popular",
    features: [
      "3 gestoras",
      "100 revendedoras",
      "Produtos ilimitados",
      "5 GB de armazenamento",
      "Relatórios Excel",
      "Suporte prioritário",
    ],
  },
  {
    name: "Premium",
    price: "R$ 347",
    period: "/mês",
    badge: null,
    features: [
      "Gestoras ilimitadas",
      "Revendedoras ilimitadas",
      "Produtos ilimitados",
      "20 GB de armazenamento",
      "Relatórios Excel",
      "Suporte dedicado",
    ],
  },
];

const features = [
  {
    icon: <LayoutDashboard className="h-6 w-6 text-primary" />,
    title: "Dashboard completo",
    description: "Visualize KPIs, alertas de atraso e gráficos de vendas em tempo real.",
  },
  {
    icon: <Users className="h-6 w-6 text-primary" />,
    title: "Gestão de revendedoras",
    description: "Cadastre revendedoras, acompanhe saldos e controle documentos.",
  },
  {
    icon: <ShoppingBag className="h-6 w-6 text-primary" />,
    title: "Controle de consignados",
    description: "Crie lotes, registre vendas, devoluções e perdas de cada peça.",
  },
  {
    icon: <FileText className="h-6 w-6 text-primary" />,
    title: "Relatórios Excel",
    description: "Exporte dados de revendedoras, consignados, financeiro e ranking em XLSX.",
  },
];

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
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/login">
              <Button>Teste grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <Badge variant="secondary" className="mb-4">14 dias grátis · sem cartão</Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Controle seu consignado{" "}
          <span className="text-primary">de semijoias</span>{" "}
          com facilidade
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Sistema completo para donas de negócio que distribuem semijoias por consignação.
          Gerencie revendedoras, lotes, acertos financeiros e relatórios em um só lugar.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Começar gratuitamente <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#planos">
            <Button size="lg" variant="outline">Ver planos</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Tudo que você precisa</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  {f.icon}
                  <CardTitle className="text-base mt-2">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Planos e preços</h2>
        <p className="text-center text-muted-foreground mb-12">
          Comece com 14 dias grátis. Cancele quando quiser.
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.badge ? "border-primary shadow-lg scale-105" : ""}
            >
              <CardHeader>
                {plan.badge && (
                  <Badge className="w-fit mb-2">{plan.badge}</Badge>
                )}
                <CardTitle>{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block">
                  <Button className="w-full" variant={plan.badge ? "default" : "outline"}>
                    Começar grátis
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          Anual: 2 meses grátis · Setup único: R$ 200–500
        </p>
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
