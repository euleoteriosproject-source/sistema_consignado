# CLAUDE.md — Sistema SaaS de Consignado de Semijoias

> Este arquivo é lido automaticamente pelo Claude Code em cada sessão.
> Contém tudo que o agente precisa saber para trabalhar neste projeto de forma autônoma.

---

## 🧠 CONTEXTO DO PROJETO

Sistema SaaS multi-tenant B2B de controle de consignado de semijoias.
Vendido como assinatura mensal para donas de negócio. Primeiro cliente real já existe.

Solo developer, dev experiente em Java. Projeto do zero, stack moderna.

### O negócio em 3 linhas
Dono compra semijoias → distribui para revendedoras venderem por consignação →
gestoras controlam as revendedoras → dono vê tudo em dashboards e relatórios.
Revendedoras NÃO acessam o sistema — são entidades cadastradas.

### Hierarquia
```
Dono (OWNER) → Gestoras (MANAGER) → Revendedoras (entidade, não usuária)
```

---

## ⚡ REGRAS INVIOLÁVEIS — leia antes de escrever qualquer linha

O Claude Code NUNCA deve:
- Usar `javax.*` — sempre `jakarta.*`
- Usar `double` ou `float` para dinheiro — sempre `BigDecimal`
- Usar `LocalDateTime` — sempre `OffsetDateTime` (precisamos de timezone)
- Usar `extends WebSecurityConfigurerAdapter` — sempre Lambda DSL Spring Security 6
- Fazer DELETE físico — sempre soft delete com `deleted_at TIMESTAMPTZ`
- Usar `Long` ou `Integer` como ID — sempre `UUID`
- Criar DTOs como classes mutáveis — sempre `record`
- Usar `ThreadLocal` para contexto — sempre `ScopedValue` (Java 21)
- Pular testes — cada Service tem teste unitário com Mockito
- Usar `@SpringBootTest` em testes unitários — sempre `@ExtendWith(MockitoExtension.class)`
- Usar `RuntimeException` genérica — sempre exceções de negócio específicas
- Misturar módulos — um módulo por vez, completo, na ordem definida
- Nomear migrations fora do padrão — sempre `V{n}__{descricao_snake_case}.sql`

O Claude Code SEMPRE deve:
- Gerar código compilável e funcional, não esqueletos
- Criar TODOS os arquivos de um módulo antes de passar para o próximo
- Rodar `./gradlew build` após cada módulo para confirmar que compila
- Usar `ScopedValue` para `TenantContext` (Java 21, não ThreadLocal)
- Usar `@FilterDef` + `@Filter` do Hibernate em todas as entities de negócio
- Usar `Specification` para filtros dinâmicos nos repositórios
- Incluir `@Slf4j` nos services para logging estruturado
- Nomear testes no padrão: `metodo_cenario_resultadoEsperado`
- Commitar após cada módulo com mensagem descritiva

---

## 📦 STACK EXATA — não altere sem autorização

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| Java | 21 LTS | Virtual Threads, Records, Sealed Classes, ScopedValue |
| Spring Boot | 3.3.5 | Framework principal |
| Spring Security | 6.x | JWT stateless, Lambda DSL |
| Spring Data JPA | 3.3.x | Hibernate 6, Jakarta EE |
| Spring Validation | 3.3.x | Bean Validation 3 |
| Spring Cache | 3.3.x | @Cacheable com Redis |
| Flyway | 10.x | Migrations versionadas |
| Gradle Kotlin DSL | 8.10 | Build tool |
| MapStruct | 1.6.3 | Mapeamento entity ↔ DTO |
| jjwt | 0.12.6 | Validação JWT Supabase |
| OkHttp | 4.12.0 | Supabase Storage API |
| Apache POI | 5.3.0 | Exportação XLSX |
| Lombok | latest | APENAS @Slf4j em services |
| PostgreSQL driver | latest | |
| Testcontainers | 1.20.4 | Testes de integração |

