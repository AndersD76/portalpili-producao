# ⚡ Setup Rápido - Railway

## Passo a Passo para Deploy

### 1️⃣ Deploy Inicial
1. Acesse https://railway.app
2. Faça login com GitHub
3. **New Project** → **Deploy from GitHub repo**
4. Selecione: `AndersD76/portalpili-producao`
5. Aguarde o deploy inicial (vai falhar por falta da DATABASE_URL)

### 2️⃣ Configurar Banco de Dados

**⚠️ NÃO adicione PostgreSQL do Railway!**

Vamos usar o **Neon DB existente** que já tem todos os dados.

1. No Railway, clique no serviço **portal-pili-production** (ou nome similar)
2. Vá na aba **"Variables"**
3. Clique em **"New Variable"**
4. Adicione:

**Nome:**
```
DATABASE_URL
```

**Valor:**
```
postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

5. Clique em **"Add"** ou **"Save"**

### 3️⃣ Redeploy Automático

O Railway detecta a mudança e faz **redeploy automático** em ~30 segundos.

### 4️⃣ Acessar a Aplicação

1. Vá na aba **"Deployments"**
2. Quando o status ficar **"Success" ✅**
3. Clique em **"View Logs"** para confirmar que conectou ao banco
4. Acesse a URL pública (ex: `portalpili-production.up.railway.app`)

---

## 🎯 Pronto!

✅ Aplicação online
✅ Conectada ao banco Neon com todos os dados
✅ Usuários já cadastrados
✅ OPDs disponíveis
✅ Sistema 100% funcional

---

## 🔧 Configurações Opcionais

### Adicionar Domínio Customizado
1. No Railway, vá em **Settings**
2. Em **Domains**, clique em **"Generate Domain"** ou **"Custom Domain"**
3. Configure o DNS conforme instruções

### Monitoramento
- Logs em tempo real: Aba **"Logs"**
- Métricas: Aba **"Metrics"** (CPU, RAM, Network)
- Deployments anteriores: Aba **"Deployments"**

---

## ⚠️ Importante

**Uploads de Arquivos:**
- A pasta `/public/uploads` **não persiste** no Railway (sistema de arquivos efêmero)
- Formulários com anexos funcionam, mas arquivos são perdidos em redeploy
- **Solução futura**: Integrar com S3, Cloudinary ou similar

**Limites do Neon DB (Free Tier):**
- 0.5 GB de storage
- 3 GB de transferência/mês
- Banco pausa após 7 dias de inatividade (reativa automaticamente)

---

## 🆘 Problemas?

**Build falhou:**
```bash
# Ver logs detalhados
railway logs
```

**Banco não conecta:**
- Verifique se copiou a DATABASE_URL completa
- Teste localmente: `psql "postgresql://neondb_owner:..."`
- Confirme que Neon DB está ativo em https://console.neon.tech

**Aplicação lenta:**
- Primeiro acesso pode demorar (cold start)
- Acessos subsequentes são rápidos

---

**Documentação Completa:** Ver [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)
