# Estrutura do Banco de Dados - Portal Pili

## Visão Geral

O sistema utiliza PostgreSQL (Neon) com duas tabelas principais relacionadas:

- **opds**: Cadastro de Ordens de Produção/Distribuição
- **registros_atividades**: Atividades vinculadas a cada OPD

---

## Esquema do Banco de Dados

### Tabela: `opds`

```sql
CREATE TABLE opds (
  id SERIAL PRIMARY KEY,
  opd VARCHAR(255),
  numero VARCHAR(255) NOT NULL UNIQUE,
  data_pedido DATE,
  previsao_inicio DATE,
  previsao_termino DATE,
  inicio_producao DATE,
  tipo_opd VARCHAR(50),
  responsavel_opd VARCHAR(100),
  atividades_opd TEXT,
  anexo_pedido JSONB,
  registros_atividade TEXT,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_opds_numero ON opds(numero);
CREATE INDEX idx_opds_tipo ON opds(tipo_opd);
CREATE INDEX idx_opds_responsavel ON opds(responsavel_opd);
```

**Campos principais:**
- `id`: Identificador único (auto-incremento)
- `numero`: Número da OPD (único, usado como referência)
- `data_pedido`: Data do pedido
- `tipo_opd`: Tipo da ordem
- `responsavel_opd`: Responsável pela OPD

---

### Tabela: `registros_atividades`

```sql
CREATE TABLE registros_atividades (
  id SERIAL PRIMARY KEY,
  numero_opd VARCHAR(255) NOT NULL,
  atividade TEXT,
  responsavel VARCHAR(100),
  previsao_inicio DATE,
  data_pedido DATE,
  data_inicio DATE,
  data_termino DATE,
  cadastro_opd VARCHAR(255),
  status VARCHAR(50) DEFAULT 'A REALIZAR',
  status_alt VARCHAR(50),
  tempo_medio DECIMAL(10,2),
  observacoes TEXT,
  dias INTEGER,
  formulario_anexo JSONB,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Key
  CONSTRAINT fk_atividades_opd
    FOREIGN KEY (numero_opd)
    REFERENCES opds(numero)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Índices
CREATE INDEX idx_atividades_numero_opd ON registros_atividades(numero_opd);
CREATE INDEX idx_atividades_status ON registros_atividades(status);
CREATE INDEX idx_atividades_responsavel ON registros_atividades(responsavel);
CREATE INDEX idx_atividades_data_inicio ON registros_atividades(data_inicio);
CREATE INDEX idx_atividades_data_termino ON registros_atividades(data_termino);
```

**Campos principais:**
- `id`: Identificador único (auto-incremento)
- `numero_opd`: Referência ao número da OPD (Foreign Key)
- `atividade`: Descrição da atividade
- `responsavel`: Responsável pela atividade
- `status`: Status da atividade (padrão: 'A REALIZAR')
- `data_inicio`: Data de início da atividade
- `data_termino`: Data de conclusão
- `dias`: Duração em dias
- `formulario_anexo`: Dados do formulário em JSON (para atividades especiais)

---

## Relacionamento entre Tabelas

```
opds (1) ←→ (N) registros_atividades
  └─ numero ←─ numero_opd (FK)
```

**Características:**
- Um OPD pode ter múltiplas atividades
- Uma atividade pertence a um único OPD
- Ao deletar uma OPD, todas as atividades relacionadas são removidas (CASCADE)
- Ao atualizar o número de uma OPD, as atividades são atualizadas automaticamente (CASCADE)

---

## Fluxo de Trabalho

### 1. Cadastro de OPD
- Criar nova OPD com número único
- Sistema valida duplicidade do número
- ID gerado automaticamente

### 2. Atividades
Cada OPD possui dois tipos de atividades:

**A) Atividades do CSV (Checkbox simples):**
- Importadas do arquivo CSV
- Checkbox para marcar conclusão
- Data de finalização

**B) Atividades Especiais (Com formulário):**
1. **Produção, Expedição, Liberação e Embarque**
2. **Preparação, Desembarque, Pré-instalação e Entrega**

Essas 4 atividades especiais:
- Requerem formulário completo
- Campos adicionais salvos em `formulario_anexo` (JSONB)
- Validações específicas

### 3. Checagem e Conclusão
- Responsável marca checkbox da atividade
- Informa data de finalização
- Para atividades especiais: preenche formulário completo
- Status atualizado automaticamente

---

## Scripts Disponíveis

### Criar Tabelas
```bash
# Criar tabela OPDs
node scripts/create-table.js

# Criar tabela Atividades
node scripts/create-atividades-table.js
```

### Corrigir Schema (Caso já existam tabelas)
```bash
# Adiciona Foreign Keys, SERIAL, índices e campos faltantes
node scripts/fix-database-schema.js
```

### Importar Dados
```bash
# Importar atividades de CSV
node scripts/import-atividades.js
```

---

## APIs Disponíveis

### OPDs

**GET /api/opds**
- Lista todas as OPDs

**GET /api/opds/[id]**
- Busca OPD por ID

**POST /api/opds**
- Cria nova OPD
- Valida número único

**PATCH /api/opds/[id]**
- Atualiza campos da OPD
- Updated timestamp automático

**DELETE /api/opds/[id]**
- Remove OPD e todas suas atividades (CASCADE)

### Atividades

**GET /api/atividades/[numero]**
- Lista atividades de uma OPD específica
- Ordenado por previsao_inicio

**POST /api/atividades/[numero]**
- Cria nova atividade para a OPD
- Valida Foreign Key automaticamente

**PATCH /api/atividades/[numero]/[id]**
- Atualiza atividade específica
- Suporta atualização de formulario_anexo

---

## Observações Importantes

1. **Integridade Referencial:** Foreign Key garante que atividades só podem ser criadas para OPDs existentes

2. **Timestamps Automáticos:** `created` e `updated` são gerenciados pelo banco

3. **IDs Auto-incremento:** Não é necessário enviar ID ao criar registros

4. **Status Padrão:** Novas atividades iniciam como 'A REALIZAR'

5. **JSONB para Formulários:** Campos dinâmicos são salvos em `formulario_anexo` para flexibilidade

6. **Índices:** Consultas por numero_opd, status e datas são otimizadas

---

## Próximos Passos

- [ ] Implementar formulários para atividades especiais
- [ ] Definir campos específicos para cada tipo de formulário
- [ ] Criar validações de negócio
- [ ] Implementar sistema de checklist
- [ ] Adicionar controle de permissões por responsável
