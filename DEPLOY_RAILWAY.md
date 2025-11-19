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

### 2. Configurar Variáveis de Ambiente

⚠️ **IMPORTANTE**: Este projeto usa o **Neon DB** existente que já contém todos os dados (usuários, OPDs, atividades, etc.). **NÃO crie um novo PostgreSQL no Railway!**

No painel do Railway, clique no serviço **Next.js** e vá em **Variables**. Adicione:

```env
# Database - Usar o Neon DB existente
DATABASE_URL=postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# JWT Secret (necessário para autenticação)
JWT_SECRET=pili-production-secret-key-2025-change-in-production

# Next.js
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://seu-app.railway.app
```

**Salve as variáveis** e o Railway fará redeploy automaticamente.

### 3. Deploy Completo!

✅ Como você está usando o **Neon DB existente**, não precisa:
- Executar migrations (tabelas já existem)
- Criar usuários (já estão cadastrados)
- Importar dados (já estão no banco)

A aplicação já está **100% funcional** após o deploy!

### 4. Acessar a Aplicação

1. Cada push no GitHub fará deploy automático
2. Railway fornecerá uma URL pública (ex: `portalpili-producao.railway.app`)
3. Você pode configurar domínio customizado nas configurações

## 📦 Estrutura de Deploy

```
Railway Project
└── Web Service (Next.js)
    ├── Auto-detected
    ├── Build: npm run build
    ├── Start: npm start
    └── Database: Neon DB (externo)
        └── Connection via DATABASE_URL
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
- Verifique se `DATABASE_URL` do Neon está correta nas variáveis do Railway
- Teste a conexão localmente primeiro com: `psql "postgresql://neondb_owner:..."`
- Confirme que o Neon DB está ativo (não foi pausado por inatividade)

### Upload de arquivos não funciona
- Railway tem sistema de arquivos efêmero
- Considere usar S3, Cloudinary ou similares para uploads em produção

## 📝 Notas Importantes

⚠️ **Arquivos uploaded localmente não persistem no Railway!**
- A pasta `/public/uploads` é efêmera
- Solução: integrar com serviço de storage (S3, Cloudinary, etc.)

⚠️ **Banco de dados Neon DB**
- Dados no Neon DB são persistentes
- Neon tem **plano gratuito limitado**: 0.5 GB storage, 3 GB transferência/mês
- Neon pausa bancos inativos por 7 dias (reativam automaticamente na primeira conexão)
- Faça backups regulares do banco de produção

## 🔗 Links Úteis

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- Next.js no Railway: https://docs.railway.app/guides/nextjs
- Neon DB Console: https://console.neon.tech
- Neon DB Docs: https://neon.tech/docs

---

Boa sorte com o deploy! 🚀