### Banco e Cloud
| Serviço | Uso |
|---|---|
| Supabase | PostgreSQL + Auth + Storage (tudo em um) |
| Upstash | Redis serverless para cache |
| Railway | Deploy do backend Java via Docker |
| Vercel | Deploy do frontend Next.js |
| GitHub Actions | CI/CD |
| Stripe | Billing SaaS |

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 15.1.0 | App Router, TypeScript strict |
| React | 19.x | |
| Tailwind CSS | 3.4.x | Estilização |
| shadcn/ui | latest | Componentes base |
| TanStack Query | 5.x | Server state, cache, mutations |
| Zustand | 5.x | Estado global mínimo |
| React Hook Form | 7.x | Formulários |
| Zod | 3.x | Validação de schema |
| Recharts | 2.x | Gráficos dashboard |
| Supabase JS | 2.x | Auth e Storage |

---

## 🗂️ ESTRUTURA DO PROJETO

```
consignado/                          ← raiz do monorepo
├── CLAUDE.md                        ← este arquivo
├── .github/workflows/
│   ├── backend.yml
│   └── frontend.yml
├── backend/                         ← Spring Boot
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradlew
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── main/java/com/consignado/api/
│       │   ├── ConsignadoApplication.java
│       │   ├── config/
│       │   │   ├── AppProperties.java
│       │   │   ├── SecurityConfig.java
│       │   │   ├── JpaConfig.java
│       │   │   ├── RedisConfig.java
│       │   │   ├── WebConfig.java
│       │   │   └── SupabaseStorageConfig.java
│       │   ├── multitenancy/
│       │   │   ├── TenantContext.java          ← ScopedValue
│       │   │   ├── TenantFilter.java           ← OncePerRequestFilter
│       │   │   └── HibernateTenantFilter.java
│       │   ├── security/
│       │   │   ├── JwtAuthFilter.java
│       │   │   └── AuthController.java
│       │   ├── domain/
│       │   │   ├── tenant/
│       │   │   ├── user/
│       │   │   ├── reseller/
│       │   │   ├── product/
│       │   │   ├── consignment/
│       │   │   ├── settlement/
│       │   │   └── dashboard/
│       │   ├── reports/
│       │   ├── storage/
│       │   │   └── SupabaseStorageService.java
│       │   └── shared/
│       │       ├── entity/TimestampedEntity.java
│       │       ├── response/ApiResponse.java   ← record
│       │       ├── response/PageResponse.java  ← record
│       │       └── exception/
│       ├── main/resources/
│       │   ├── application.yml
│       │   ├── application-dev.yml
│       │   └── db/migration/
│       │       ├── V1__create_tenants.sql
│       │       ├── V2__create_users.sql
│       │       ├── V3__create_resellers.sql
│       │       ├── V4__create_reseller_documents.sql
│       │       ├── V5__create_products.sql
│       │       ├── V6__create_product_images.sql
│       │       ├── V7__create_consignments.sql
│       │       ├── V8__create_consignment_items.sql
│       │       ├── V9__create_settlements.sql
│       │       └── V10__create_audit_log.sql
│       └── test/java/com/consignado/api/
│           ├── reseller/ResellerServiceTest.java
│           ├── product/ProductServiceTest.java
│           ├── consignment/ConsignmentServiceTest.java
│           └── settlement/SettlementServiceTest.java
└── frontend/                        ← Next.js 15
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── (auth)/login/
        │   └── (dashboard)/
        │       ├── layout.tsx
        │       ├── dashboard/
        │       ├── revendedoras/
        │       ├── produtos/
        │       ├── consignados/
        │       ├── financeiro/
        │       ├── relatorios/
        │       └── configuracoes/
        ├── components/
        │   ├── ui/                  ← shadcn/ui
        │   ├── layout/
        │   ├── dashboard/
        │   ├── resellers/
        │   ├── products/
        │   ├── consignments/
        │   └── shared/
        ├── lib/
        │   ├── supabase/
        │   ├── api/
        │   └── utils/
        ├── hooks/
        ├── stores/
        └── types/
```

### Padrão de estrutura por módulo (backend)
Cada módulo em `domain/` segue EXATAMENTE esta estrutura:
```
domain/reseller/
├── Reseller.java                ← @Entity com @Filter Hibernate
├── ResellerDocument.java        ← @Entity secundário
├── ResellerStatus.java          ← enum
├── DocumentType.java            ← enum
├── ResellerRepository.java      ← JpaRepository + JpaSpecificationExecutor
├── ResellerDocumentRepository.java
├── ResellerService.java         ← @Service @Slf4j, lógica de negócio
├── ResellerController.java      ← @RestController, só orquestra
└── dto/
    ├── ResellerRequest.java     ← record com validações
    ├── ResellerResponse.java    ← record completo
    ├── ResellerSummaryResponse.java ← record para listagens
    ├── ResellerFilterRequest.java   ← record para filtros
    └── ResellerDocumentResponse.java← record
```

