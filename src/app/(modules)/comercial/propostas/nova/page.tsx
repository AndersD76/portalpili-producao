'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatarMoeda } from '@/lib/utils/format';

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
}

interface ConfigOpcao {
  id: number;
  grupo: string;
  codigo: string;
  nome: string;
  preco_adicional: number;
  tipo_produto: string;
}

// Modelos disponíveis
const MODELOS_TOMBADOR = ['TB-11F', 'TB-12F', 'TB-18F', 'TB-21F', 'TB-26F', 'TB-30F'];
const MODELOS_COLETOR = ['CL-45', 'CL-90', 'CL-180', 'CL-360'];

export default function NovaPropostaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [precosBase, setPrecosBase] = useState<PrecoBase[]>([]);
  const [opcionais, setOpcionais] = useState<ConfigOpcao[]>([]);
  const [opcionaisSelecionados, setOpcionaisSelecionados] = useState<number[]>([]);

  // Form state
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [tipoProduto, setTipoProduto] = useState<'TOMBADOR' | 'COLETOR'>('TOMBADOR');
  const [modelo, setModelo] = useState('');
  const [tamanho, setTamanho] = useState<number | null>(null);
  const [quantidade, setQuantidade] = useState(1);

  // Dados calculados
  const [precoBase, setPrecoBase] = useState(0);
  const [precoOpcionais, setPrecoOpcionais] = useState(0);

  // Carregar dados
  useEffect(() => {
    const fetchDados = async () => {
      try {
        const [clientesRes, precosRes] = await Promise.all([
          fetch('/api/comercial/clientes?limit=1000'),
          fetch('/api/comercial/precos/base'),
        ]);

        if (clientesRes.ok) {
          const data = await clientesRes.json();
          setClientes(data.data || []);
        }

        if (precosRes.ok) {
          const data = await precosRes.json();
          setPrecosBase(data.data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    fetchDados();
  }, []);

  // Carregar opcionais quando tipo_produto mudar
  useEffect(() => {
    if (!tipoProduto || !tamanho) {
      setOpcionais([]);
      return;
    }

    const fetchOpcionais = async () => {
      try {
        const res = await fetch(`/api/comercial/config-opcoes?tipo_produto=${tipoProduto}&tamanho=${tamanho}`);
        if (res.ok) {
          const data = await res.json();
          // Filtrar apenas opcionais com preço adicional
          const opcionaisComPreco = (data.data || []).filter((o: ConfigOpcao) => o.preco_adicional > 0);
          setOpcionais(opcionaisComPreco);
        }
      } catch (error) {
        console.error('Erro ao carregar opcionais:', error);
      }
    };
    fetchOpcionais();
  }, [tipoProduto, tamanho]);

  // Filtrar tamanhos disponíveis para o modelo selecionado
  const tamanhosDisponiveis = precosBase
    .filter(p => p.produto === tipoProduto && (!modelo || p.modelo === modelo))
    .sort((a, b) => a.tamanho - b.tamanho);

  // Calcular preço base quando tamanho mudar
  useEffect(() => {
    if (!tamanho) {
      setPrecoBase(0);
      return;
    }

    const preco = precosBase.find(
      p => p.produto === tipoProduto && p.tamanho === tamanho
    );
    setPrecoBase(preco?.preco || 0);
  }, [tipoProduto, tamanho, precosBase]);

  // Calcular preço dos opcionais
  useEffect(() => {
    const total = opcionaisSelecionados.reduce((sum, id) => {
      const opcional = opcionais.find(o => o.id === id);
      return sum + (opcional?.preco_adicional || 0);
    }, 0);
    setPrecoOpcionais(total);
  }, [opcionaisSelecionados, opcionais]);

  // Calcular total
  const precoUnitario = precoBase + precoOpcionais;
  const precoTotal = precoUnitario * quantidade;

  // Toggle opcional
  const toggleOpcional = (id: number) => {
    setOpcionaisSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Quando mudar tipo de produto, resetar modelo e tamanho
  useEffect(() => {
    setModelo('');
    setTamanho(null);
    setOpcionaisSelecionados([]);
  }, [tipoProduto]);

  // Criar proposta
  const handleSubmit = async () => {
    if (!clienteId) {
      alert('Selecione um cliente');
      return;
    }
    if (!tamanho) {
      alert('Selecione o comprimento');
      return;
    }

    setLoading(true);
    try {
      const cliente = clientes.find(c => c.id === clienteId);
      const userData = localStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      const payload = {
        vendedor_id: user?.id,
        vendedor_nome: user?.nome,
        cliente_id: clienteId,
        cliente_cnpj: cliente?.cpf_cnpj,
        cliente_razao_social: cliente?.razao_social,
        tipo_produto: tipoProduto,
        quantidade,
        configuracao: {
          modelo,
          tamanho,
          opcionais: opcionaisSelecionados,
        },
        valor_equipamento: precoTotal,
        valor_final: precoTotal,
        status: 'PENDENTE',
      };

      const res = await fetch('/api/comercial/propostas-comerciais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/comercial/propostas/${data.data.id}`);
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao criar proposta');
      }
    } catch (error) {
      console.error('Erro ao criar proposta:', error);
      alert('Erro ao criar proposta');
    } finally {
      setLoading(false);
    }
  };

  const modelos = tipoProduto === 'TOMBADOR' ? MODELOS_TOMBADOR : MODELOS_COLETOR;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/comercial"
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Nova Proposta</h1>
              <p className="text-sm text-gray-500">Criar proposta comercial</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cliente */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cliente</h2>
              <select
                value={clienteId || ''}
                onChange={(e) => setClienteId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.razao_social} {cliente.nome_fantasia ? `(${cliente.nome_fantasia})` : ''}
                  </option>
                ))}
              </select>
              <Link href="/comercial/clientes/novo" className="text-sm text-red-600 hover:text-red-700 mt-2 inline-block">
                + Cadastrar novo cliente
              </Link>
            </div>

            {/* Produto */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Produto</h2>

              {/* Tipo de Produto */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Produto</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      checked={tipoProduto === 'TOMBADOR'}
                      onChange={() => setTipoProduto('TOMBADOR')}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="font-medium">TOMBADOR</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      checked={tipoProduto === 'COLETOR'}
                      onChange={() => setTipoProduto('COLETOR')}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="font-medium">COLETOR</span>
                  </label>
                </div>
              </div>

              {/* Modelo */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                <select
                  value={modelo}
                  onChange={(e) => {
                    setModelo(e.target.value);
                    setTamanho(null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Selecione o modelo...</option>
                  {modelos.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Comprimento/Tamanho */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tipoProduto === 'TOMBADOR' ? 'Comprimento (metros)' : 'Grau de Rotação'}
                </label>
                <select
                  value={tamanho || ''}
                  onChange={(e) => setTamanho(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Selecione...</option>
                  {tamanhosDisponiveis.map(t => (
                    <option key={t.id} value={t.tamanho}>
                      {tipoProduto === 'TOMBADOR' ? `${t.tamanho}m` : `${t.tamanho}°`} - {formatarMoeda(t.preco)}
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
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            {/* Opcionais */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Opcionais</h2>
              {opcionais.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {tamanho ? 'Nenhum opcional disponível' : 'Selecione o produto para ver os opcionais'}
                </p>
              ) : (
                <div className="space-y-2">
                  {opcionais.map(opcional => (
                    <label
                      key={opcional.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition ${
                        opcionaisSelecionados.includes(opcional.id)
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={opcionaisSelecionados.includes(opcional.id)}
                          onChange={() => toggleOpcional(opcional.id)}
                          className="w-4 h-4 text-red-600 focus:ring-red-500 rounded"
                        />
                        <span className="font-medium text-gray-900">{opcional.nome}</span>
                      </div>
                      <span className="text-green-600 font-medium">
                        + {formatarMoeda(opcional.preco_adicional)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resumo */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo da Proposta</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Produto:</span>
                  <span className="font-medium">{tipoProduto}</span>
                </div>
                {modelo && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Modelo:</span>
                    <span className="font-medium">{modelo}</span>
                  </div>
                )}
                {tamanho && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{tipoProduto === 'TOMBADOR' ? 'Comprimento:' : 'Rotação:'}</span>
                    <span className="font-medium">{tipoProduto === 'TOMBADOR' ? `${tamanho}m` : `${tamanho}°`}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantidade:</span>
                  <span className="font-medium">{quantidade}</span>
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Preço Base (un.):</span>
                    <span className="font-medium">{formatarMoeda(precoBase)}</span>
                  </div>
                  {precoOpcionais > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Opcionais:</span>
                      <span>+ {formatarMoeda(precoOpcionais)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold text-gray-900">Total Estimado:</span>
                    <span className="font-bold text-red-600">{formatarMoeda(precoTotal)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !clienteId || !tamanho}
                className="w-full mt-6 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando...' : 'Criar Proposta'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
