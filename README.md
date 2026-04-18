💎 Sistema SaaS de Consignado de Semijoias

Sistema SaaS multi-tenant desenvolvido para gestão completa de negócios de consignado de semijoias, substituindo controles manuais por uma plataforma digital com controle de estoque, consignação, vendas e acertos financeiros.

🚀 Visão Geral

Este sistema foi projetado para empresas que trabalham com revenda de semijoias em modelo de consignação.

Permite:

Cadastro de revendedoras (sem acesso ao sistema)
Controle de entrega e devolução de peças
Registro de vendas e perdas
Gestão de estoque em tempo real
Acertos financeiros automáticos
Dashboard completo para o dono do negócio
Relatórios exportáveis

Modelo SaaS B2B com cobrança por assinatura.

🧱 Stack Tecnológica

Frontend / Backend:

Next.js 14+ (App Router)
TypeScript
Tailwind CSS
shadcn/ui
React Query (TanStack Query)
Zustand

Backend / Infra:

PostgreSQL
Prisma ORM
Row Level Security (multi-tenant)
Redis (Upstash)
Next.js API Routes / Server Actions

Autenticação:

Clerk (ou Auth.js)

Storage:

Cloudflare R2 (ou AWS S3)

Pagamentos:

Stripe (assinaturas SaaS)

Deploy:

Vercel
Railway / Supabase
🏗️ Arquitetura

Modelo multi-tenant com isolamento por tenant_id em todas as tabelas.

Exemplo de RLS:

CREATE POLICY tenant_isolation ON products
USING (tenant_id = current_setting('app.current_tenant')::uuid);

👥 Hierarquia de Usuários

Dono
└── Gestora
└── Revendedora (entidade, sem acesso ao sistema)

Dono
Acesso total
Visão financeira consolidada
Configurações do sistema
Gestora
Gerencia revendedoras do seu grupo
Registra consignações e acertos
Acesso limitado ao seu escopo
Revendedora
Não acessa o sistema
Apenas entidade operacional
📦 Módulos do Sistema
🔐 Autenticação e Multi-Tenant
Login seguro
Middleware de tenant
Controle de permissões
👩‍💼 Revendedoras
Cadastro completo
Upload de documentos (RG, CNH, comprovante, selfie)
Histórico de consignações
Status ativo/inativo/bloqueado
💍 Produtos
Cadastro com fotos
Controle de estoque
Preço de custo e venda
Comissão
Rastreamento de onde está cada peça
📦 Consignação (Core)
Criação de lotes
Controle de venda, devolução e perda
Status: aberto, parcial, encerrado, atrasado
Validação de estoque
💰 Financeiro
Acertos por revendedora
Cálculo automático de comissão
Histórico de pagamentos
Controle de valores pendentes
📊 Dashboard
Métricas gerais
Top revendedoras
Estoque em campo
Consignações em atraso
Gráficos de vendas
📄 Relatórios
Exportação XLSX / PDF
Extratos por revendedora
Ranking de vendas
⚙️ Configurações
Gestoras
Categorias
Regras de comissão
Parâmetros do sistema
🗄️ Modelagem de Dados

Entidades principais:

tenants
users
resellers
products
consignments
consignment_items
settlements
audit_log
🔐 Regras de Negócio
CPF único por tenant
Não consignar acima do estoque
Revendedora com atraso pode ser bloqueada
Comissão salva como snapshot
Revendedora não acessa sistema
💳 SaaS & Billing

Planos:

Básico
Profissional
Premium
Stripe subscriptions
Trial 14 dias
Cobrança mensal/anual
📁 Estrutura do Projeto

/app
/(auth)
/(dashboard)
/dashboard
/revendedoras
/produtos
/consignados
/financeiro
/relatorios
/configuracoes
/api

/components
/lib
/prisma
/middleware.ts

⚙️ Variáveis de Ambiente

DATABASE_URL=

CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

NEXT_PUBLIC_APP_URL=
APP_SECRET=

🧪 Roadmap

Sprint 1: Setup + Auth + Multi-tenant
Sprint 2: Revendedoras + documentos
Sprint 3: Produtos + estoque
Sprint 4: Consignações (core)
Sprint 5: Financeiro + dashboard
Sprint 6: Relatórios
Sprint 7: Stripe + SaaS

🎯 Objetivo

Validar um MVP real com cliente ativo e evoluir para um SaaS escalável no nicho de consignado de semijoias.

📌 Status

Em desenvolvimento (MVP)

📄 Licença

Projeto privado (SaaS comercial)