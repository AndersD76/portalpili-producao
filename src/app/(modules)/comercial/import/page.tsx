'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

type TipoImportacao = 'clientes' | 'oportunidades';
type StatusLinha = 'importado' | 'duplicata' | 'erro';

interface ResultadoLinha {
  linha: number;
  razao_social?: string;
  cliente?: string;
  status: StatusLinha;
  mensagem: string;
  duplicata_id?: number;
  duplicata_nome?: string;
  similaridade?: number;
}

interface Resumo {
  total: number;
  importados: number;
  duplicatas?: number;
  erros: number;
}

export default function ImportPage() {
  const { podeExecutarAcao, logout } = useAuth();
  const [tipo, setTipo] = useState<TipoImportacao>('clientes');
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [resultados, setResultados] = useState<ResultadoLinha[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<'preview' | 'importar'>('preview');
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return;

    // Detectar separador (;  ou ,)
    const sep = lines[0].includes(';') ? ';' : ',';
    const hdrs = lines[0].split(sep).map(h => h.trim().replace(/"/g, '').toLowerCase());
    setHeaders(hdrs);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(sep).map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      hdrs.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
    setCsvData(rows);
    setResultados([]);
    setResumo(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const mapearCampos = (rows: Record<string, string>[]): Record<string, string>[] => {
    if (tipo === 'clientes') {
      return rows.map(r => ({
        razao_social: r.razao_social || r.razao || r.empresa || r.nome || r.cliente || '',
        nome_fantasia: r.nome_fantasia || r.fantasia || '',
        cnpj: r.cnpj || r.cpf_cnpj || '',
        cidade: r.cidade || r.municipio || '',
        estado: r.estado || r.uf || '',
        telefone: r.telefone || r.fone || r.tel || '',
        email: r.email || r['e-mail'] || '',
        segmento: r.segmento || r.setor || '',
        vendedor: r.vendedor || r.representante || '',
      }));
    } else {
      return rows.map(r => ({
        cliente: r.cliente || r.empresa || r.razao_social || '',
        titulo: r.titulo || r.oportunidade || r.descricao || '',
        valor: r.valor || r.valor_estimado || '',
        estagio: r.estagio || r.fase || r.etapa || 'PROSPECCAO',
        vendedor: r.vendedor || r.representante || '',
        produto: r.produto || r.tipo_produto || r.equipamento || '',
        observacoes: r.observacoes || r.obs || '',
      }));
    }
  };

  const handleImport = async (modoExec: 'preview' | 'importar') => {
    if (csvData.length === 0) return;
    setLoading(true);
    setModo(modoExec);

    try {
      const dadosMapeados = mapearCampos(csvData);
      const res = await fetch('/api/comercial/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          dados: dadosMapeados,
          modo: modoExec,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setResultados(data.detalhes || []);
        setResumo(data.resumo || null);
      } else {
        alert(data.error || 'Erro na importação');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar importação');
    } finally {
      setLoading(false);
    }
  };

  if (!podeExecutarAcao('COMERCIAL', 'criar')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Sem permissão para importar dados.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/comercial" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition" title="Voltar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">Importar Dados CSV</h1>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/comercial/dashboard" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                Dashboard
              </Link>
              <Link href="/comercial" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
                Pipeline
              </Link>
              <Link href="/comercial/clientes" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Clientes
              </Link>
              <Link href="/comercial/configurador" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Orçamento
              </Link>
              <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition" title="Sair">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Tipo + Upload */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de dados</label>
            <select
              value={tipo}
              onChange={(e) => { setTipo(e.target.value as TipoImportacao); setCsvData([]); setResultados([]); setResumo(null); }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
            >
              <option value="clientes">Clientes</option>
              <option value="oportunidades">Oportunidades</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo CSV</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            />
          </div>
        </div>

        {/* Campos esperados */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <strong>Campos esperados ({tipo}):</strong>{' '}
          {tipo === 'clientes'
            ? 'razao_social, nome_fantasia, cnpj, cidade, estado, telefone, email, segmento, vendedor'
            : 'cliente (nome/CNPJ), titulo, valor, estagio, vendedor, produto, observacoes'}
        </div>
      </div>

      {/* Preview dos dados */}
      {csvData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              {csvData.length} registros carregados
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleImport('preview')}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
              >
                {loading && modo === 'preview' ? 'Analisando...' : 'Analisar Duplicatas'}
              </button>
              {resumo && (
                <button
                  onClick={() => handleImport('importar')}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                >
                  {loading && modo === 'importar' ? 'Importando...' : `Importar (${resumo.importados})`}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  {headers.slice(0, 6).map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {csvData.slice(0, 50).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    {headers.slice(0, 6).map(h => (
                      <td key={h} className="px-4 py-2 text-gray-700 max-w-[200px] truncate">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData.length > 50 && (
              <p className="px-4 py-2 text-center text-gray-400 text-sm">
                ...e mais {csvData.length - 50} registros
              </p>
            )}
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Resultado da Analise</h3>
            {resumo && (
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-600 font-medium">{resumo.importados} prontos</span>
                {resumo.duplicatas !== undefined && resumo.duplicatas > 0 && (
                  <span className="text-yellow-600 font-medium">{resumo.duplicatas} duplicatas</span>
                )}
                {resumo.erros > 0 && (
                  <span className="text-red-600 font-medium">{resumo.erros} erros</span>
                )}
                <span className="text-gray-500">de {resumo.total} total</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Linha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mensagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resultados.map((r, i) => (
                  <tr key={i} className={`
                    ${r.status === 'importado' ? 'bg-green-50' : ''}
                    ${r.status === 'duplicata' ? 'bg-yellow-50' : ''}
                    ${r.status === 'erro' ? 'bg-red-50' : ''}
                  `}>
                    <td className="px-4 py-2 text-gray-500">{r.linha}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{r.razao_social || r.cliente}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'importado' ? 'bg-green-100 text-green-800' :
                        r.status === 'duplicata' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {r.status === 'importado' ? 'OK' : r.status === 'duplicata' ? 'Duplicata' : 'Erro'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {r.mensagem}
                      {r.duplicata_nome && (
                        <span className="text-yellow-700 ml-1">
                          ({r.duplicata_nome}{r.similaridade ? ` - ${(r.similaridade * 100).toFixed(0)}%` : ''})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
