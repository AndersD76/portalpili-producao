'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DadosOrcamento, ItemOrcamento } from '@/lib/comercial/orcamento-pdf';
import CampoCNPJ from '@/components/comercial/CampoCNPJ';

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
  const [quantidadesOpcionais, setQuantidadesOpcionais] = useState<Record<number, number>>({});

  // Step 3
  const [quantidade, setQuantidade] = useState(1);
  const [descontoManual, setDescontoManual] = useState(0);
  const [cnpj, setCnpj] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteEmpresa, setClienteEmpresa] = useState('');
  const [decisorNome, setDecisorNome] = useState('');
  const [decisorTelefone, setDecisorTelefone] = useState('');
  const [decisorEmail, setDecisorEmail] = useState('');
  const [errosDecisor, setErrosDecisor] = useState<{ telefone?: string; email?: string }>({});
  const [errosForm, setErrosForm] = useState<Record<string, string>>({});
  const [prazoEntrega, setPrazoEntrega] = useState('120 dias');
  const [garantiaMeses, setGarantiaMeses] = useState(12);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Vendedor logado (para validacao)
  const [vendedorDados, setVendedorDados] = useState<{ telefone?: string; email?: string; whatsapp?: string } | null>(null);

  // Enviar para analise
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [resultadoEnvio, setResultadoEnvio] = useState<{ numeroProposta?: number; link?: string } | null>(null);

  const router = useRouter();
  const { authenticated, loading: authLoading, user: usuario } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) { router.push('/login'); return; }
    fetchData();
  }, [authLoading, authenticated]);

  // Buscar dados do vendedor logado para validacao
  useEffect(() => {
    if (!usuario?.id) return;
    fetch('/api/comercial/vendedores/me')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setVendedorDados({
            telefone: data.data.telefone,
            email: data.data.email,
            whatsapp: data.data.whatsapp,
          });
        }
      })
      .catch(() => {});
  }, [usuario?.id]);

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

  // Calcula preco unitario base de um opcional (sem multiplicar pela qt do opcional)
  const calcularPrecoOpcionalBase = useCallback((opc: PrecoOpcional): number => {
    if (!precoSelecionado) return 0;
    const val = Number(opc.valor) || 0;
    const precoBase = Number(precoSelecionado.preco) || 0;
    const comprimento = Number(precoSelecionado.comprimento) || 1;
    switch (opc.tipo_valor) {
      case 'POR_METRO': return val * comprimento;
      case 'PERCENTUAL': return (precoBase * val) / 100;
      case 'POR_UNIDADE': return val;
      case 'POR_LITRO': return val;
      default: return val; // FIXO
    }
  }, [precoSelecionado]);

  // Calcula preco total de um opcional (considerando qt para POR_UNIDADE)
  const calcularPrecoOpcional = useCallback((opc: PrecoOpcional): number => {
    const valorBase = calcularPrecoOpcionalBase(opc);
    if (opc.tipo_valor === 'POR_UNIDADE') {
      return valorBase * (quantidadesOpcionais[opc.id] || 1);
    }
    return valorBase;
  }, [calcularPrecoOpcionalBase, quantidadesOpcionais]);

  const calculo = useMemo(() => {
    if (!precoSelecionado) return null;
    const precoBaseVal = Number(precoSelecionado.preco) || 0;
    let subtotalOpcionais = 0;
    const itensOpcionais: ItemOrcamento[] = [];

    opcionaisDisponiveis
      .filter(o => opcionaisSelecionados.includes(o.id))
      .forEach(o => {
        const valorUnit = calcularPrecoOpcionalBase(o);
        const qtOpc = o.tipo_valor === 'POR_UNIDADE' ? (quantidadesOpcionais[o.id] || 1) : 1;
        const valor = valorUnit * qtOpc;
        subtotalOpcionais += valor;
        itensOpcionais.push({
          descricao: o.nome,
          tipo: 'OPCIONAL',
          quantidade: qtOpc,
          valorUnitario: valorUnit,
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
  }, [precoSelecionado, opcionaisSelecionados, opcionaisDisponiveis, quantidade, descontoManual, quantidadesOpcionais, calcularPrecoOpcionalBase]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const limparTelefone = (tel: string) => tel.replace(/\D/g, '');

  const toggleOpcional = (id: number) => {
    setOpcionaisSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCnpjDados = useCallback((dados: { razao_social: string; nome_fantasia?: string; telefone?: string; email?: string } | null) => {
    if (dados) {
      setClienteEmpresa(dados.nome_fantasia || dados.razao_social || '');
    }
  }, []);

  // Validacao telefone do decisor
  const validarTelefoneDecisor = useCallback((tel: string) => {
    if (!tel) {
      setErrosDecisor(prev => ({ ...prev, telefone: undefined }));
      return;
    }
    const telLimpo = limparTelefone(tel);
    if (telLimpo.length < 10) {
      setErrosDecisor(prev => ({ ...prev, telefone: 'Telefone invalido (minimo 10 digitos)' }));
      return;
    }
    // Comparar com dados do vendedor
    const vendTel = limparTelefone(vendedorDados?.telefone || '');
    const vendWhats = limparTelefone(vendedorDados?.whatsapp || '');
    const vendEmail = usuario?.email || '';
    if ((vendTel && telLimpo === vendTel) || (vendWhats && telLimpo === vendWhats)) {
      setErrosDecisor(prev => ({ ...prev, telefone: `Este telefone pertence ao vendedor (${vendEmail}). Informe o contato do decisor da compra.` }));
      return;
    }
    setErrosDecisor(prev => ({ ...prev, telefone: undefined }));
  }, [vendedorDados, usuario]);

  // Validacao email do decisor
  const validarEmailDecisor = useCallback((email: string) => {
    if (!email) {
      setErrosDecisor(prev => ({ ...prev, email: undefined }));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrosDecisor(prev => ({ ...prev, email: 'Email invalido' }));
      return;
    }
    // Comparar com dados do vendedor
    const vendEmail = (vendedorDados?.email || usuario?.email || '').toLowerCase();
    if (vendEmail && email.toLowerCase() === vendEmail) {
      setErrosDecisor(prev => ({ ...prev, email: `Este email pertence ao vendedor. Informe o email do decisor da compra.` }));
      return;
    }
    setErrosDecisor(prev => ({ ...prev, email: undefined }));
  }, [vendedorDados, usuario]);

  // Formatar telefone ao digitar
  const handleTelefoneChange = (val: string) => {
    let limpo = val.replace(/\D/g, '');
    if (limpo.length > 11) limpo = limpo.substring(0, 11);
    // Formatar
    let formatado = limpo;
    if (limpo.length > 6) {
      formatado = `(${limpo.substring(0, 2)}) ${limpo.substring(2, limpo.length - 4)}-${limpo.substring(limpo.length - 4)}`;
    } else if (limpo.length > 2) {
      formatado = `(${limpo.substring(0, 2)}) ${limpo.substring(2)}`;
    }
    setDecisorTelefone(formatado);
    validarTelefoneDecisor(limpo);
  };

  const handleEmailChange = (val: string) => {
    setDecisorEmail(val);
    validarEmailDecisor(val);
  };

  const validarFormulario = (): boolean => {
    const erros: Record<string, string> = {};
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length !== 14) erros.cnpj = 'CNPJ obrigatorio';
    if (!clienteEmpresa.trim()) erros.empresa = 'Empresa obrigatoria';
    if (!clienteNome.trim()) erros.clienteNome = 'Nome do contato obrigatorio';
    if (!decisorNome.trim()) erros.decisorNome = 'Nome do decisor obrigatorio';
    const telLimpo = decisorTelefone.replace(/\D/g, '');
    if (!telLimpo || telLimpo.length < 10) erros.decisorTelefone = 'Telefone do decisor obrigatorio (minimo 10 digitos)';
    if (!decisorEmail.trim()) {
      erros.decisorEmail = 'Email do decisor obrigatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decisorEmail)) {
      erros.decisorEmail = 'Email invalido';
    }
    // Check anti-vendor errors
    if (errosDecisor.telefone) erros.decisorTelefone = errosDecisor.telefone;
    if (errosDecisor.email) erros.decisorEmail = errosDecisor.email;

    setErrosForm(erros);
    return Object.keys(erros).length === 0;
  };

  const handleAbrirConfirmacao = () => {
    if (!precoSelecionado || !calculo) return;
    if (!validarFormulario()) return;
    setShowConfirmModal(true);
  };

  const buildDadosOrcamento = (): { dados: DadosOrcamento; itens: ItemOrcamento[] } | null => {
    if (!precoSelecionado || !calculo) return null;

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
        quantidade: item.quantidade * quantidade,
        valorTotal: item.valorTotal * quantidade,
      })),
    ];

    const dados: DadosOrcamento = {
      clienteNome: clienteNome || undefined,
      clienteEmpresa: clienteEmpresa || undefined,
      clienteCNPJ: cnpj ? cnpj.replace(/[^\d]/g, '') : undefined,
      decisorNome: decisorNome || undefined,
      decisorTelefone: decisorTelefone || undefined,
      decisorEmail: decisorEmail || undefined,
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

    return { dados, itens };
  };

  const handleEnviarAnalise = async () => {
    const result = buildDadosOrcamento();
    if (!result || !precoSelecionado || !calculo) return;

    setEnviando(true);
    setErroEnvio(null);

    try {
      const res = await fetch('/api/comercial/analise-orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dados_configurador: result.dados,
          produto: precoSelecionado.tipo_produto,
          quantidade,
          desconto_percentual: descontoManual,
          prazo_entrega: prazoEntrega,
          garantia_meses: garantiaMeses,
          forma_pagamento: formaPagamento || 'A combinar',
          observacoes: observacoes || null,
          cnpj: cnpj,
          cliente_empresa: clienteEmpresa,
          cliente_nome: clienteNome,
          decisor_nome: decisorNome,
          decisor_telefone: decisorTelefone,
          decisor_email: decisorEmail,
          valor_total: calculo.valorFinal,
          valor_equipamento: precoSelecionado.preco,
          valor_opcionais: calculo.subtotalOpcionais,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEnviado(true);
        setResultadoEnvio({ numeroProposta: data.numero_proposta, link: data.link });
        setShowConfirmModal(false);
      } else {
        setErroEnvio(data.error || 'Erro ao enviar proposta');
      }
    } catch {
      setErroEnvio('Erro de conexao. Tente novamente.');
    } finally {
      setEnviando(false);
    }
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
        <p className="text-gray-600 text-sm">Monte o equipamento e envie para analise comercial</p>
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
                  onClick={() => { setProduto(p); setPrecoBaseId(null); setOpcionaisSelecionados([]); setQuantidadesOpcionais({}); }}
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
                      onClick={() => { setPrecoBaseId(pb.id); setOpcionaisSelecionados([]); setQuantidadesOpcionais({}); }}
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
                          const checked = opcionaisSelecionados.includes(opc.id);
                          const isPorUnidade = opc.tipo_valor === 'POR_UNIDADE';
                          const valorBase = calcularPrecoOpcionalBase(opc);
                          const qtOpc = quantidadesOpcionais[opc.id] || 1;
                          const precoCalc = isPorUnidade ? valorBase * qtOpc : valorBase;
                          return (
                            <div key={opc.id}>
                              <label
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
                                       opc.tipo_valor === 'POR_UNIDADE' ? 'Por unidade' :
                                       opc.tipo_valor}
                                    </span>
                                  </div>
                                </div>
                                <span className={`text-sm font-semibold ${checked ? 'text-red-700' : 'text-gray-600'}`}>
                                  {precoCalc === 0 ? 'Incluso' : formatCurrency(precoCalc)}
                                </span>
                              </label>
                              {/* Campo de quantidade para POR_UNIDADE quando selecionado */}
                              {isPorUnidade && checked && (
                                <div className="ml-10 mt-1 mb-2 flex items-center gap-2">
                                  <label className="text-xs text-gray-500">Quantidade:</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={qtOpc}
                                    onChange={e => {
                                      const val = Math.max(1, parseInt(e.target.value) || 1);
                                      setQuantidadesOpcionais(prev => ({ ...prev, [opc.id]: val }));
                                    }}
                                    onClick={e => e.stopPropagation()}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-red-500"
                                  />
                                  <span className="text-xs text-gray-400">
                                    x {formatCurrency(valorBase)} = {formatCurrency(valorBase * qtOpc)}
                                  </span>
                                </div>
                              )}
                            </div>
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

              <div className="space-y-5">
                {/* CNPJ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CampoCNPJ
                    value={cnpj}
                    onChange={(v) => { setCnpj(v); setErrosForm(prev => { const n = { ...prev }; delete n.cnpj; return n; }); }}
                    onDadosCarregados={handleCnpjDados}
                    required
                    error={errosForm.cnpj}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={clienteEmpresa}
                      onChange={e => { setClienteEmpresa(e.target.value); setErrosForm(prev => { const n = { ...prev }; delete n.empresa; return n; }); }}
                      placeholder="Preenchido automaticamente pelo CNPJ"
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 ${errosForm.empresa ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errosForm.empresa && <p className="text-xs text-red-500 mt-1">{errosForm.empresa}</p>}
                  </div>
                </div>

                {/* Contato */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Contato <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={e => { setClienteNome(e.target.value); setErrosForm(prev => { const n = { ...prev }; delete n.clienteNome; return n; }); }}
                    placeholder="Nome do contato na empresa"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 ${errosForm.clienteNome ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errosForm.clienteNome && <p className="text-xs text-red-500 mt-1">{errosForm.clienteNome}</p>}
                </div>

                {/* Decisor da Compra */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Decisor da Compra</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Decisor <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={decisorNome}
                        onChange={e => { setDecisorNome(e.target.value); setErrosForm(prev => { const n = { ...prev }; delete n.decisorNome; return n; }); }}
                        placeholder="Quem decide a compra"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 ${errosForm.decisorNome ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errosForm.decisorNome && <p className="text-xs text-red-500 mt-1">{errosForm.decisorNome}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone Decisor <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        value={decisorTelefone}
                        onChange={e => { handleTelefoneChange(e.target.value); setErrosForm(prev => { const n = { ...prev }; delete n.decisorTelefone; return n; }); }}
                        placeholder="(00) 00000-0000"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 ${
                          errosDecisor.telefone || errosForm.decisorTelefone ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {(errosDecisor.telefone || errosForm.decisorTelefone) && (
                        <p className="text-xs text-red-500 mt-1">{errosDecisor.telefone || errosForm.decisorTelefone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Decisor <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={decisorEmail}
                        onChange={e => { handleEmailChange(e.target.value); setErrosForm(prev => { const n = { ...prev }; delete n.decisorEmail; return n; }); }}
                        placeholder="decisor@empresa.com"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 ${
                          errosDecisor.email || errosForm.decisorEmail ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {(errosDecisor.email || errosForm.decisorEmail) && (
                        <p className="text-xs text-red-500 mt-1">{errosDecisor.email || errosForm.decisorEmail}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantidade, Desconto, etc */}
                <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <span className="text-gray-500 truncate mr-2">
                            {item.descricao}
                            {item.quantidade > 1 && ` (x${item.quantidade})`}
                          </span>
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

                {Object.keys(errosForm).length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 font-medium">Preencha os campos obrigatorios marcados com *</p>
                  </div>
                )}

                {enviado ? (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <svg className="w-8 h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-green-800 font-semibold">Proposta enviada para analise!</p>
                    {resultadoEnvio?.numeroProposta && (
                      <p className="text-green-700 text-sm mt-1">
                        Proposta N. {String(resultadoEnvio.numeroProposta).padStart(4, '0')}
                      </p>
                    )}
                    <p className="text-green-600 text-xs mt-1">O analista comercial recebera o link via WhatsApp.</p>
                  </div>
                ) : (
                  <button
                    onClick={handleAbrirConfirmacao}
                    className="mt-4 w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Enviar para Analise Comercial
                  </button>
                )}

                {erroEnvio && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{erroEnvio}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmacao */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Enviar para Analise Comercial?</h3>
            <p className="text-sm text-gray-600 mb-4">
              O analista comercial recebera um link via WhatsApp para revisar e aprovar esta proposta.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente:</span>
                <span className="font-medium text-gray-900">{clienteEmpresa || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Produto:</span>
                <span className="font-medium text-gray-900">{precoSelecionado?.descricao || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valor Total:</span>
                <span className="font-bold text-red-600">{calculo ? formatCurrency(calculo.valorFinal) : '-'}</span>
              </div>
            </div>

            {erroEnvio && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">{erroEnvio}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirmModal(false); setErroEnvio(null); }}
                disabled={enviando}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarAnalise}
                disabled={enviando}
                className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium transition ${
                  enviando ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {enviando ? 'Enviando...' : 'Sim, Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
