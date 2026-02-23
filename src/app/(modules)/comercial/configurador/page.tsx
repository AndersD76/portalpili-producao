'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { gerarOrcamentoPDF, DadosOrcamento, ItemOrcamento } from '@/lib/comercial/orcamento-pdf';

interface PrecoBase {
  id: number;
  tipo_produto: string;
  modelo: string;
  comprimento?: number;
  descricao: string;
  preco: number;
  ativo: boolean;
  qt_cilindros?: number;
  qt_motores?: number;
  qt_oleo?: number;
  angulo_inclinacao?: string;
}

interface PrecoOpcional {
  id: number;
  categoria_nome: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tipo_valor: string;
  valor: number;
  ativo: boolean;
  produto: string;
  tamanhos_aplicaveis?: number[];
}

export default function ConfiguradorPage() {
  const [loading, setLoading] = useState(true);
  const [precosBase, setPrecosBase] = useState<PrecoBase[]>([]);
  const [opcionais, setOpcionais] = useState<PrecoOpcional[]>([]);

  // Step 1
  const [produto, setProduto] = useState<string>('');
  const [precoBaseId, setPrecoBaseId] = useState<number | null>(null);

  // Step 2
  const [opcionaisSelecionados, setOpcionaisSelecionados] = useState<number[]>([]);

  // Step 3
  const [quantidade, setQuantidade] = useState(1);
  const [descontoManual, setDescontoManual] = useState(0);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteEmpresa, setClienteEmpresa] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('120 dias');
  const [garantiaMeses, setGarantiaMeses] = useState(12);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const router = useRouter();
  const { authenticated, loading: authLoading, usuario } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) { router.push('/login'); return; }
    fetchData();
  }, [authLoading, authenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [baseRes, opcoesRes] = await Promise.all([
        fetch('/api/comercial/admin/precos?tipo=base&ativo=true'),
        fetch('/api/comercial/admin/precos?tipo=opcoes&ativo=true'),
      ]);
      const baseData = await baseRes.json();
      const opcoesData = await opcoesRes.json();
      if (baseData.success) setPrecosBase(baseData.data || []);
      if (opcoesData.success) setOpcionais(opcoesData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const precoSelecionado = useMemo(
    () => precosBase.find(p => p.id === precoBaseId) || null,
    [precosBase, precoBaseId]
  );

  const tamanhosDisponiveis = useMemo(
    () => precosBase.filter(p => p.tipo_produto === produto),
    [precosBase, produto]
  );

  const opcionaisDisponiveis = useMemo(() => {
    if (!precoSelecionado) return [];
    return opcionais.filter(o => {
      if (o.produto && o.produto !== precoSelecionado.tipo_produto && o.produto !== 'AMBOS') return false;
      if (o.tamanhos_aplicaveis && o.tamanhos_aplicaveis.length > 0 && precoSelecionado.comprimento) {
        if (!o.tamanhos_aplicaveis.includes(precoSelecionado.comprimento)) return false;
      }
      return true;
    });
  }, [opcionais, precoSelecionado]);

  const opcionaisAgrupados = useMemo(() => {
    const grupos: Record<string, PrecoOpcional[]> = {};
    opcionaisDisponiveis.forEach(o => {
      const cat = o.categoria_nome || 'Outros';
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(o);
    });
    return grupos;
  }, [opcionaisDisponiveis]);

  const calcularPrecoOpcional = (opc: PrecoOpcional): number => {
    if (!precoSelecionado) return 0;
    switch (opc.tipo_valor) {
      case 'POR_METRO': return opc.valor * (precoSelecionado.comprimento || 1);
      case 'PERCENTUAL': return (precoSelecionado.preco * opc.valor) / 100;
      case 'POR_UNIDADE': return opc.valor;
      case 'POR_LITRO': return opc.valor;
      default: return opc.valor; // FIXO
    }
  };

  const calculo = useMemo(() => {
    if (!precoSelecionado) return null;
    const precoBaseVal = precoSelecionado.preco;
    let subtotalOpcionais = 0;
    const itensOpcionais: ItemOrcamento[] = [];

    opcionaisDisponiveis
      .filter(o => opcionaisSelecionados.includes(o.id))
      .forEach(o => {
        const valor = calcularPrecoOpcional(o);
        subtotalOpcionais += valor;
        itensOpcionais.push({
          descricao: o.nome,
          tipo: 'OPCIONAL',
          quantidade: 1,
          valorUnitario: valor,
          valorTotal: valor,
        });
      });

    const subtotalUnitario = precoBaseVal + subtotalOpcionais;
    const subtotal = subtotalUnitario * quantidade;
    const descValor = subtotal * (descontoManual / 100);
    const valorFinal = subtotal - descValor;

    return {
      precoBase: precoBaseVal,
      subtotalOpcionais,
      subtotalUnitario,
      subtotal,
      descontoValor: descValor,
      valorFinal,
      itensOpcionais,
    };
  }, [precoSelecionado, opcionaisSelecionados, opcionaisDisponiveis, quantidade, descontoManual]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const toggleOpcional = (id: number) => {
    setOpcionaisSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleGerarPDF = () => {
    if (!precoSelecionado || !calculo) return;

    const itens: ItemOrcamento[] = [
      {
        descricao: precoSelecionado.descricao || `${precoSelecionado.tipo_produto} ${precoSelecionado.modelo || ''} ${precoSelecionado.comprimento || ''}`,
        tipo: 'BASE',
        quantidade: quantidade,
        valorUnitario: precoSelecionado.preco,
        valorTotal: precoSelecionado.preco * quantidade,
      },
      ...calculo.itensOpcionais.map(item => ({
        ...item,
        quantidade: quantidade,
        valorTotal: item.valorUnitario * quantidade,
      })),
    ];

    const dados: DadosOrcamento = {
      clienteNome: clienteNome || undefined,
      clienteEmpresa: clienteEmpresa || undefined,
      produto: precoSelecionado.tipo_produto,
      descricaoProduto: precoSelecionado.descricao || `${precoSelecionado.tipo_produto} ${precoSelecionado.modelo || ''} ${precoSelecionado.comprimento ? precoSelecionado.comprimento + 'm' : ''}`,
      tamanho: precoSelecionado.comprimento,
      dadosTecnicos: {
        qtCilindros: precoSelecionado.qt_cilindros,
        qtMotores: precoSelecionado.qt_motores,
        qtOleo: precoSelecionado.qt_oleo,
        anguloInclinacao: precoSelecionado.angulo_inclinacao,
      },
      itens,
      subtotal: calculo.subtotal,
      descontoPercentual: descontoManual || undefined,
      descontoValor: calculo.descontoValor || undefined,
      valorFinal: calculo.valorFinal,
      quantidade,
      prazoEntrega,
      garantiaMeses,
      formaPagamento: formaPagamento || 'A combinar',
      validadeDias: 30,
      observacoes: observacoes || undefined,
      vendedorNome: usuario?.nome,
      vendedorEmail: usuario?.email,
    };

    gerarOrcamentoPDF(dados);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/comercial" className="hover:text-red-600">Comercial</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Configurador</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Configurador de Orcamento</h1>
        <p className="text-gray-600 text-sm">Monte o equipamento e gere o PDF do orcamento</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Form */}
        <div className="lg:col-span-2 space-y-6">

          {/* STEP 1: Produto */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              Produto e Modelo
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {['TOMBADOR', 'COLETOR'].map(p => (
                <button
                  key={p}
                  onClick={() => { setProduto(p); setPrecoBaseId(null); setOpcionaisSelecionados([]); }}
                  className={`p-4 rounded-lg border-2 text-center font-bold transition ${
                    produto === p
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {produto && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Selecione o modelo/tamanho:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tamanhosDisponiveis.map(pb => (
                    <button
                      key={pb.id}
                      onClick={() => { setPrecoBaseId(pb.id); setOpcionaisSelecionados([]); }}
                      className={`p-3 rounded-lg border text-left transition ${
                        precoBaseId === pb.id
                          ? 'border-red-600 bg-red-50 ring-1 ring-red-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-sm text-gray-900">{pb.descricao}</div>
                      <div className="text-red-600 font-bold mt-1">{formatCurrency(pb.preco)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Opcionais */}
          {precoSelecionado && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                Opcionais
                {opcionaisSelecionados.length > 0 && (
                  <span className="text-sm font-normal text-gray-500">({opcionaisSelecionados.length} selecionado(s))</span>
                )}
              </h2>

              {Object.keys(opcionaisAgrupados).length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum opcional disponivel para este modelo.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(opcionaisAgrupados).map(([cat, items]) => (
                    <div key={cat}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{cat}</h3>
                      <div className="space-y-1">
                        {items.map(opc => {
                          const precoCalc = calcularPrecoOpcional(opc);
                          const checked = opcionaisSelecionados.includes(opc.id);
                          return (
                            <label
                              key={opc.id}
                              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                                checked ? 'bg-red-50 border border-red-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleOpcional(opc.id)}
                                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <div>
                                  <span className="text-sm font-medium text-gray-900">{opc.nome}</span>
                                  <span className="text-xs text-gray-400 ml-2">
                                    {opc.tipo_valor === 'FIXO' ? 'Fixo' :
                                     opc.tipo_valor === 'POR_METRO' ? 'Por metro' :
                                     opc.tipo_valor === 'PERCENTUAL' ? '%' :
                                     opc.tipo_valor}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-sm font-semibold ${checked ? 'text-red-700' : 'text-gray-600'}`}>
                                {precoCalc === 0 ? 'Incluso' : formatCurrency(precoCalc)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Condicoes */}
          {precoSelecionado && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                Condicoes Comerciais
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (opcional)</label>
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={e => setClienteNome(e.target.value)}
                    placeholder="Nome do contato"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa (opcional)</label>
                  <input
                    type="text"
                    value={clienteEmpresa}
                    onChange={e => setClienteEmpresa(e.target.value)}
                    placeholder="Nome da empresa"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={quantidade}
                    onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    step={0.5}
                    value={descontoManual}
                    onChange={e => setDescontoManual(Math.min(15, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Entrega</label>
                  <select
                    value={prazoEntrega}
                    onChange={e => setPrazoEntrega(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="90 dias">90 dias</option>
                    <option value="120 dias">120 dias</option>
                    <option value="150 dias">150 dias</option>
                    <option value="180 dias">180 dias</option>
                    <option value="A combinar">A combinar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Garantia</label>
                  <select
                    value={garantiaMeses}
                    onChange={e => setGarantiaMeses(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses</option>
                    <option value={18}>18 meses</option>
                    <option value={24}>24 meses</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                  <input
                    type="text"
                    value={formaPagamento}
                    onChange={e => setFormaPagamento(e.target.value)}
                    placeholder="Ex: 30/60/90 dias, BNDES, etc"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                  <textarea
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    rows={3}
                    placeholder="Observacoes adicionais..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Resumo */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-5 sticky top-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Resumo</h2>

            {!precoSelecionado ? (
              <p className="text-gray-400 text-sm">Selecione um produto e modelo para ver o resumo.</p>
            ) : calculo && (
              <>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Preco Base</span>
                    <span className="font-semibold">{formatCurrency(calculo.precoBase)}</span>
                  </div>

                  {calculo.itensOpcionais.length > 0 && (
                    <>
                      <div className="border-t pt-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Opcionais</span>
                      </div>
                      {calculo.itensOpcionais.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-500 truncate mr-2">{item.descricao}</span>
                          <span className="flex-shrink-0">{item.valorTotal === 0 ? 'Incluso' : formatCurrency(item.valorTotal)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600">Subtotal Opcionais</span>
                        <span className="font-semibold">{formatCurrency(calculo.subtotalOpcionais)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Unitario</span>
                    <span className="font-bold">{formatCurrency(calculo.subtotalUnitario)}</span>
                  </div>

                  {quantidade > 1 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">x {quantidade} unidades</span>
                      <span className="font-semibold">{formatCurrency(calculo.subtotal)}</span>
                    </div>
                  )}

                  {calculo.descontoValor > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Desconto ({descontoManual}%)</span>
                      <span className="font-semibold">- {formatCurrency(calculo.descontoValor)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t-2 border-red-600">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">TOTAL</span>
                    <span className="text-xl font-bold text-red-600">{formatCurrency(calculo.valorFinal)}</span>
                  </div>
                </div>

                <button
                  onClick={handleGerarPDF}
                  className="mt-6 w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Gerar Orcamento PDF
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
