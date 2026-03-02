/**
 * Script para deletar e recriar templates WhatsApp com encoding UTF-8 correto.
 *
 * Uso:
 *   WHATSAPP_TOKEN=xxx node scripts/recreate-whatsapp-templates.js
 *   ou via Railway:
 *   railway run node scripts/recreate-whatsapp-templates.js
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WABA_ID = process.env.WHATSAPP_WABA_ID || '26007499902247097';
const API_VERSION = 'v22.0';

if (!WHATSAPP_TOKEN) {
  console.error('ERRO: WHATSAPP_TOKEN nao definido.');
  console.error('Uso: WHATSAPP_TOKEN=seu_token node scripts/recreate-whatsapp-templates.js');
  process.exit(1);
}

const TEMPLATES = [
  {
    name: 'status_check_propostas',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Ol\u00e1 {{1}}! Aqui \u00e9 a Pili Equipamentos.\n\nPrecisamos de uma atualiza\u00e7\u00e3o sobre {{2}} proposta(s) em negocia\u00e7\u00e3o.\n\nAcesse o link para atualizar:\n{{3}}\n\nEste link \u00e9 v\u00e1lido por 7 dias.\nObrigado!',
    example: ['Jo\u00e3o', '3', 'https://portalpili-producao-production.up.railway.app/status/abc123'],
  },
  {
    name: 'analise_orcamento',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Nova proposta para an\u00e1lise comercial!\n\nProposta N\u00ba {{1}}\nVendedor: {{2}}\nCliente: {{3}}\nProduto: {{4}}\nValor: {{5}}\n\nAcesse para revisar e aprovar:\n{{6}}\n\nLink v\u00e1lido por 7 dias.',
    example: ['0001', 'Jo\u00e3o Silva', 'Empresa ABC', 'Tombador', 'R$ 100.000,00', 'https://portalpili-producao-production.up.railway.app/analise/abc123'],
  },
  {
    name: 'proposta_aprovada',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Ol\u00e1 {{1}}! Sua proposta N\u00ba {{2}} foi aprovada!\n\nCliente: {{3}}\nProduto: {{4}}\nValor Final: {{5}}\n\nBaixe o PDF do or\u00e7amento:\n{{6}}\n\nEste link \u00e9 v\u00e1lido por 7 dias.',
    example: ['Jo\u00e3o', '0001', 'Empresa ABC', 'Tombador', 'R$ 100.000,00', 'https://portalpili-producao-production.up.railway.app/api/public/analise/abc123/pdf'],
  },
  {
    name: 'proposta_rejeitada',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Ol\u00e1 {{1}}, a proposta N\u00ba {{2}} precisa de ajustes.\n\nMotivo: {{3}}\n\nAcesse o configurador para revisar e reenviar.',
    example: ['Jo\u00e3o', '0001', 'Valor acima do limite aprovado'],
  },
];

async function run() {
  console.log('=== Recriando templates WhatsApp ===\n');

  // 1. Listar templates existentes
  console.log('1. Listando templates existentes...');
  const listRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates?fields=name,id,status&limit=20`,
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
  );
  const listData = await listRes.json();
  const existing = listData.data || [];
  const templateNames = TEMPLATES.map(t => t.name);

  for (const t of existing) {
    if (templateNames.includes(t.name)) {
      console.log(`   ${t.name}: ${t.status} (id: ${t.id})`);
    }
  }

  // 2. Deletar templates com encoding quebrado
  console.log('\n2. Deletando templates antigos...');
  for (const t of existing) {
    if (!templateNames.includes(t.name)) continue;

    const delRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates?name=${t.name}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      }
    );
    const delData = await delRes.json();
    console.log(`   ${t.name}: ${delRes.ok ? 'DELETADO' : 'ERRO'} ${JSON.stringify(delData)}`);
  }

  // 3. Aguardar um pouco para a Meta processar as exclusoes
  console.log('\n3. Aguardando 5s para a Meta processar exclusoes...');
  await new Promise(r => setTimeout(r, 5000));

  // 4. Criar templates novos com encoding correto
  console.log('\n4. Criando templates novos com encoding UTF-8...');
  for (const tmpl of TEMPLATES) {
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
    if (res.ok) {
      console.log(`   ${tmpl.name}: CRIADO (id: ${data.id}, status: ${data.status})`);
    } else {
      console.log(`   ${tmpl.name}: ERRO ${JSON.stringify(data.error || data)}`);
    }
  }

  // 5. Verificar resultado final
  console.log('\n5. Verificando templates apos recriacao...');
  const checkRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates?fields=name,status,language&limit=20`,
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
  );
  const checkData = await checkRes.json();
  for (const t of (checkData.data || [])) {
    if (templateNames.includes(t.name)) {
      console.log(`   ${t.name}: ${t.status}`);
    }
  }

  console.log('\n=== Concluido! ===');
  console.log('Templates UTILITY geralmente sao aprovados em minutos.');
  console.log('Verifique o status em: /api/admin/whatsapp-debug');
}

run().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
