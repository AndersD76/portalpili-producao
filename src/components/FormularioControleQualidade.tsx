'use client';

import { useState, useRef } from 'react';

interface FormularioControleQualidadeProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioControleQualidade({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioControleQualidadeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState({
    // CQ1-A: MEDIDA TOTAL DE CORTE DA VIGA (não requer imagem)
    cq1a_status: '',

    // CQ2-A: VERIFICAR DETALHE PARA CORTE DE ENCAIXE DE VIGA (não requer imagem)
    cq2a_status: '',

    // CQ3-A: VERIFICAR DISTRIBUIÇÃO DAS VIGAS E MEDIDA TOTAL (requer imagem)
    cq3a_status: '',
    cq3a_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ1-B: MEDIDA DA MONTAGEM INICIAL (requer imagem)
    cq1b_status: '',
    cq1b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ2-B: ESQUADRO (não requer imagem)
    cq2b_status: '',

    // CQ3-B: POSICIONAMENTO DO TRAVA CHASSI (não requer imagem)
    cq3b_status: '',

    // CQ4-B: POSICIONAMENTO DO APOIO DO TRAVADOR DE RODAS COD. 23691 (não requer imagem)
    cq4b_status: '',

    // CQ5-B: POSICIONAMENTO DO APOIO DO TRAVADOR DE RODAS COD. 23789 (não requer imagem)
    cq5b_status: '',

    // CQ6-B: MONTAGEM DA MÃO FRANCESA E PRESENÇA DE OLHAL
    cq6b_status: '',
    cq6b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ7-B: SOLDA DA MÃO FRANCESA DE APOIO DO TRAVA RODAS
    cq7b_status: '',
    cq7b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ8-B: POSICIONAMENTO E ESPAÇAMENTO DOS GRAMPOS COD. 23694
    cq8b_status: '',
    cq8b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ9-B: FECHAMENTO FRONTAL GRADEADO COD. 24845
    cq9b_status: '',
    cq9b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ10-B: MONTAGEM DA BARRA CHATA NO LAVRADO COD. 23103
    cq10b_status: '',
    cq10b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ11-B: POSICIONAMENTO E ESPAÇAMENTO DOS GRAMPOS PARA BARRA REDONDA COD 25623
    cq11b_status: '',
    cq11b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ12-B: CONFERIR BARRAS REDONDAS SE ESTÃO POSICIONADAS CORRETAMENTE
    cq12b_status: '',
    cq12b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ13-B: MONTAGEM DO REFORÇO TRANSVERSAL PARA ASSOALHO
    cq13b_status: '',
    cq13b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ14-B: MONTAGEM DE PERFIL 50X70 CONFORME DESENHO ASSINADO
    cq14b_status: '',
    cq14b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ15-B: MONTAGEM DE REFORÇOS SUPERIORES
    cq15b_status: '',
    cq15b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ16-B: SOLDA DE REFORÇOS SUPERIORES
    cq16b_status: '',
    cq16b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ17-B: SOLDA DO REFORÇO DO PISO COM PERFIL 50X70 PARTE SUPERIOR
    cq17b_status: '',
    cq17b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ18-B: MONTAGEM TAMPA TRAVA RODAS CHAPA PISO COD. 23698
    cq18b_status: '',
    cq18b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ19-B: SOLDA TAMPA TRAVA RODAS
    cq19b_status: '',
    cq19b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ20-B: SOLDA EMENDAS DAS VIGAS INFERIORES
    cq20b_status: '',
    cq20b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ21-B: SOLDA EMENDA DAS VIGAS SUPERIORES
    cq21b_status: '',
    cq21b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ22-B: OLHAL DE IÇAMENTO CONFORME DESENHO COD. 23694
    cq22b_status: '',
    cq22b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ23-B: MONTAGEM CHAPA DE DESCIDA RÁPIDA
    cq23b_status: '',
    cq23b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ24-B: SOLDA CHAPA DE DESCIDA RÁPIDA
    cq24b_status: '',
    cq24b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ25-B: SOLDA OLHAL DE IÇAMENTO (SOLDA A SUBIR)
    cq25b_status: '',
    cq25b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ26-B: VERIFICAR SE ARTICULADOR DE 2" ESTA MONTADO COD. 12570
    cq26b_status: '',
    cq26b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ27-B: MONTAGEM CHAPA 1050X3000 COD. 23806
    cq27b_status: '',
    cq27b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ28-B: SOLDA CHAPA 1050X2980
    cq28b_status: '',
    cq28b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ29-B: MONTAGEM SUPORTE CALHAS (ETAPA 5, COD. 27948, 27949 E 27958)
    cq29b_status: '',
    cq29b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ30-B: SOLDA SUPORTE CALHAS
    cq30b_status: '',
    cq30b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ31-B: MONTAGEM TAMPA DE PROTEÇÃO TRAVA CHASSI
    cq31b_status: '',
    cq31b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ32-B: SOLDA TAMPA DE PROTEÇÃO TRAVA CHASSI
    cq32b_status: '',
    cq32b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ33-B: SUPORTE PARA TRAVA PINOS
    cq33b_status: '',
    cq33b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ34-B: SOLDA SUPORTE TRAVA PINO
    cq34b_status: '',
    cq34b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ35-B: MONTAGEM SUPORTE CALÇO MECÂNICO
    cq35b_status: '',
    cq35b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ36-B: SOLDA SUPORTES CALÇO MECÂNICO
    cq36b_status: '',
    cq36b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ37-B: VERIFICAR SE PARAFUSOS QUE SEGURAM A CALHA ESTÃO NA POSIÇÃO
    cq37b_status: '',
    cq37b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ38-B: MONTAGEM PISO
    cq38b_status: '',
    cq38b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ39-B: SOLDA PISO
    cq39b_status: '',
    cq39b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ40-B: POSICIONAMENTO DE TRILHOS
    cq40b_status: '',
    cq40b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ41-B: SOLDA TRILHOS
    cq41b_status: '',
    cq41b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ42-B: POSICIONAMENTO TRAVA CINTAS (ETAPA 3 COD. 20137 E 26299)
    cq42b_status: '',
    cq42b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ43-B: SOLDA TRAVA CINTAS
    cq43b_status: '',
    cq43b_imagem: null as { filename: string; url: string; size: number }[] | null,
  });

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(prev => ({ ...prev, [fieldName]: true }));

    try {
      const uploadedFiles: { filename: string; url: string; size: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', 'controle_qualidade');
        formData.append('numero_opd', opd);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          uploadedFiles.push({
            filename: result.filename,
            url: result.url,
            size: file.size
          });
        } else {
          throw new Error(result.error || 'Erro ao fazer upload');
        }
      }

      setFormData(prev => ({ ...prev, [fieldName]: uploadedFiles }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload de arquivos');
    } finally {
      setUploadingImages(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Salvar formulário via API
      const response = await fetch(`/api/formularios-controle-qualidade/${opd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario: formData,
          preenchido_por: 'Sistema' // TODO: pegar do localStorage user_data
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSubmit(formData);
      } else {
        setError(result.error || 'Erro ao salvar formulário');
      }
    } catch (err) {
      setError('Erro ao salvar formulário');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderCQField = (
    label: string,
    fieldName: string,
    description: string,
    criterio: string,
    hasNaoAplicavel = false,
    hasImage = false
  ) => (
    <div className="border rounded-lg p-4 bg-white mb-4">
      <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
      <div className="text-sm text-gray-600 mb-3 space-y-1">
        <p>{description}</p>
        <p className="font-semibold text-blue-700">Critérios de aceitação: {criterio}</p>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold mb-2">Condição *</label>
        <select
          name={`${fieldName}_status`}
          value={(formData as any)[`${fieldName}_status`]}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
        >
          <option value="">Selecione</option>
          <option value="Conforme">Conforme</option>
          <option value="Não conforme">Não conforme</option>
          {hasNaoAplicavel && <option value="Não Aplicável">Não Aplicável</option>}
        </select>
      </div>

      {hasImage && (
        <div>
          <label className="block text-sm font-semibold mb-2">Anexar Imagem</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-red-500 transition">
            <input
              ref={(el) => { fileInputRefs.current[`${fieldName}_imagem`] = el; }}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => handleFileUpload(e, `${fieldName}_imagem`)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRefs.current[`${fieldName}_imagem`]?.click()}
              className="w-full flex flex-col items-center py-3"
            >
              {uploadingImages[`${fieldName}_imagem`] ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    {(formData as any)[`${fieldName}_imagem`] && (formData as any)[`${fieldName}_imagem`].length > 0
                      ? `${(formData as any)[`${fieldName}_imagem`].length} arquivo(s) selecionado(s)`
                      : 'Clique para selecionar imagens'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">JPG, PNG, PDF (múltiplos arquivos)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">Controle de Qualidade - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* SEÇÃO A - CORTE */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">ETAPA DO PROCESSO: VIGA - CORTE</h4>

        {renderCQField(
          'CQ1-A: MEDIDA TOTAL DE CORTE DA VIGA',
          'cq1a',
          'Avaliação: 100% | Medida crítica: Comprimento total (após esquadro pronto) | Método: Dimensional | Instrumento: Trena',
          '+/- 10 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ2-A: VERIFICAR DETALHE PARA CORTE DE ENCAIXE DE VIGA',
          'cq2a',
          'Avaliação: 100% | Medida crítica: Medida de corte da aba e presença de chanfro | Método: Dimensional | Instrumento: Trena',
          '+/- 5 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ3-A: VERIFICAR DISTRIBUIÇÃO DAS VIGAS E MEDIDA TOTAL (IDENTIFICAÇÃO DA VIGA 72/82/92)',
          'cq3a',
          'Avaliação: 100% | Medida crítica: Comprimento e identificação das vigas | Método: Dimensional e Visual | Instrumento: Trena',
          '+/- 8 mm. Seguir conforme desenho.',
          false,
          true
        )}
      </div>

      {/* SEÇÃO B - MONTAGEM SUPERIOR E ESQUADRO */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-xl mb-4 text-blue-900">ETAPA DO PROCESSO: MONTAGEM SUPERIOR E ESQUADRO</h4>

        {renderCQField(
          'CQ1-B: MEDIDA DA MONTAGEM INICIAL (CONFORME DESENHO ETAPA 0)',
          'cq1b',
          'ETAPA DO PROCESSO: VIGA | Avaliação: 100% | Medida crítica: Comprimento; Largura | Método: Dimensional | Instrumento: Trena',
          '+/- 5 mm',
          false,
          true
        )}

        {renderCQField(
          'CQ2-B: ESQUADRO',
          'cq2b',
          'ETAPA DO PROCESSO: VIGA | Avaliação: 100% | Medida crítica: Comprimento; Ângulo | Método: Dimensional | Instrumento: Trena; Esquadro',
          '+/- 5 mm; +/- 1 grau',
          false,
          false
        )}

        {renderCQField(
          'CQ3-B: POSICIONAMENTO DO TRAVA CHASSI COD.24569 (CONFORME DESENHO ETAPA 0)',
          'cq3b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Comprimento | Método: Dimensional | Instrumento: Trena',
          '+/- 5 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ4-B: POSICIONAMENTO DO APOIO DO TRAVADOR DE RODAS COD. 23691 (CONFORME DESENHO ETAPA 1)',
          'cq4b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Comprimento | Método: Dimensional | Instrumento: Trena',
          '+/- 5 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ5-B: POSICIONAMENTO DO APOIO DO TRAVADOR DE RODAS COD. 23789 (CONFORME DESENHO ETAPA 1)',
          'cq5b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Comprimento | Método: Dimensional | Instrumento: Trena',
          '+/- 5 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ6-B: MONTAGEM DA MÃO FRANCESA E PRESENÇA DE OLHAL (COD. 23709 NO APOIO TRAVA RODAS)',
          'cq6b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ7-B: SOLDA DA MÃO FRANCESA DE APOIO DO TRAVA RODAS',
          'cq7b',
          'ETAPA DO PROCESSO: SOLDA | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ8-B: POSICIONAMENTO E ESPAÇAMENTO DOS GRAMPOS COD. 23694 (CONFORME DESENHO ETAPA 1)',
          'cq8b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Espaçamento entre grampos; Quantidade de grampos | Método: Dimensional; Visual | Instrumento: Trena',
          '+/- 2 mm; Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ9-B: FECHAMENTO FRONTAL GRADEADO COD. 24845',
          'cq9b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ10-B: MONTAGEM DA BARRA CHATA NO LAVRADO COD. 23103',
          'cq10b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ11-B: POSICIONAMENTO E ESPAÇAMENTO DOS GRAMPOS PARA BARRA REDONDA COD 25623 (CONFORME DESENHO ETAPA 1)',
          'cq11b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Espaçamento entre grampos; Quantidade de grampos | Método: Dimensional; Visual | Instrumento: Trena',
          '+/- 5 mm; Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ12-B: CONFERIR BARRAS REDONDAS SE ESTÃO POSICIONADAS CORRETAMENTE',
          'cq12b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Espaçamento entre grampos; Quantidade de grampos | Método: Dimensional; Visual | Instrumento: Trena',
          '+/- 5 mm; Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ13-B: MONTAGEM DO REFORÇO TRANSVERSAL PARA ASSOALHO (CONFORME MEDIDAS DESENHO ETAPA 1)',
          'cq13b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Dimensional; Visual | Instrumento: Trena',
          '+/- 5 mm; Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ14-B: MONTAGEM DE PERFIL 50X70 CONFORME DESENHO ASSINADO',
          'cq14b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Dimensional; Visual | Instrumento: Trena',
          '+/- 5 mm; Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ15-B: MONTAGEM DE REFORÇOS SUPERIORES (CONFORME DESENHO)',
          'cq15b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ16-B: SOLDA DE REFORÇOS SUPERIORES',
          'cq16b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ17-B: SOLDA DO REFORÇO DO PISO COM PERFIL 50X70 PARTE SUPERIOR',
          'cq17b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ18-B: MONTAGEM TAMPA TRAVA RODAS CHAPA PISO COD. 23698',
          'cq18b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ19-B: SOLDA TAMPA TRAVA RODAS',
          'cq19b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ20-B: SOLDA EMENDAS DAS VIGAS INFERIORES',
          'cq20b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          true,
          true
        )}

        {renderCQField(
          'CQ21-B: SOLDA EMENDA DAS VIGAS SUPERIORES',
          'cq21b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ22-B: OLHAL DE IÇAMENTO CONFORME DESENHO COD. 23694',
          'cq22b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme Desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ23-B: MONTAGEM CHAPA DE DESCIDA RÁPIDA',
          'cq23b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ24-B: SOLDA CHAPA DE DESCIDA RÁPIDA',
          'cq24b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          true,
          true
        )}

        {renderCQField(
          'CQ25-B: SOLDA OLHAL DE IÇAMENTO (SOLDA A SUBIR)',
          'cq25b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ26-B: VERIFICAR SE ARTICULADOR DE 2" ESTA MONTADO COD. 12570',
          'cq26b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme Desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ27-B: MONTAGEM CHAPA 1050X3000 COD. 23806',
          'cq27b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ28-B: SOLDA CHAPA 1050X2980',
          'cq28b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ29-B: MONTAGEM SUPORTE CALHAS (ETAPA 5, COD. 27948, 27949 E 27958)',
          'cq29b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: Gabarito',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ30-B: SOLDA SUPORTE CALHAS',
          'cq30b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ31-B: MONTAGEM TAMPA DE PROTEÇÃO TRAVA CHASSI',
          'cq31b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ32-B: SOLDA TAMPA DE PROTEÇÃO TRAVA CHASSI',
          'cq32b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ33-B: SUPORTE PARA TRAVA PINOS',
          'cq33b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ34-B: SOLDA SUPORTE TRAVA PINO',
          'cq34b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ35-B: MONTAGEM SUPORTE CALÇO MECÂNICO',
          'cq35b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ36-B: SOLDA SUPORTES CALÇO MECÂNICO',
          'cq36b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          true,
          true
        )}

        {renderCQField(
          'CQ37-B: VERIFICAR SE PARAFUSOS QUE SEGURAM A CALHA ESTÃO NA POSIÇÃO',
          'cq37b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Posição; Quantidade de parafusos | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ38-B: MONTAGEM PISO',
          'cq38b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Deformações; Ondulações no piso | Método: Visual | Instrumento: N/A',
          'Conforme o desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ39-B: SOLDA PISO',
          'cq39b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ40-B: POSICIONAMENTO DE TRILHOS',
          'cq40b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Esquadro | Método: Dimensional | Instrumento: Esquadro',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ41-B: SOLDA TRILHOS',
          'cq41b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ42-B: POSICIONAMENTO TRAVA CINTAS (ETAPA 3 COD. 20137 E 26299)',
          'cq42b',
          'ITEM: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ43-B: SOLDA TRAVA CINTAS',
          'cq43b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
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
            <>
              <span>Salvar Controle de Qualidade</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