---

## 🗄️ SCHEMA DO BANCO — COMPLETO

Todas as migrations devem ser criadas exatamente assim:

```sql
-- V1__create_tenants.sql
CREATE TABLE tenants (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(255) NOT NULL,
  slug                   VARCHAR(100) NOT NULL UNIQUE,
  logo_url               VARCHAR(500),
  primary_color          VARCHAR(7) DEFAULT '#B8860B',
  plan                   VARCHAR(20) NOT NULL DEFAULT 'basic'
                           CHECK (plan IN ('basic','pro','premium')),
  stripe_customer_id     VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  active                 BOOLEAN NOT NULL DEFAULT true,
  trial_ends_at          TIMESTAMPTZ,
  settings               JSONB NOT NULL DEFAULT '{"default_commission_rate":30,"default_return_days":30,"block_new_lot_if_overdue":true}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- V2__create_users.sql
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  supabase_uid UUID NOT NULL UNIQUE,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  phone        VARCHAR(20),
  role         VARCHAR(20) NOT NULL CHECK (role IN ('owner','manager')),
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);
CREATE INDEX idx_users_tenant       ON users(tenant_id);
CREATE INDEX idx_users_supabase_uid ON users(supabase_uid);

-- V3__create_resellers.sql
CREATE TABLE resellers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  manager_id           UUID NOT NULL REFERENCES users(id),
  name                 VARCHAR(255) NOT NULL,
  cpf                  VARCHAR(255),
  birth_date           DATE,
  phone                VARCHAR(20) NOT NULL,
  phone2               VARCHAR(20),
  email                VARCHAR(255),
  address_street       VARCHAR(255),
  address_number       VARCHAR(20),
  address_complement   VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city         VARCHAR(100),
  address_state        CHAR(2),
  address_zip          VARCHAR(9),
  instagram            VARCHAR(100),
  facebook             VARCHAR(100),
  tiktok               VARCHAR(100),
  reference1_name      VARCHAR(255),
  reference1_phone     VARCHAR(20),
  reference2_name      VARCHAR(255),
  reference2_phone     VARCHAR(20),
  notes                TEXT,
  status               VARCHAR(20) NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','inactive','blocked')),
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_resellers_tenant  ON resellers(tenant_id);
CREATE INDEX idx_resellers_manager ON resellers(manager_id);
CREATE INDEX idx_resellers_status  ON resellers(tenant_id, status) WHERE deleted_at IS NULL;

-- V4__create_reseller_documents.sql
CREATE TABLE reseller_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  reseller_id  UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
  type         VARCHAR(30) NOT NULL
                 CHECK (type IN ('rg_front','rg_back','cnh_front','cnh_back','proof_of_address','selfie','other')),
  storage_path VARCHAR(500) NOT NULL,
  file_name    VARCHAR(255),
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reseller_docs_reseller ON reseller_documents(reseller_id);

-- V5__create_products.sql
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            VARCHAR(50),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  category        VARCHAR(50) NOT NULL
                    CHECK (category IN ('anel','colar','brinco','pulseira','tornozeleira','conjunto','outro')),
  cost_price      NUMERIC(15,2),
  sale_price      NUMERIC(15,2) NOT NULL CHECK (sale_price >= 0),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 30.00 CHECK (commission_rate BETWEEN 0 AND 100),
  stock_total     INTEGER NOT NULL DEFAULT 0 CHECK (stock_total >= 0),
  stock_available INTEGER NOT NULL DEFAULT 0 CHECK (stock_available >= 0),
  active          BOOLEAN NOT NULL DEFAULT true,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX idx_products_tenant   ON products(tenant_id);
CREATE INDEX idx_products_category ON products(tenant_id, category) WHERE deleted_at IS NULL;

-- V6__create_product_images.sql
CREATE TABLE product_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path  VARCHAR(500) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- V7__create_consignments.sql
CREATE TABLE consignments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  reseller_id        UUID NOT NULL REFERENCES resellers(id),
  manager_id         UUID NOT NULL REFERENCES users(id),
  delivered_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_at DATE,
  status             VARCHAR(30) NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','partially_settled','settled','overdue')),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_consignments_tenant   ON consignments(tenant_id);
CREATE INDEX idx_consignments_reseller ON consignments(reseller_id);
CREATE INDEX idx_consignments_status   ON consignments(tenant_id, status);
CREATE INDEX idx_consignments_overdue  ON consignments(tenant_id, expected_return_at)
  WHERE status IN ('open','partially_settled');

-- V8__create_consignment_items.sql
CREATE TABLE consignment_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  consignment_id    UUID NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  quantity_sent     INTEGER NOT NULL CHECK (quantity_sent > 0),
  quantity_sold     INTEGER NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  quantity_returned INTEGER NOT NULL DEFAULT 0 CHECK (quantity_returned >= 0),
  quantity_lost     INTEGER NOT NULL DEFAULT 0 CHECK (quantity_lost >= 0),
  sale_price        NUMERIC(15,2) NOT NULL,
  commission_rate   NUMERIC(5,2) NOT NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','partially_settled','settled')),
  CONSTRAINT qty_integrity CHECK (quantity_sold + quantity_returned + quantity_lost <= quantity_sent)
);
CREATE INDEX idx_consignment_items_consignment ON consignment_items(consignment_id);
CREATE INDEX idx_consignment_items_product     ON consignment_items(product_id);

-- V9__create_settlements.sql
CREATE TABLE settlements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  reseller_id      UUID NOT NULL REFERENCES resellers(id),
  manager_id       UUID NOT NULL REFERENCES users(id),
  consignment_id   UUID REFERENCES consignments(id),
  settlement_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  total_sold_value NUMERIC(15,2) NOT NULL CHECK (total_sold_value >= 0),
  total_commission NUMERIC(15,2) NOT NULL CHECK (total_commission >= 0),
  net_to_receive   NUMERIC(15,2) NOT NULL,
  payment_method   VARCHAR(20) NOT NULL
                     CHECK (payment_method IN ('cash','pix','transfer','other')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_settlements_tenant   ON settlements(tenant_id);
CREATE INDEX idx_settlements_reseller ON settlements(reseller_id);
CREATE INDEX idx_settlements_date     ON settlements(tenant_id, settlement_date DESC);

-- V10__create_audit_log.sql
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  payload     JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_tenant_date ON audit_log(tenant_id, created_at DESC);
```

