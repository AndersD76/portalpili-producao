# Instruções de Atualização - Portal Pili

## 📋 O que foi corrigido

### 1. **Schema do Banco de Dados** ✅
- Adicionado campo `dias_programados` nas atividades
- Adicionado campo `requer_formulario` e `tipo_formulario`
- Criada tabela `configuracao_etapas` com todas as 20 etapas
- Criada tabela `formularios_preenchidos` para armazenar formulários
- Criada tabela `notificacoes` para gerenciar emails
- Criada tabela `configuracao_emails` para emails dos responsáveis
- Criada view `vw_status_opds` para dashboard
- Adicionado triggers para atualizar timestamps automaticamente

### 2. **Tipos TypeScript** ✅
- Atualizados todos os tipos em `src/types/atividade.ts`
- Adicionadas 6 novas etapas ao enum `EstagioOPD`
- Criados tipos para os 4 formulários:
  - `DadosPreparacao`
  - `DadosDesembarquePreInstalacao`
  - `DadosLiberacaoEmbarque`
  - `DadosEntrega`
- Adicionados tipos para `Notificacao`, `ConfiguracaoEmail`, `StatusOPD`

### 3. **APIs Criadas/Atualizadas** ✅
- ✅ `PUT /api/atividades/[numero]` - Atualizada com novos campos
- ✅ `PATCH /api/atividades/[numero]/[id]` - Atualizada com novos campos
- ✅ `POST /api/formularios/[numero]` - Nova API para salvar formulários
- ✅ `GET /api/formularios/[numero]` - Buscar formulários de uma OPD
- ✅ `GET /api/configuracao-etapas` - Buscar etapas configuradas
- ✅ `POST /api/configuracao-etapas` - Criar atividades automaticamente

### 4. **Componentes Criados** ✅
- ✅ `FormularioDinamico.tsx` - Componente principal que decide qual formulário mostrar
- ✅ `FormularioPreparacao.tsx` - Formulário de PREPARAÇÃO (Produção)
- ⏳ `FormularioDesembarque.tsx` - A criar
- ⏳ `FormularioLiberacaoEmbarque.tsx` - A criar
- ⏳ `FormularioEntrega.tsx` - A criar

## 🚀 Como Executar a Atualização

### Passo 1: Atualizar o Schema do Banco

```bash
node scripts/run-update-schema.js
```

Este script irá:
- Criar as novas tabelas
- Adicionar os novos campos
- Inserir as 20 etapas configuradas
- Inserir emails padrão dos responsáveis
- Criar índices e triggers

### Passo 2: Verificar se deu certo

Após executar, você deve ver:

```
✅ Schema atualizado com sucesso!

📋 Tabelas no banco:
  - opds
  - registros_atividades
  - configuracao_etapas
  - formularios_preenchidos
  - notificacoes
  - configuracao_emails

🔢 Etapas configuradas:
  1. LIBERAÇÃO FINANCEIRA - FINANCEIRO
  2. CRIAÇÃO DA OPD - PCP
  ...
  20. INSTALAÇÃO E ENTREGA - INSTALAÇÃO [ENTREGA]
```

### Passo 3: Atualizar Emails dos Responsáveis

**IMPORTANTE**: Edite o arquivo `scripts/update-schema.sql` linha 129-136 e coloque os emails reais:

```sql
INSERT INTO configuracao_emails (responsavel, email, nome) VALUES
('FINANCEIRO', 'financeiro@suaempresa.com', 'Financeiro'),
('PCP', 'pcp@suaempresa.com', 'PCP'),
-- ... resto dos emails
```

Depois execute novamente o script.

### Passo 4: Criar Atividades Automaticamente para uma OPD

Quando criar uma nova OPD, você pode gerar as 20 atividades automaticamente:

```bash
# Fazer request POST via API ou frontend
POST /api/configuracao-etapas
{
  "numero_opd": "3242025",
  "data_inicio": "2025-01-15"
}
```

Isso irá:
- Criar as 20 atividades sequencialmente
- Calcular as datas previstas automaticamente
- Enviar notificação para o responsável da primeira etapa

## 📝 Como Funciona o Fluxo

### 1. **Usuário marca checkbox de uma atividade**

Quando o usuário clicar no checkbox de uma atividade que `requer_formulario = true`, o sistema deve:

