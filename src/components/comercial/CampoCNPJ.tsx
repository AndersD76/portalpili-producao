'use client';

import { useState, useCallback, useEffect } from 'react';
import { formatarCNPJ, limparCNPJ, validarCNPJCompleto } from '@/lib/utils/format';

interface DadosCNPJ {
  razao_social: string;
  nome_fantasia?: string;
  situacao: string;
  porte?: string;
  segmento_sugerido?: string;
  potencial_estimado?: string;
  score_credito?: number;
  alertas?: string[];
  tags_sugeridas?: string[];
  proximo_passo?: string;
  endereco?: {
    logradouro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  telefone?: string;
  email?: string;
}

interface CampoCNPJProps {
  value: string;
  onChange: (cnpj: string) => void;
  onDadosCarregados?: (dados: DadosCNPJ | null) => void;
  onAnaliseIA?: (analise: unknown) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  error?: string;
}

export default function CampoCNPJ({
  value,
  onChange,
  onDadosCarregados,
  onAnaliseIA,
  disabled = false,
  className = '',
  label = 'CNPJ',
  required = false,
  error,
}: CampoCNPJProps) {
  const [loading, setLoading] = useState(false);
  const [dadosCNPJ, setDadosCNPJ] = useState<DadosCNPJ | null>(null);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [cnpjValido, setCnpjValido] = useState<boolean | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value;
    // Remove caracteres não numéricos exceto pontos, barras e traços
    valor = valor.replace(/[^\d.-/]/g, '');
    // Formata automaticamente
    const limpo = limparCNPJ(valor);
    if (limpo.length <= 14) {
      onChange(formatarCNPJ(limpo));
    }
  };

  const consultarCNPJ = useCallback(async () => {
    const cnpjLimpo = limparCNPJ(value);

    if (cnpjLimpo.length !== 14) {
      setCnpjValido(false);
      return;
    }

    if (!validarCNPJCompleto(cnpjLimpo)) {
      setCnpjValido(false);
      setErroConsulta('CNPJ inválido');
      return;
    }

    setCnpjValido(true);
    setLoading(true);
    setErroConsulta(null);

    try {
      const response = await fetch(`/api/comercial/cnpj/${cnpjLimpo}`);
      const result = await response.json();

      if (result.success) {
        const dados: DadosCNPJ = {
          razao_social: result.data.dados_receita.razao_social,
          nome_fantasia: result.data.dados_receita.nome_fantasia,
          situacao: result.data.dados_receita.situacao,
          porte: result.data.dados_receita.porte,
          endereco: result.data.dados_receita.endereco,
          telefone: result.data.dados_receita.telefone,
          email: result.data.dados_receita.email,
          segmento_sugerido: result.data.enriquecimento?.segmento_sugerido,
          potencial_estimado: result.data.enriquecimento?.potencial_estimado,
          score_credito: result.data.enriquecimento?.score_credito,
          alertas: result.data.enriquecimento?.alertas,
          tags_sugeridas: result.data.enriquecimento?.tags_sugeridas,
          proximo_passo: result.data.enriquecimento?.proximo_passo,
        };

        setDadosCNPJ(dados);
        onDadosCarregados?.(dados);

        if (result.data.analise_ia) {
          onAnaliseIA?.(result.data.analise_ia);
        }

        // Alerta se cliente já existe
        if (result.data.cliente_existente) {
          setErroConsulta('Cliente já cadastrado no sistema');
        }
      } else {
        setErroConsulta(result.error || 'Erro ao consultar CNPJ');
        setDadosCNPJ(null);
        onDadosCarregados?.(null);
      }
    } catch {
      setErroConsulta('Erro ao consultar CNPJ');
      setDadosCNPJ(null);
      onDadosCarregados?.(null);
    } finally {
      setLoading(false);
    }
  }, [value, onDadosCarregados, onAnaliseIA]);

  // Auto-consulta quando CNPJ está completo
  useEffect(() => {
    const cnpjLimpo = limparCNPJ(value);
    if (cnpjLimpo.length === 14 && validarCNPJCompleto(cnpjLimpo)) {
      const timer = setTimeout(() => {
        consultarCNPJ();
      }, 500); // Debounce de 500ms
      return () => clearTimeout(timer);
    } else {
      setDadosCNPJ(null);
      setCnpjValido(null);
      setErroConsulta(null);
    }
  }, [value, consultarCNPJ]);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled || loading}
          placeholder="00.000.000/0000-00"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10 ${
            error || erroConsulta
              ? 'border-red-500'
              : cnpjValido === true
              ? 'border-green-500'
              : 'border-gray-300'
          } ${disabled ? 'bg-gray-100' : ''}`}
        />

        {/* Indicador de status */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {loading && (
            <svg className="animate-spin h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {!loading && cnpjValido === true && !erroConsulta && (
            <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {!loading && (cnpjValido === false || erroConsulta) && (
            <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Mensagens de erro */}
      {(error || erroConsulta) && (
        <p className="text-sm text-red-500">{error || erroConsulta}</p>
      )}

      {/* Preview dos dados carregados */}
      {dadosCNPJ && !erroConsulta && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-green-800">Dados encontrados!</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Razão Social:</span>
              <p className="font-medium text-gray-800 truncate">{dadosCNPJ.razao_social}</p>
            </div>
            {dadosCNPJ.nome_fantasia && (
              <div>
                <span className="text-gray-600">Nome Fantasia:</span>
                <p className="font-medium text-gray-800 truncate">{dadosCNPJ.nome_fantasia}</p>
              </div>
            )}
            <div>
              <span className="text-gray-600">Situação:</span>
              <p className={`font-medium ${dadosCNPJ.situacao === 'ATIVA' ? 'text-green-600' : 'text-red-600'}`}>
                {dadosCNPJ.situacao}
              </p>
            </div>
            {dadosCNPJ.porte && (
              <div>
                <span className="text-gray-600">Porte:</span>
                <p className="font-medium text-gray-800">{dadosCNPJ.porte}</p>
              </div>
            )}
          </div>

          {/* Análise IA */}
          {(dadosCNPJ.potencial_estimado || dadosCNPJ.score_credito) && (
            <div className="pt-2 border-t border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-sm font-medium text-blue-800">Análise IA</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {dadosCNPJ.potencial_estimado && (
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    dadosCNPJ.potencial_estimado === 'ALTO' ? 'bg-green-200 text-green-800' :
                    dadosCNPJ.potencial_estimado === 'MEDIO' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-red-200 text-red-800'
                  }`}>
                    Potencial: {dadosCNPJ.potencial_estimado}
                  </span>
                )}
                {dadosCNPJ.score_credito && (
                  <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full font-medium">
                    Score: {dadosCNPJ.score_credito}
                  </span>
                )}
                {dadosCNPJ.segmento_sugerido && (
                  <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded-full font-medium">
                    {dadosCNPJ.segmento_sugerido}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Alertas */}
          {dadosCNPJ.alertas && dadosCNPJ.alertas.length > 0 && (
            <div className="pt-2 border-t border-green-200">
              <div className="flex items-center gap-1 text-orange-600 text-xs">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Atenção:</span>
              </div>
              <ul className="mt-1 text-xs text-orange-700 list-disc list-inside">
                {dadosCNPJ.alertas.map((alerta, idx) => (
                  <li key={idx}>{alerta}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Próximo passo sugerido */}
          {dadosCNPJ.proximo_passo && (
            <div className="pt-2 border-t border-green-200 text-xs">
              <span className="text-gray-600">Sugestão: </span>
              <span className="text-gray-800 italic">{dadosCNPJ.proximo_passo}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