---

## 💻 PADRÕES DE CÓDIGO — exemplos obrigatórios

### TenantContext com ScopedValue (Java 21)
```java
public final class TenantContext {
    public static final ScopedValue<UUID> TENANT_ID = ScopedValue.newInstance();
    public static final ScopedValue<UUID> USER_ID   = ScopedValue.newInstance();
    public static final ScopedValue<String> ROLE    = ScopedValue.newInstance();
    private TenantContext() {}
}
```

### Entity com Hibernate Filter
```java
@Entity
@Table(name = "resellers")
@FilterDef(name = "tenantFilter",
    parameters = @ParamDef(name = "tenantId", type = UUIDJavaType.class))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Reseller extends TimestampedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResellerStatus status = ResellerStatus.ACTIVE;
    // ...
}
```

### DTO como Record
```java
public record ResellerRequest(
    @NotBlank(message = "Nome é obrigatório") String name,
    @NotBlank(message = "Telefone é obrigatório") String phone,
    @NotNull(message = "Gestora é obrigatória") UUID managerId,
    String cpf,
    String instagram,
    String reference1Name,
    String reference1Phone
) {}

public record ResellerResponse(
    UUID id,
    String name,
    String phone,
    String status,
    String managerName,
    int openConsignments,
    BigDecimal openValue,
    OffsetDateTime createdAt
) {}
```

### Spring Security 6 — Lambda DSL
```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           JwtAuthFilter jwtAuthFilter) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/api/v1/webhooks/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

### Service com Virtual Threads e logging
```java
@Service
@Slf4j
@RequiredArgsConstructor
public class ResellerService {

    private final ResellerRepository resellerRepository;
    private final SupabaseStorageService storageService;

