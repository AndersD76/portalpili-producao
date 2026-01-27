'use client';

import { useState, useRef, ReactNode } from 'react';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================
export interface ArquivoUpload {
  filename: string;
  url: string;
  size: number;
}

export interface SecaoConfig {
  titulo: string;
  cor: 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'gray' | 'teal';
  children: ReactNode;
}

export interface FormularioBaseProps {
  titulo: string;
  subtitulo?: string;
  opd: string;
  cliente?: string;
  loading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  children: ReactNode;
  // Campos opcionais padrão
  showProjetoAnexo?: boolean;
  projetoAnexo?: ArquivoUpload[] | null;
  onProjetoUpload?: (files: ArquivoUpload[]) => void;
  showObservacoes?: boolean;
  observacoes?: string;
  onObservacoesChange?: (value: string) => void;
  showResponsavel?: boolean;
  responsavel?: string;
  onResponsavelChange?: (value: string) => void;
  showFotos?: boolean;
  fotos?: ArquivoUpload[] | null;
  onFotosUpload?: (files: ArquivoUpload[]) => void;
  botaoSalvarTexto?: string;
}

// ============================================
// CORES DAS SEÇÕES
// ============================================
const CORES_SECAO = {
  red: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    title: 'text-red-900',
  },
  blue: {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    title: 'text-blue-900',
  },
  green: {
    border: 'border-green-300',
    bg: 'bg-green-50',
    title: 'text-green-900',
  },
  yellow: {
    border: 'border-yellow-300',
    bg: 'bg-yellow-50',
    title: 'text-yellow-900',
  },
  orange: {
    border: 'border-orange-300',
    bg: 'bg-orange-50',
    title: 'text-orange-900',
  },
  purple: {
    border: 'border-purple-300',
    bg: 'bg-purple-50',
    title: 'text-purple-900',
  },
  gray: {
    border: 'border-gray-300',
    bg: 'bg-gray-50',
    title: 'text-gray-900',
  },
  teal: {
    border: 'border-teal-300',
    bg: 'bg-teal-50',
    title: 'text-teal-900',
  },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function FormularioBase({
  titulo,
  subtitulo,
  opd,
  cliente,
  loading,
  error,
  onSubmit,
  onCancel,
  children,
  showProjetoAnexo = false,
  projetoAnexo,
  onProjetoUpload,
  showObservacoes = true,
  observacoes = '',
  onObservacoesChange,
  showResponsavel = true,
  responsavel = '',
  onResponsavelChange,
  showFotos = true,
  fotos,
  onFotosUpload,
  botaoSalvarTexto = 'Salvar Formulário',
}: FormularioBaseProps) {
  const [uploadingProjeto, setUploadingProjeto] = useState(false);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const projetoInputRef = useRef<HTMLInputElement>(null);
  const fotosInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (
    files: FileList,
    tipo: string,
    setUploading: (v: boolean) => void,
    onSuccess: (files: ArquivoUpload[]) => void
  ) => {
    setUploading(true);
    try {
      const uploaded: ArquivoUpload[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', tipo);
        formData.append('numero_opd', opd);

        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
          uploaded.push({ filename: result.filename, url: result.url, size: file.size });
        }
      }
      onSuccess(uploaded);
    } catch (err) {
      console.error('Erro no upload:', err);
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Cabeçalho Padrão */}
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg text-gray-900">{titulo}</h3>
        {subtitulo && <p className="text-sm text-gray-600 mt-1">{subtitulo}</p>}
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-semibold">
            OPD: {opd}
          </span>
          {cliente && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
              Cliente: {cliente}
            </span>
          )}
        </div>
      </div>

      {/* Anexo de Projeto/Desenho */}
      {showProjetoAnexo && onProjetoUpload && (
        <div className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
          <h4 className="font-bold text-lg mb-3 text-indigo-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Anexar Projeto / Desenho Técnico
          </h4>
          <div className="border-2 border-dashed border-indigo-300 rounded-lg p-4 hover:border-indigo-500 transition bg-white">
            <input
              ref={projetoInputRef}
              type="file"
              accept=".pdf,.dwg,.dxf,image/*"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUpload(e.target.files, 'projeto', setUploadingProjeto, onProjetoUpload);
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => projetoInputRef.current?.click()}
              disabled={uploadingProjeto}
              className="w-full flex flex-col items-center py-3"
            >
              {uploadingProjeto ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-indigo-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    {projetoAnexo && projetoAnexo.length > 0
                      ? `${projetoAnexo.length} arquivo(s) anexado(s)`
                      : 'Clique para anexar projeto ou desenho técnico'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">PDF, DWG, DXF ou Imagens</span>
                </>
              )}
            </button>
          </div>
          {projetoAnexo && projetoAnexo.length > 0 && (
            <div className="mt-3 space-y-2">
              {projetoAnexo.map((arquivo, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-white p-2 rounded border">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="flex-1 truncate">{arquivo.filename}</span>
                  <a href={arquivo.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    Ver
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo específico do formulário */}
      {children}

      {/* Seção de Fotos/Evidências */}
      {showFotos && onFotosUpload && (
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <h4 className="font-bold text-lg mb-3 text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Fotos / Evidências
          </h4>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition bg-white">
            <input
              ref={fotosInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUpload(e.target.files, 'evidencia', setUploadingFotos, onFotosUpload);
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fotosInputRef.current?.click()}
              disabled={uploadingFotos}
              className="w-full flex flex-col items-center py-3"
            >
              {uploadingFotos ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    {fotos && fotos.length > 0
                      ? `${fotos.length} foto(s) anexada(s)`
                      : 'Clique para adicionar fotos'}
                  </span>
                </>
              )}
            </button>
          </div>
          {fotos && fotos.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {fotos.map((foto, idx) => (
                <a key={idx} href={foto.url} target="_blank" rel="noopener noreferrer">
                  <img src={foto.url} alt={foto.filename} className="w-full h-20 object-cover rounded border hover:opacity-80" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Observações */}
      {showObservacoes && onObservacoesChange && (
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <h4 className="font-bold text-lg mb-3 text-gray-900">Observações</h4>
          <textarea
            value={observacoes}
            onChange={(e) => onObservacoesChange(e.target.value)}
            rows={4}
            placeholder="Digite observações adicionais..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          />
        </div>
      )}

      {/* Responsável */}
      {showResponsavel && onResponsavelChange && (
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <h4 className="font-bold text-lg mb-3 text-gray-900">Responsável</h4>
          <input
            type="text"
            value={responsavel}
            onChange={(e) => onResponsavelChange(e.target.value)}
            placeholder="Nome do responsável"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          />
        </div>
      )}

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white py-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <span>{botaoSalvarTexto}</span>
          )}
        </button>
      </div>
    </form>
  );
}

// ============================================
// COMPONENTES AUXILIARES EXPORTADOS
// ============================================

// Seção com título e cor
export function Secao({ titulo, cor, children }: SecaoConfig) {
  const cores = CORES_SECAO[cor];
  return (
    <div className={`border-2 ${cores.border} rounded-lg p-4 ${cores.bg}`}>
      <h4 className={`font-bold text-lg mb-4 ${cores.title}`}>{titulo}</h4>
      {children}
    </div>
  );
}

// Campo de seleção Conforme/Não Conforme
export function CampoConformidade({
  label,
  valor,
  onChange,
  descricao,
  criterio,
  temNaoAplicavel = false,
  required = true,
}: {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  descricao?: string;
  criterio?: string;
  temNaoAplicavel?: boolean;
  required?: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white mb-3">
      <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
      {descricao && <p className="text-sm text-gray-600 mb-2">{descricao}</p>}
      {criterio && <p className="text-sm text-blue-700 mb-2 font-medium">Critério: {criterio}</p>}
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
      >
        <option value="">Selecione</option>
        <option value="Conforme">Conforme</option>
        <option value="Não conforme">Não conforme</option>
        {temNaoAplicavel && <option value="Não Aplicável">Não Aplicável</option>}
      </select>
    </div>
  );
}

// Campo de texto
export function CampoTexto({
  label,
  valor,
  onChange,
  placeholder,
  required = false,
  tipo = 'text',
}: {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  required?: boolean;
  tipo?: 'text' | 'number' | 'date';
}) {
  return (
    <div className="border rounded-lg p-4 bg-white mb-3">
      <label className="block font-bold text-gray-900 mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
      />
    </div>
  );
}

// Campo booleano Sim/Não
export function CampoSimNao({
  label,
  valor,
  onChange,
  required = false,
}: {
  label: string;
  valor: boolean | null;
  onChange: (valor: boolean) => void;
  required?: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white mb-3">
      <label className="block font-bold text-gray-900 mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <div className="flex space-x-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            checked={valor === true}
            onChange={() => onChange(true)}
            className="mr-2 w-4 h-4 text-green-600"
          />
          <span className="text-green-700 font-medium">Sim</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            checked={valor === false}
            onChange={() => onChange(false)}
            className="mr-2 w-4 h-4 text-red-600"
          />
          <span className="text-red-700 font-medium">Não</span>
        </label>
      </div>
    </div>
  );
}

// Campo de seleção com opções customizadas
export function CampoSelect({
  label,
  valor,
  onChange,
  opcoes,
  required = false,
}: {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  opcoes: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white mb-3">
      <label className="block font-bold text-gray-900 mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
      >
        <option value="">Selecione</option>
        {opcoes.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Grid de campos
export function GridCampos({ colunas = 2, children }: { colunas?: 1 | 2 | 3 | 4; children: ReactNode }) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };
  return <div className={`grid ${gridClass[colunas]} gap-4`}>{children}</div>;
}
