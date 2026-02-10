// Simular o que o frontend faz
const pipelineFromAPI = [
  { estagio: 'PROSPECCAO', quantidade: '85', valor_total: '55819147.40' },
  { estagio: 'EM_NEGOCIACAO', quantidade: '262', valor_total: '136406589.80' },
  { estagio: 'FECHADA', quantidade: '59', valor_total: '37432029.77' },
  { estagio: 'PERDIDA', quantidade: '100', valor_total: '72126503.44' },
  { estagio: 'SUSPENSO', quantidade: '26', valor_total: '12650879.40' },
  { estagio: 'SUBSTITUIDO', quantidade: '29', valor_total: '15778592.15' },
  { estagio: 'TESTE', quantidade: '47', valor_total: '6451300.00' }
];

const newPipeline = {
  prospeccao: { quantidade: 0, valor: 0 },
  qualificacao: { quantidade: 0, valor: 0 },
  proposta: { quantidade: 0, valor: 0 },
  em_analise: { quantidade: 0, valor: 0 },
  em_negociacao: { quantidade: 0, valor: 0 },
  fechada: { quantidade: 0, valor: 0 },
  perdida: { quantidade: 0, valor: 0 },
  suspenso: { quantidade: 0, valor: 0 },
  substituido: { quantidade: 0, valor: 0 },
  teste: { quantidade: 0, valor: 0 },
};

pipelineFromAPI.forEach(p => {
  const key = p.estagio.toLowerCase();
  const exists = newPipeline[key] !== undefined;
  console.log('Estagio:', p.estagio, '-> key:', key, '-> existe?', exists);
  if (newPipeline[key]) {
    newPipeline[key] = {
      quantidade: parseInt(p.quantidade) || 0,
      valor: parseFloat(p.valor_total) || 0,
    };
  }
});

console.log('\nResultado:');
console.log(JSON.stringify(newPipeline, null, 2));