    @Transactional
    public ResellerResponse create(ResellerRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        log.info("Creating reseller for tenant={}", tenantId);

        if (resellerRepository.existsByCpfHashAndTenantId(hashCpf(request.cpf()), tenantId)) {
            throw new BusinessException("CPF já cadastrado neste tenant");
        }

        var reseller = new Reseller();
        reseller.setTenantId(tenantId);
        reseller.setName(request.name());
        // ... mapeamento

        var saved = resellerRepository.save(reseller);
        log.info("Reseller created id={} tenant={}", saved.getId(), tenantId);
        return toResponse(saved);
    }
}
```

### Sealed interface para status (Pattern Matching)
```java
public sealed interface ConsignmentEvent
    permits ConsignmentCreated, ItemSold, ItemReturned, ItemLost, ConsignmentSettled {}

public record ConsignmentCreated(UUID consignmentId, UUID resellerId) implements ConsignmentEvent {}
public record ItemSold(UUID itemId, int quantity, BigDecimal value) implements ConsignmentEvent {}
public record ItemReturned(UUID itemId, int quantity) implements ConsignmentEvent {}
public record ItemLost(UUID itemId, int quantity) implements ConsignmentEvent {}
public record ConsignmentSettled(UUID consignmentId, BigDecimal netValue) implements ConsignmentEvent {}
```

### Cálculo financeiro (NUNCA use double)
```java
// Correto
BigDecimal commissionValue = soldValue
    .multiply(commissionRate)
    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
BigDecimal netToReceive = soldValue.subtract(commissionValue);

// ERRADO — nunca faça isso
double net = soldValue * (1 - commissionRate / 100); // PROIBIDO
```

### Teste unitário padrão
```java
@ExtendWith(MockitoExtension.class)
class ResellerServiceTest {

    @Mock private ResellerRepository resellerRepository;
    @Mock private SupabaseStorageService storageService;
    @InjectMocks private ResellerService resellerService;

    @Test
    void create_withDuplicateCpf_throwsBusinessException() {
        // arrange
        when(resellerRepository.existsByCpfHashAndTenantId(any(), any())).thenReturn(true);
        var request = new ResellerRequest("Ana Silva", "11999999999", UUID.randomUUID(),
            "12345678901", null, null, null);
        // act + assert
        assertThrows(BusinessException.class, () -> resellerService.create(request));
    }

    @Test
    void create_withValidData_returnsResponse() {
        // arrange
        when(resellerRepository.existsByCpfHashAndTenantId(any(), any())).thenReturn(false);
        when(resellerRepository.save(any())).thenReturn(buildReseller());
        var request = new ResellerRequest("Ana Silva", "11999999999", UUID.randomUUID(),
            null, null, null, null);
        // act
        var response = resellerService.create(request);
        // assert
        assertNotNull(response);
        assertEquals("Ana Silva", response.name());
    }
}
```

---

## 🔌 ENDPOINTS — referência rápida

```
POST   /api/v1/auth/validate-token

GET    /api/v1/resellers                 ?search&status&managerId&page&size&sort
POST   /api/v1/resellers
GET    /api/v1/resellers/{id}
PUT    /api/v1/resellers/{id}
PATCH  /api/v1/resellers/{id}/status
GET    /api/v1/resellers/{id}/consignments
POST   /api/v1/resellers/{id}/documents  (multipart)
GET    /api/v1/resellers/{id}/documents
DELETE /api/v1/resellers/{id}/documents/{docId}

GET    /api/v1/products                  ?search&category&active&page&size&sort
POST   /api/v1/products
GET    /api/v1/products/{id}
PUT    /api/v1/products/{id}
PATCH  /api/v1/products/{id}/status
GET    /api/v1/products/{id}/tracking
POST   /api/v1/products/{id}/images      (multipart)
DELETE /api/v1/products/{id}/images/{imgId}
PATCH  /api/v1/products/{id}/images/{imgId}/primary

GET    /api/v1/consignments              ?status&resellerId&managerId&from&to&page&size
POST   /api/v1/consignments
GET    /api/v1/consignments/{id}
POST   /api/v1/consignments/{id}/movements
POST   /api/v1/consignments/{id}/settle

GET    /api/v1/settlements               ?resellerId&from&to&page&size
POST   /api/v1/settlements
GET    /api/v1/settlements/summary
GET    /api/v1/resellers/{id}/balance

