# 🚀 Guia de Deploy - Railway

## Pré-requisitos
- Conta no Railway (railway.app)
- Repositório no GitHub já configurado ✅

## Passo a Passo

### 1. Criar Projeto no Railway

1. Acesse https://railway.app
2. Faça login com GitHub
3. Clique em **"New Project"**
4. Selecione **"Deploy from GitHub repo"**
5. Escolha o repositório: `AndersD76/portalpili-producao`
6. Railway detectará Next.js automaticamente

### 2. Adicionar PostgreSQL

1. No projeto criado, clique em **"+ New"**
2. Selecione **"Database"** → **"Add PostgreSQL"**
3. O Railway criará o banco automaticamente
4. Anote as credenciais que aparecem

### 3. Configurar Variáveis de Ambiente

No painel do Railway, vá em **Variables** e adicione:

```env
# Database (Railway fornece automaticamente DATABASE_URL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Ou configure manualmente:
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}

# Next.js
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://seu-app.railway.app
```

### 4. Executar Migrations do Banco

Após o deploy, você precisa criar as tabelas no banco PostgreSQL do Railway.

**Opção 1: Via Railway CLI**
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Fazer login
railway login

# Conectar ao projeto
railway link

# Executar scripts
railway run node scripts/create-table.js
railway run node scripts/create-atividades-table.js
railway run node scripts/run-migrations.js
```

**Opção 2: Conectar direto ao banco**
1. No Railway, clique no PostgreSQL
2. Vá em **"Connect"**
3. Copie a **Connection URL**
4. Use um cliente SQL (DBeaver, pgAdmin, etc.)
5. Execute os scripts SQL manualmente:
   - `scripts/update-schema.sql`
   - `scripts/add-authentication-audit.sql`
   - `scripts/add-chat-opd.sql`
   - `scripts/add-data-entrega.sql`

### 5. Criar Usuário Inicial

Execute o script para criar o primeiro usuário:

```bash
railway run node scripts/insert-usuarios.js
```

Ou insira direto no banco:
```sql
INSERT INTO usuarios (nome, email, senha_hash, nivel_acesso, created, updated)
VALUES (
  'Admin',
  'admin@portalpili.com',
  'senha123', -- Mude isso em produção!
  'admin',
  NOW(),
  NOW()
);
```

### 6. Publicar a Aplicação

1. Cada push no GitHub fará deploy automático
2. Railway fornecerá uma URL pública (ex: `portalpili-producao.railway.app`)
3. Você pode configurar domínio customizado nas configurações

## 📦 Estrutura de Deploy

```
Railway Project
├── Web Service (Next.js)
│   ├── Auto-detected
│   ├── Build: npm run build
│   └── Start: npm start
└── PostgreSQL Database
    ├── Auto-provisioned
    └── Auto-connected
```

## ⚙️ Comandos Úteis Railway CLI

```bash
# Ver logs em tempo real
railway logs

# Executar comandos no ambiente
railway run [comando]

# Abrir banco de dados
railway connect postgres

# Ver variáveis
railway variables

# Deploy manual
railway up
```

## 🔒 Segurança Pós-Deploy

1. **Mudar senhas padrão** dos usuários
2. **Configurar variáveis de ambiente** secretas
3. **Desabilitar scripts sensíveis** em produção
4. **Configurar CORS** adequadamente
5. **Adicionar rate limiting** nas APIs

## 📊 Monitoramento

Railway fornece automaticamente:
- ✅ Logs em tempo real
- ✅ Métricas de uso (CPU, RAM, Rede)
- ✅ Deploy history
- ✅ Rollback com um clique

## 💰 Custos

- **$5/mês grátis** (suficiente para começar)
- Depois: ~$10-20/mês dependendo do uso
- PostgreSQL incluído no plano

## 🆘 Troubleshooting

### Build falha
- Verifique os logs: `railway logs`
- Confirme que `package.json` tem todos os scripts

### Banco não conecta
- Verifique se `DATABASE_URL` está configurada
- Teste conexão com: `railway connect postgres`

### Upload de arquivos não funciona
- Railway tem sistema de arquivos efêmero
- Considere usar S3, Cloudinary ou similares para uploads em produção

## 📝 Notas Importantes

⚠️ **Arquivos uploaded localmente não persistem no Railway!**
- A pasta `/public/uploads` é efêmera
- Solução: integrar com serviço de storage (S3, Cloudinary, etc.)

⚠️ **Banco de dados é persistente**
- Dados no PostgreSQL são salvos permanentemente
- Faça backups regulares

## 🔗 Links Úteis

- Railway Dashboard: https://railway.app/dashboard
- Documentação: https://docs.railway.app
- Next.js no Railway: https://docs.railway.app/guides/nextjs

---

Boa sorte com o deploy! 🚀
