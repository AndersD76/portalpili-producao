'use client';

import { useState } from 'react';

interface FormularioMontagemEletricaHidraulicaProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function FormularioMontagemEletricaHidraulica({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioMontagemEletricaHidraulicaProps) {
  const [formData, setFormData] = useState({
    cq1g_status: '',
    cq2g_status: '',
    cq3g_status: '',
    cq4g_status: '',
    cq5g_status: '',
    cq6g_status: '',
    cq7g_status: '',
    cq8g_status: '',
    cq9g_status: '',
    cq10g_status: '',
    cq11g_status: '',
    cq12g_status: '',
    cq13g_status: '',
    cq14g_status: '',
    cq15g_status: '',
    cq16g_status: '',
    cq17g_status: '',
    cq18g_status: '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar campos obrigatórios
      const requiredFields = [
        'cq1g_status', 'cq2g_status', 'cq3g_status', 'cq4g_status',
        'cq5g_status', 'cq6g_status', 'cq7g_status', 'cq8g_status',
        'cq9g_status', 'cq10g_status', 'cq11g_status', 'cq12g_status',
        'cq13g_status', 'cq14g_status', 'cq15g_status', 'cq16g_status',
        'cq17g_status', 'cq18g_status'
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          alert(`Por favor, preencha o campo ${field.toUpperCase()}`);
          setLoading(false);
          return;
        }
      }

      // Preparar dados para envio
      const userData = localStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      const dados_formulario = {
        ...formData,
      };

      // Enviar formulário
      const response = await fetch(`/api/formularios-montagem-eletrica-hidraulica/${opd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario,
          preenchido_por: user?.nome || 'Sistema',
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Formulário de Controle de Qualidade - Montagem Elétrica/Hidráulica salvo com sucesso!');
        onSubmit();
      } else {
        throw new Error(result.error || 'Erro ao salvar formulário');
      }
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      alert('Erro ao salvar formulário. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderCheckpoint = (
    id: string,
    title: string,
    description: string
  ) => {
    const statusField = `${id}_status`;

    return (
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
        <h4 className="font-bold text-lg mb-3 text-gray-900">{title}</h4>
        <p className="text-sm text-gray-700 mb-4 whitespace-pre-line">{description}</p>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Status *
          </label>
          <select
            value={formData[statusField as keyof typeof formData] as string}
            onChange={(e) => setFormData(prev => ({ ...prev, [statusField]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          >
            <option value="">Selecione...</option>
            <option value="Conforme">Conforme</option>
            <option value="Não conforme">Não conforme</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p className="font-semibold">Controle de Qualidade - Montagem Elétrica/Hidráulica</p>
        <p className="text-sm">OPD: {opd} | Cliente: {cliente}</p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-4 px-1">
        {renderCheckpoint(
          'cq1g',
          'CQ1-G. FURAÇÃO PARA PASSAGEM DE MANGUEIRAS E ELÉTRICAS',
          `- Avaliação: 100%
- Medida crítica: Posição dos furos
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq2g',
          'CQ2-G. SOLDA CHAPINHAS DE ACABAMENTO NOS FUROS DA VIGA',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq3g',
          'CQ3-G. PARAFUSOS PARA PRENDER MANGUEIRA',
          `- Avaliação: 100%
- Medida crítica: Presença dos parafusos
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq4g',
          'CQ4-G. SOLDA PARA PRENDER MANGUEIRA',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq5g',
          'CQ5-G. SUPORTE PARA VALVULAS TRAVA PINO',
          `- Avaliação: 100%
- Medida crítica: Posição do suporte
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq6g',
          'CQ6-G. SUPORTE PARA VALVULAS LATERAIS',
          `- Avaliação: 100%
- Medida crítica: Posição do suporte
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq7g',
          'CQ7-G. MONTAGEM DO PISO (ABERTO)',
          `- Avaliação: 100%
- Medida crítica: Posição do piso
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq8g',
          'CQ8-G. MONTAGEM DO PISO (FECHADO)',
          `- Avaliação: 100%
- Medida crítica: Posição do piso
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq9g',
          'CQ9-G. TESTAR MOVIMENTAÇÃO DA TAMPA DE INSPEÇÃO DO TRAVA RODA',
          `- Avaliação: 100%
- Medida crítica: Movimento da tampa
- Método de verificação: Funcional
- Instrumento de medição: N/A
- Critérios de aceitação: Tampa se movimentar`
        )}

        {renderCheckpoint(
          'cq10g',
          'CQ10-G. SUPORTE TAMPA DE INSPEÇÃO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq11g',
          'CQ11-G. LOCALIZAÇÃO DO SUPORTE DA VÁLVULA TRAVA RODA',
          `- Avaliação: 100%
- Medida crítica: Localização do suporte
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq12g',
          'CQ12-G. VERIFICAR VÁVULA LATERAL',
          `- Avaliação: 100%
- Medida crítica: Posição do válvula
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq13g',
          'CQ13-G. MONTAGEM CHAPA INCLINOSTATO DO TOMBADOR COM FECHAMENTO INFERIOR',
          `- Avaliação: 100%
- Medida crítica: Posição da chapa do inclinostato
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq14g',
          'CQ14-G. MONTAGEM CHAPA INCLINOSTATO DO TOMBADOR SEM FECHAMENTO INFERIOR',
          `- Avaliação: 100%
- Medida crítica: Posição da chapa do inclinostato
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq15g',
          'CQ15-G. MONTAGEM DAS ABRAÇADEIRAS TIPO D',
          `- Avaliação: 100%
- Medida crítica: Posição das abraçadeiras
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq16g',
          'CQ16-G. MONTAGEM DOS SUPORTES DA CAIXA ELÉTRICA LATERAL',
          `- Avaliação: 100%
- Medida crítica: Posição dos suportes
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq17g',
          'CQ17-G. MONTAGEM DOS SUPORTES DA CAIXA ELÉTRICA DOS SENSORES DAS TRAVAS (INTERNO)',
          `- Avaliação: 100%
- Medida crítica: Posição dos suportes
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq18g',
          'CQ18-G. MONTAGEM DO SUPORTE DO SENSOR TRAVA RODA',
          `- Avaliação: 100%
- Medida crítica: Suporte do sensor
- Método de verificação: Funcional (realizar teste de colisão)
- Instrumento de medição: N/A
- Critérios de aceitação: Conforme POP`
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar Formulário</span>
          )}
        </button>
      </div>
    </form>
  );
}