GET    /api/v1/dashboard/summary         (OWNER only)
GET    /api/v1/dashboard/tree            (OWNER only)
GET    /api/v1/dashboard/alerts
GET    /api/v1/dashboard/charts          ?period=6m|3m|1m

GET    /api/v1/reports/resellers         → XLSX
GET    /api/v1/reports/consignments      → XLSX
GET    /api/v1/reports/financial         → XLSX
GET    /api/v1/reports/ranking           → XLSX

GET    /api/v1/settings                  (OWNER only)
PUT    /api/v1/settings
GET    /api/v1/settings/managers
POST   /api/v1/settings/managers
PATCH  /api/v1/settings/managers/{id}/status

GET    /api/v1/billing/plan
POST   /api/v1/billing/portal
POST   /api/v1/webhooks/stripe
```

---

## 🚀 SPRINTS — ordem de execução

Claude Code executa uma sprint por vez e só avança quando o build passar.

```
SPRINT 1 — Fundação
  → Criar monorepo, gradle wrapper, build.gradle.kts, settings.gradle.kts
  → ConsignadoApplication, AppProperties, application.yml, application-dev.yml
  → .gitignore, .env.example, Dockerfile
  → TimestampedEntity, ApiResponse (record), PageResponse (record)
  → BusinessException, ResourceNotFoundException, ForbiddenException
  → GlobalExceptionHandler
  → TenantContext (ScopedValue), TenantFilter, HibernateTenantFilter
  → JwtAuthFilter, SecurityConfig (Lambda DSL), WebConfig, RedisConfig
  → SupabaseStorageConfig, SupabaseStorageService
  → JpaConfig (Hibernate filters)
  → AuthController (POST /api/v1/auth/validate-token)
  → Tenant.java, User.java, TenantRepository, UserRepository
  → V1__create_tenants.sql, V2__create_users.sql
  → .github/workflows/backend.yml
  → VALIDAR: ./gradlew build && ./gradlew test

SPRINT 2 — Revendedoras
  → V3__create_resellers.sql, V4__create_reseller_documents.sql
  → Reseller.java, ResellerDocument.java, ResellerStatus enum, DocumentType enum
  → ResellerRepository (com Specification), ResellerDocumentRepository
  → DTOs: ResellerRequest, ResellerResponse, ResellerSummaryResponse,
          ResellerFilterRequest, ResellerDocumentResponse (todos records)
  → ResellerService (create, findById, findAll, update, updateStatus, addDocument,
                     listDocuments, removeDocument)
  → ResellerController com todos os endpoints
  → ResellerServiceTest (Mockito, sem Spring context)
  → VALIDAR: ./gradlew build && ./gradlew test

SPRINT 3 — Produtos
  → V5__create_products.sql, V6__create_product_images.sql
  → Product.java, ProductImage.java, ProductCategory enum
  → ProductRepository, ProductImageRepository
  → DTOs (records)
  → ProductService (CRUD + upload de fotos + tracking + stock_available)
  → ProductController
  → ProductServiceTest
  → VALIDAR: ./gradlew build && ./gradlew test

SPRINT 4 — Consignado
  → V7__create_consignments.sql, V8__create_consignment_items.sql
  → Consignment.java, ConsignmentItem.java, ConsignmentStatus (sealed interface)
  → ConsignmentRepository, ConsignmentItemRepository
  → DTOs (records)
  → ConsignmentService (criar lote com snapshot, registrar movimentações,
                        encerrar lote, atualizar stock_available)
  → ConsignmentScheduler (@Scheduled marca overdue diariamente)
  → ConsignmentController
  → ConsignmentServiceTest
  → VALIDAR: ./gradlew build && ./gradlew test

SPRINT 5 — Financeiro + Dashboard
  → V9__create_settlements.sql
  → Settlement.java, PaymentMethod enum
  → SettlementRepository
  → DTOs (records)
  → SettlementService (acerto financeiro com cálculo automático)
  → SettlementController
  → DashboardService (summary, tree, alerts, charts — com @Cacheable)
  → DashboardController
  → SettlementServiceTest
  → VALIDAR: ./gradlew build && ./gradlew test