1. Verificar se `requer_formulario` é `true`
2. Abrir modal com o formulário correspondente ao `tipo_formulario`
3. Usuário preenche o formulário
4. Ao salvar:
   - Salva formulário em `formularios_preenchidos`
   - Atualiza atividade para status `CONCLUÍDA`
   - Busca próxima atividade
   - Envia notificação por email para o próximo responsável

### 2. **Quais etapas requerem formulário?**

| Etapa | Requer Formulário | Tipo |
|-------|------------------|------|
| PRODUÇÃO | ✅ | PREPARACAO |
| DESEMBARQUE E PRÉ INSTALAÇÃO | ✅ | DESEMBARQUE_PRE_INSTALACAO |
| LIBERAÇÃO E EMBARQUE | ✅ | LIBERACAO_EMBARQUE |
| INSTALAÇÃO E ENTREGA | ✅ | ENTREGA |

### 3. **Estrutura dos Formulários**

Cada formulário tem campos específicos mapeados dos PDFs que você enviou:

#### PREPARAÇÃO
- Dados do cliente e equipamento
- Data prevista de início
- Técnicos designados
- Checklist de documentos

#### DESEMBARQUE
- Verificação de desembarque (nota fiscal, série, etc.)
- Verificação de pré-instalação (obra civil, painel, etc.)
- Upload de imagens

#### LIBERAÇÃO E EMBARQUE
- Checklist de documentação
- Verificação da estrutura mecânica
- Verificação do sistema hidráulico
- Verificação do sistema elétrico
- Checklist de embalagem e transporte

#### ENTREGA
- Dados do cliente e equipamento
- Verificações e ajustes (múltiplos checkboxes)
- Testes (subir plataforma, descer, com carga, etc.)
- Videos e imagens
- Treinamento operacional
- Termos de aceite

## ⚠️ AINDA FALTA FAZER

### Componentes de Formulários (3 faltando)
- [ ] `FormularioDesembarque.tsx`
- [ ] `FormularioLiberacaoEmbarque.tsx`
- [ ] `FormularioEntrega.tsx`

### Atualizar Componente de Atividades
- [ ] Atualizar `AtividadeItem.tsx` para detectar quando precisa abrir formulário
- [ ] Adicionar modal para mostrar formulários
- [ ] Adicionar lógica de checkbox que abre formulário se necessário

### Sistema de Notificações
- [ ] Instalar `nodemailer`: `npm install nodemailer @types/nodemailer`
- [ ] Criar API `/api/notificacoes/enviar` para processar fila
- [ ] Configurar SMTP (Gmail, SendGrid, etc.)
- [ ] Criar job/cron para enviar emails pendentes

### Interface
- [ ] Atualizar página de detalhes da OPD para mostrar formulários preenchidos
- [ ] Adicionar indicador visual de quais etapas requerem formulário
- [ ] Mostrar preview dos formulários já preenchidos

## 📧 Configurar Emails

Você precisará configurar as variáveis de ambiente no `.env.local`:

```env
# Banco de dados (já existe)
DATABASE_URL=your_neon_db_url

# SMTP para envio de emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seuemail@gmail.com
SMTP_PASS=suasenha
SMTP_FROM=Portal Pili <noreply@empresa.com>
```

## 🎯 Próximos Passos Recomendados

1. **Execute o script de atualização do banco**
   ```bash
   node scripts/run-update-schema.js
   ```

2. **Teste criar atividades automaticamente** via API

3. **Complete os 3 formulários restantes** (posso fazer isso se quiser)

4. **Integre os formulários no componente de atividades**

5. **Configure o sistema de emails**

6. **Teste o fluxo completo**

## 📊 Estrutura Atualizada das Tabelas

```sql
opds (sem alterações)

registros_atividades
  + dias_programados INTEGER
  + requer_formulario BOOLEAN
  + tipo_formulario VARCHAR(100)
  + formulario_anexo JSONB

configuracao_etapas (NOVA)
  - 20 etapas padrão do sistema

formularios_preenchidos (NOVA)
  - Armazena todos os formulários preenchidos

notificacoes (NOVA)
  - Fila de emails para enviar

configuracao_emails (NOVA)
  - Emails dos responsáveis
```

## ❓ Dúvidas?

Execute o script e me avise se der algum erro. Posso ajudar a:
- Completar os formulários restantes
- Configurar o sistema de emails
- Integrar tudo no frontend
- Fazer ajustes no schema se necessário

---

**Criado em:** 16/11/2025
**Status:** ✅ Schema pronto | ⏳ Formulários em andamento
