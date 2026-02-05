'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Cliente {
  id: number;
  razao_social: string;
  nome_fantasia: string;
}

interface Oportunidade {
  id: number;
  titulo: string;
  cliente_nome: string;
}

export default function NovaAtividadeComercialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [formData, setFormData] = useState({
    tipo: 'LIGACAO',
    titulo: '',
    descricao: '',
    data_prevista: '',
    hora_prevista: '',
    cliente_id: '',
    oportunidade_id: '',
    prioridade: 'MEDIA',
  });

  useEffect(() => {
    fetchClientes();
    fetchOportunidades();
  }, []);

  const fetchClientes = async () => {
    try {
      const res = await fetch('/api/comercial/clientes?limit=500');
      const data = await res.json();
      if (data.success) {
        setClientes(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const fetchOportunidades = async () => {
    try {
      const res = await fetch('/api/comercial/oportunidades');
      const data = await res.json();
      if (data.success) {
        setOportunidades(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/comercial/atividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cliente_id: formData.cliente_id ? parseInt(formData.cliente_id) : null,
          oportunidade_id: formData.oportunidade_id ? parseInt(formData.oportunidade_id) : null,
          data_prevista: formData.data_prevista && formData.hora_prevista
            ? `${formData.data_prevista}T${formData.hora_prevista}:00`
            : formData.data_prevista || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push('/comercial/atividades');
      } else {
        alert(data.error || 'Erro ao criar atividade');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao criar atividade');
    } finally {
      setLoading(false);
    }
  };

  const tiposAtividade = [
    { value: 'LIGACAO', label: 'Ligacao', icon: '📞' },
    { value: 'EMAIL', label: 'Email', icon: '📧' },
    { value: 'REUNIAO', label: 'Reuniao', icon: '👥' },
    { value: 'VISITA', label: 'Visita', icon: '🚗' },
    { value: 'PROPOSTA', label: 'Proposta', icon: '📄' },
    { value: 'FOLLOWUP', label: 'Follow-up', icon: '🔄' },
    { value: 'OUTRO', label: 'Outro', icon: '📌' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/comercial/atividades"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Nova Atividade Comercial</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Atividade */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipo de Atividade</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {tiposAtividade.map((tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tipo: tipo.value }))}
                  className={`p-4 rounded-lg border-2 text-center transition ${
                    formData.tipo === tipo.value
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{tipo.icon}</div>
                  <div className="text-sm font-medium">{tipo.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Detalhes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titulo *
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Ligar para cliente sobre proposta"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descricao
                </label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Detalhes adicionais sobre a atividade..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Prevista
                  </label>
                  <input
                    type="date"
                    name="data_prevista"
                    value={formData.data_prevista}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Prevista
                  </label>
                  <input
                    type="time"
                    name="hora_prevista"
                    value={formData.hora_prevista}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <select
                  name="prioridade"
                  value={formData.prioridade}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vinculacao */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vinculacao (Opcional)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <select
                  name="cliente_id"
                  value={formData.cliente_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome_fantasia || cliente.razao_social}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oportunidade
                </label>
                <select
                  name="oportunidade_id"
                  value={formData.oportunidade_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selecione uma oportunidade</option>
                  {oportunidades.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.titulo} - {op.cliente_nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Botoes */}
          <div className="flex justify-end gap-3">
            <Link
              href="/comercial/atividades"
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.titulo}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Atividade'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