SPRINT 6 — Relatórios + Configurações + Audit
  → V10__create_audit_log.sql
  → AuditLog.java, AuditLogRepository, AuditService (@Async)
  → ReportService (Apache POI — gera XLSX por tipo de relatório)
  → ReportController
  → SettingsController (configurações do tenant + gestoras)
  → VALIDAR: ./gradlew build && ./gradlew test

SPRINT 7 — Frontend Next.js
  → Criar frontend/ com Next.js 15 + TypeScript + Tailwind + shadcn/ui
  → Configurar Supabase client (browser + server)
  → Auth: login page, middleware de proteção, AuthProvider
  → Layout: Sidebar, Header, MobileNav
  → Dashboard: KPIs, gráficos, árvore, alertas
  → Revendedoras: listagem, cadastro multi-step, perfil, documentos
  → Produtos: listagem, cadastro com fotos, tracking
  → Consignados: listagem, criar lote, movimentar
  → Financeiro: resumo, acertos
  → Relatórios: seletor + exportar
  → Configurações: tenant + gestoras
  → VALIDAR: npm run build sem erros TypeScript

SPRINT 8 — Billing + Deploy final
  → Integração Stripe (planos, assinaturas, webhook)
  → Limites por plano enforçados no backend
  → Landing page de vendas
  → GitHub Actions completo (backend + frontend)
  → Configurar Railway (backend) + Vercel (frontend)
  → Variáveis de ambiente em produção
  → Smoke test em produção
```

---

## 🎯 COMANDOS CLAUDE CODE

Use estes comandos para iniciar o desenvolvimento:

### Iniciar do zero (Sprint 1)
```
Leia o CLAUDE.md e implemente a Sprint 1 completa.
Crie todos os arquivos na estrutura definida.
Após criar cada arquivo, confirme com ./gradlew build.
Não pare até que todos os itens da Sprint 1 estejam criados e o build passe.
```

### Avançar para próxima sprint
```
Sprint [N] validada. Implemente a Sprint [N+1] completa conforme o CLAUDE.md.
Siga a ordem: Migration → Entity → Repository → DTO → Service → Controller → Teste.
Não pule etapas. Execute ./gradlew test ao final.
```

### Corrigir um módulo específico
```
O módulo [nome] está com problema: [descreva].
Leia o CLAUDE.md, corrija mantendo todos os padrões definidos.
```

### Adicionar feature nova
```
Adicione [feature] ao módulo [nome].
Siga os padrões do CLAUDE.md: record para DTO, soft delete, BigDecimal para dinheiro.
Atualize o teste do Service.
```

---

## 💳 PLANOS SAAS

```
BASIC    R$ 147/mês → 1 gestora,  20 revendedoras,  50 produtos,  1 GB
PRO      R$ 197/mês → 3 gestoras, 100 revendedoras, ilimitados,   5 GB
PREMIUM  R$ 397/mês → ilimitado,  ilimitado,         ilimitados,  20 GB

Setup completo: R$300 (2–3h) ou R$500 (4–6h)
  Inclui: configuração de produtos, revendedoras e call de treinamento
Trial: 14 dias grátis sem cartão
Anual: 2 meses grátis
```

### Billing
- **Agora (até ~10 clientes):** Kiwify — sem código, recorrência nativa, rápido de configurar
- **Futuro (10+ clientes):** migrar para Iugu integrado no sistema
- **Stripe:** deixar para clientes internacionais (burocracia para receber no Brasil)

Limites enforçados no backend via `TenantPlan` enum + validação no Service antes de criar
gestora, revendedora ou produto.

---

## 🌐 VARIÁVEIS DE AMBIENTE

```bash
# Supabase
SUPABASE_DB_URL=jdbc:postgresql://db.xxx.supabase.co:5432/postgres
SUPABASE_DB_USER=postgres.xxx
SUPABASE_DB_PASSWORD=
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=        # em Project Settings > API > JWT Secret
SUPABASE_STORAGE_BUCKET=consignado-storage

# Cache
UPSTASH_REDIS_URL=rediss://default:xxx@xxx.upstash.io:6380

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
FRONTEND_URL=https://app.seudominio.com.br
```

---

*CLAUDE.md — lido automaticamente pelo Claude Code em cada sessão.*
*Versão 1.0 | Stack: Java 21 · Spring Boot 3.3 · Supabase · Next.js 15*
