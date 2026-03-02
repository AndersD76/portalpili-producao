# Portal Pili

Portal de acompanhamento de OPDs (Ordens de Produção) em tempo real.

## Características

- Interface moderna e responsiva
- Visualização em cards de todas as OPDs
- Dados em tempo real do banco de dados NeonDB (PostgreSQL)
- Auto-atualização a cada 30 segundos (opcional)
- Busca por número de OPD
- Indicadores visuais de status (No Prazo / Atenção / Atrasado)
- Barra de progresso baseada nas datas de previsão
- Acesso sem necessidade de login

## Tecnologias Utilizadas

- **Next.js 16** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **PostgreSQL (NeonDB)** - Banco de dados
- **Node.js** - Runtime JavaScript

## Estrutura do Projeto

```
Portal Pili/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── opds/
│   │   │       └── route.ts      # API endpoint para buscar OPDs
│   │   ├── globals.css           # Estilos globais
│   │   ├── layout.tsx            # Layout principal
│   │   └── page.tsx              # Página inicial
│   ├── components/
│   │   └── OPDCard.tsx           # Componente do card de OPD
│   ├── lib/
│   │   └── db.ts                 # Conexão com o banco de dados
│   └── types/
│       └── opd.ts                # Tipos TypeScript
├── scripts/
│   ├── create-table.js           # Script para criar tabela no DB
│   └── import-csv.js             # Script para importar CSV
├── cadastro_opd.csv              # Dados de origem
└── package.json
```

## Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
DATABASE_URL=postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 2. Instalação de Dependências

```bash
npm install
```

### 3. Criar Tabela no Banco de Dados

```bash
node scripts/create-table.js
```

### 4. Importar Dados do CSV

```bash
npm run import-csv
```

## Executar o Projeto

### Modo de Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

### Build para Produção

```bash
npm run build
npm start
```

## Funcionalidades do Portal

### Cards de OPD

Cada card exibe:
- Número da OPD
- Status visual (No Prazo / Atenção / Atrasado)
- Tipo de OPD
- Responsável
- Datas importantes:
  - Data do Pedido
  - Previsão de Início
  - Previsão de Término
  - Início da Produção
- Barra de progresso calculada automaticamente
- Informações do anexo (se houver)
- Data da última atualização

### Indicadores de Status

- **Verde (No Prazo)**: Progresso menor que 75%
- **Amarelo (Atenção)**: Progresso entre 75% e 100%
- **Vermelho (Atrasado)**: Progresso acima de 100%

### Funcionalidades Adicionais

- **Busca**: Filtre OPDs pelo número
- **Auto-atualização**: Atualize os dados automaticamente a cada 30 segundos
- **Atualização manual**: Botão para forçar atualização imediata
- **Contador**: Visualize o total de OPDs e resultados filtrados

## Banco de Dados

### Estrutura da Tabela `opds`

```sql
CREATE TABLE opds (
  id INTEGER PRIMARY KEY,
  opd VARCHAR(255),
  numero VARCHAR(255) NOT NULL,
  data_pedido DATE,
  previsao_inicio DATE,
  previsao_termino DATE,
  inicio_producao DATE,
  tipo_opd VARCHAR(50),
  responsavel_opd VARCHAR(100),
  atividades_opd TEXT,
  anexo_pedido JSONB,
  registros_atividade TEXT,
  created TIMESTAMP,
  updated TIMESTAMP
);
```

### Índices

- `idx_opds_numero` - Otimiza buscas por número
- `idx_opds_tipo` - Otimiza filtros por tipo
- `idx_opds_responsavel` - Otimiza filtros por responsável

## API Endpoints

### GET /api/opds

Retorna todas as OPDs ordenadas por número decrescente.

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 96,
      "numero": "3212025",
      "tipo_opd": "PAI",
      "responsavel_opd": "PCP",
      ...
    }
  ],
  "total": 27
}
```

## Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm start` - Inicia servidor de produção
- `npm run import-csv` - Importa dados do CSV para o banco

## Contribuindo

Para adicionar novas OPDs ou atualizar existentes:

1. Edite o arquivo `cadastro_opd.csv`
2. Execute `npm run import-csv`
3. O portal será atualizado automaticamente

## Licença

Este projeto é proprietário da Pili.
