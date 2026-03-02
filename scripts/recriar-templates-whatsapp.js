/**
 * Script para recriar templates WhatsApp com encoding UTF-8 correto
 *
 * 1. Deleta templates antigos (com ? nos acentos)
 * 2. Cria templates novos com encoding correto
 * 3. Mostra status final
 */

require('dotenv').config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WABA_ID = process.env.WHATSAPP_WABA_ID || '26007499902247097';
const API_VERSION = 'v22.0';

// Templates com encoding UTF-8 correto
const TEMPLATES_TO_CREATE = [
  {
    name: 'status_check_propostas',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Olá {{1}}! Aqui é a Pili Equipamentos.\n\nPrecisamos de uma atualização sobre {{2}} proposta(s) em negociação.\n\nAcesse o link para atualizar:\n{{3}}\n\nEste link é válido por 7 dias.\nObrigado!',
    example: ['João', '3', 'https://portalpili-producao-production.up.railway.app/status/abc123'],
  },
  {
    name: 'analise_orcamento',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Nova proposta para análise comercial!\n\nProposta Nº {{1}}\nVendedor: {{2}}\nCliente: {{3}}\nProduto: {{4}}\nValor: {{5}}\n\nAcesse para revisar e aprovar:\n{{6}}\n\nLink válido por 7 dias.',
    example: ['0001', 'João Silva', 'Empresa ABC', 'Tombador', 'R$ 100.000,00', 'https://portalpili-producao-production.up.railway.app/analise/abc123'],
  },
  {
    name: 'proposta_aprovada',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Olá {{1}}! Sua proposta Nº {{2}} foi aprovada!\n\nCliente: {{3}}\nProduto: {{4}}\nValor Final: {{5}}\n\nBaixe o PDF do orçamento:\n{{6}}\n\nEste link é válido por 7 dias.',
    example: ['João', '0001', 'Empresa ABC', 'Tombador', 'R$ 100.000,00', 'https://portalpili-producao-production.up.railway.app/api/public/analise/abc123/pdf'],
  },
  {
    name: 'proposta_rejeitada',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Olá {{1}}, a proposta Nº {{2}} precisa de ajustes.\n\nMotivo: {{3}}\n\nAcesse o configurador para revisar e reenviar.',
    example: ['João', '0001', 'Valor acima do limite aprovado'],
  },
];

async function listarTemplates() {
  console.log('\n📋 Listando templates existentes...');
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates?fields=name,id,status&limit=20`,
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
  );
  const data = await res.json();

  if (data.error) {
    console.error('❌ Erro ao listar:', data.error);
    return [];
  }

  const templates = data.data || [];
  console.log(`✅ Encontrados ${templates.length} templates:`);
  templates.forEach(t => console.log(`   - ${t.name} (${t.status})`));

  return templates;
}

async function deletarTemplates(templates) {
  console.log('\n🗑️  Deletando templates antigos...');
  const templateNames = TEMPLATES_TO_CREATE.map(t => t.name);
  const results = [];

  for (const tmpl of templates) {
    if (!templateNames.includes(tmpl.name)) {
      console.log(`   ⏭️  Pulando: ${tmpl.name} (não está na lista)`);
      continue;
    }

    try {
      const delRes = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates?name=${tmpl.name}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
        }
      );
      const delData = await delRes.json();

      if (delRes.ok && delData.success) {
        console.log(`   ✅ Deletado: ${tmpl.name}`);
        results.push({ name: tmpl.name, status: 'DELETED' });
      } else {
        console.log(`   ⚠️  Erro ao deletar ${tmpl.name}:`, delData);
        results.push({ name: tmpl.name, status: 'ERROR', detail: delData });
      }
    } catch (e) {
      console.error(`   ❌ Exception ao deletar ${tmpl.name}:`, e.message);
      results.push({ name: tmpl.name, status: 'ERROR', detail: e.message });
    }
  }

  return results;
}

async function criarTemplates() {
  console.log('\n✨ Criando templates com encoding correto...');
  const results = [];

  for (const tmpl of TEMPLATES_TO_CREATE) {
    try {
      const payload = {
        name: tmpl.name,
        category: tmpl.category,
        language: tmpl.language,
        components: [
          {
            type: 'BODY',
            text: tmpl.body,
            example: {
              body_text: [tmpl.example],
            },
          },
        ],
      };

      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (res.ok && data.id) {
        console.log(`   ✅ Criado: ${tmpl.name} (ID: ${data.id}, Status: ${data.status})`);
        results.push({ name: tmpl.name, status: 'CREATED', id: data.id, meta_status: data.status });
      } else {
        console.log(`   ⚠️  Erro ao criar ${tmpl.name}:`, data);
        results.push({ name: tmpl.name, status: 'ERROR', detail: data });
      }
    } catch (e) {
      console.error(`   ❌ Exception ao criar ${tmpl.name}:`, e.message);
      results.push({ name: tmpl.name, status: 'ERROR', detail: e.message });
    }
  }

  return results;
}

async function verificarStatus() {
  console.log('\n🔍 Status final dos templates:');
  const templates = await listarTemplates();

  const nossos = templates.filter(t =>
    TEMPLATES_TO_CREATE.map(tc => tc.name).includes(t.name)
  );

  console.log('\n📊 Resumo:');
  nossos.forEach(t => {
    const emoji = t.status === 'APPROVED' ? '✅' : t.status === 'PENDING' ? '⏳' : '❌';
    console.log(`   ${emoji} ${t.name}: ${t.status}`);
  });

  if (nossos.some(t => t.status === 'PENDING')) {
    console.log('\n⚠️  Templates em PENDING precisam ser aprovados pela Meta (pode levar algumas horas)');
  }
}

async function main() {
  console.log('🚀 Iniciando recriação de templates WhatsApp...\n');

  if (!WHATSAPP_TOKEN) {
    console.error('❌ WHATSAPP_TOKEN não encontrado no .env');
    process.exit(1);
  }

  try {
    // 1. Listar templates atuais
    const templatesExistentes = await listarTemplates();

    // 2. Deletar templates antigos
    if (templatesExistentes.length > 0) {
      await deletarTemplates(templatesExistentes);
      console.log('\n⏳ Aguardando 3 segundos antes de criar novos templates...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 3. Criar templates novos com encoding correto
    await criarTemplates();

    // 4. Verificar status final
    console.log('\n⏳ Aguardando 2 segundos antes de verificar status...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await verificarStatus();

    console.log('\n✅ Processo concluído!');
    console.log('\n💡 Dica: Acesse https://business.facebook.com/latest/whatsapp_manager para ver os templates');

  } catch (error) {
    console.error('\n❌ Erro no processo:', error);
    process.exit(1);
  }
}

main();
