'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Cliente {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  cpf_cnpj: string;
}

interface PrecoBase {
  id: number;
  produto: string;
  modelo: string;
  tamanho: number;
  preco: number;
  descricao: string;
  tipo: string;
}

interface Opcional {
  id: number;
  nome: string;
  codigo: string;
  preco: number;
  categoria: string;
  descricao: string;
}

interface CalculoResultado {
  precoBase: number;
  subtotalOpcionais: number;
  subtotal: number;
  desconto: number;
  descontoValor: number;
  total: number;
}

export default function NovaPropostaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [precosBase, setPrecosBase] = useState<PrecoBase[]>([]);
  const [opcionais, setOpcionais] = useState<Opcional[]>([]);
  const [user, setUser] = useState<{ id: number; nome: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo_produto: 'TOMBADOR',
    modelo: '',
    comprimento: '',
    quantidade: 1,
    opcionais_ids: [] as number[],
    observacoes: '',
    desconto_manual: 0,
  });

  const [calculo, setCalculo] = useState<CalculoResultado | null>(null);
  const [precoSelecionado, setPrecoSelecionado] = useState<PrecoBase | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchDados();
  }, []);

  useEffect(() => {
    // Filtrar preços base quando tipo_produto muda
    if (formData.tipo_produto && precosBase.length > 0) {
      const precosFiltrados = precosBase.filter(p => p.produto === formData.tipo_produto);
      if (precosFiltrados.length > 0 && !formData.modelo) {
        setFormData(prev => ({ ...prev, modelo: precosFiltrados[0].modelo }));
      }
    }
  }, [formData.tipo_produto, precosBase]);

  useEffect(() => {
    // Atualizar preço quando modelo/tamanho muda
    if (formData.modelo && formData.comprimento) {
      const preco = precosBase.find(
        p => p.produto === formData.tipo_produto &&
             p.modelo === formData.modelo &&
             p.tamanho === parseInt(formData.comprimento)
      );
      setPrecoSelecionado(preco || null);
    }
  }, [formData.modelo, formData.comprimento, formData.tipo_produto, precosBase]);

  const fetchDados = async () => {
    try {
      const [clientesRes, precosRes, opcionaisRes] = await Promise.all([
        fetch('/api/comercial/clientes?limit=1000'),
        fetch('/api/comercial/precos/base'),
        fetch('/api/comercial/precos/opcionais'),
      ]);

      if (clientesRes.ok) {
        const data = await clientesRes.json();
        setClientes(data.data || []);
      }

      if (precosRes.ok) {
        const data = await precosRes.json();
        setPrecosBase(data.data || []);
      }

      if (opcionaisRes.ok) {
        const data = await opcionaisRes.json();
        setOpcionais(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const calcularPreco = async () => {
    if (!precoSelecionado) return;

    setCalculando(true);
    try {
      const response = await fetch('/api/comercial/propostas/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoProduto: formData.tipo_produto,
          modelo: formData.modelo,
          comprimento: parseInt(formData.comprimento),
          quantidade: formData.quantidade,
          opcionaisSelecionados: formData.opcionais_ids,
          descontoManual: formData.desconto_manual,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCalculo(data);
      }
    } catch (error) {
      console.error('Erro ao calcular:', error);
    } finally {
      setCalculando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente_id) {
      alert('Selecione um cliente');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/comercial/propostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: parseInt(formData.cliente_id),
          vendedor_id: user?.id || 1,
          tipo_produto: formData.tipo_produto,
          modelo: formData.modelo,
          comprimento: formData.tipo_produto === 'TOMBADOR' ? parseInt(formData.comprimento) : undefined,
          angulo_giro: formData.tipo_produto === 'COLETOR' ? parseInt(formData.comprimento) : undefined,
          quantidade: formData.quantidade,
          opcionais_ids: formData.opcionais_ids,
          observacoes: formData.observacoes,
          condicoes_comerciais: {
            desconto_manual: formData.desconto_manual,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/comercial/propostas/${data.data.id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao criar proposta');
      }
    } catch (error) {
      console.error('Erro ao criar proposta:', error);
      alert('Erro ao criar proposta');
    } finally {
      setLoading(false);
    }
  };

  const toggleOpcional = (id: number) => {
    setFormData(prev => ({
      ...prev,
      opcionais_ids: prev.opcionais_ids.includes(id)
        ? prev.opcionais_ids.filter(i => i !== id)
        : [...prev.opcionais_ids, id],
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Obter modelos únicos para o tipo selecionado
  const modelosDisponiveis = [...new Set(
    precosBase
      .filter(p => p.produto === formData.tipo_produto)
      .map(p => p.modelo)
  )];

  // Obter tamanhos disponíveis para o modelo selecionado
  const tamanhosDisponiveis = precosBase
    .filter(p => p.produto === formData.tipo_produto && p.modelo === formData.modelo)
    .map(p => ({ tamanho: p.tamanho, preco: p.preco }))
    .sort((a, b) => a.tamanho - b.tamanho);

  // Opcionais filtrados por tipo de produto
  const opcionaisFiltrados = opcionais.filter(
    o => !o.categoria || o.categoria.includes(formData.tipo_produto) || o.categoria === 'GERAL'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/comercial"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Nova Proposta</h1>
                <p className="text-xs text-gray-500">Criar proposta comercial</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cliente */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Cliente</h2>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, cliente_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.razao_social} {cliente.nome_fantasia ? `(${cliente.nome_fantasia})` : ''}
                    </option>
                  ))}
                </select>
                <Link
                  href="/comercial/clientes/novo"
                  className="inline-block mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  + Cadastrar novo cliente
                </Link>
              </div>

              {/* Produto */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Produto</h2>

                {/* Tipo de Produto */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Produto</label>
                  <div className="flex gap-4">
                    {['TOMBADOR', 'COLETOR'].map((tipo) => (
                      <label key={tipo} className="flex items-center">
                        <input
                          type="radio"
                          name="tipo_produto"
                          value={tipo}
                          checked={formData.tipo_produto === tipo}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            tipo_produto: e.target.value,
                            modelo: '',
                            comprimento: '',
                          }))}
                          className="mr-2 text-red-600 focus:ring-red-500"
                        />
                        <span className="font-medium">{tipo}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Modelo */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                  <select
                    value={formData.modelo}
                    onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value, comprimento: '' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Selecione o modelo...</option>
                    {modelosDisponiveis.map((modelo) => (
                      <option key={modelo} value={modelo}>{modelo}</option>
                    ))}
                  </select>
                </div>

                {/* Comprimento/Grau */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.tipo_produto === 'TOMBADOR' ? 'Comprimento (metros)' : 'Grau de Rotação'}
                  </label>
                  <select
                    value={formData.comprimento}
                    onChange={(e) => setFormData(prev => ({ ...prev, comprimento: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={!formData.modelo}
                  >
                    <option value="">Selecione...</option>
                    {tamanhosDisponiveis.map((item) => (
                      <option key={item.tamanho} value={item.tamanho}>
                        {formData.tipo_produto === 'TOMBADOR'
                          ? `${item.tamanho}m - ${formatCurrency(item.preco)}`
                          : `${item.tamanho}° - ${formatCurrency(item.preco)}`
                        }
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantidade}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Opcionais */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Opcionais</h2>
                {opcionaisFiltrados.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhum opcional disponível</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {opcionaisFiltrados.map((opcional) => (
                      <label
                        key={opcional.id}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition ${
                          formData.opcionais_ids.includes(opcional.id)
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.opcionais_ids.includes(opcional.id)}
                          onChange={() => toggleOpcional(opcional.id)}
                          className="mr-3 text-red-600 focus:ring-red-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{opcional.nome}</div>
                          {opcional.descricao && (
                            <div className="text-xs text-gray-500">{opcional.descricao}</div>
                          )}
                        </div>
                        <div className="text-red-600 font-bold">
                          {formatCurrency(opcional.preco)}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Observações</h2>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>

            {/* Coluna Lateral - Resumo */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Resumo da Proposta</h2>

                {precoSelecionado ? (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Produto:</span>
                      <span className="font-medium">{formData.tipo_produto}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Modelo:</span>
                      <span className="font-medium">{formData.modelo}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {formData.tipo_produto === 'TOMBADOR' ? 'Comprimento:' : 'Rotação:'}
                      </span>
                      <span className="font-medium">
                        {formData.comprimento}{formData.tipo_produto === 'TOMBADOR' ? 'm' : '°'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Quantidade:</span>
                      <span className="font-medium">{formData.quantidade}</span>
                    </div>

                    <hr className="my-4" />

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Preço Base (un.):</span>
                      <span className="font-medium">{formatCurrency(precoSelecionado.preco)}</span>
                    </div>

                    {formData.opcionais_ids.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Opcionais ({formData.opcionais_ids.length}):</span>
                        <span className="font-medium">
                          {formatCurrency(
                            opcionais
                              .filter(o => formData.opcionais_ids.includes(o.id))
                              .reduce((sum, o) => sum + o.preco, 0)
                          )}
                        </span>
                      </div>
                    )}

                    <hr className="my-4" />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Estimado:</span>
                      <span className="text-red-600">
                        {formatCurrency(
                          (precoSelecionado.preco +
                           opcionais
                             .filter(o => formData.opcionais_ids.includes(o.id))
                             .reduce((sum, o) => sum + o.preco, 0)
                          ) * formData.quantidade
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={calcularPreco}
                      disabled={calculando}
                      className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium disabled:opacity-50"
                    >
                      {calculando ? 'Calculando...' : 'Recalcular Preço'}
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Selecione o produto para ver o resumo
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !formData.cliente_id || !precoSelecionado}
                  className="w-full mt-6 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Criando...' : 'Criar Proposta'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
