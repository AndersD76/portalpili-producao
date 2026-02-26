'use client';

import { useState } from 'react';

interface FormReuniaoStartColetorProps {
  numeroOpd: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormReuniaoStartColetor({ numeroOpd, onSubmit, onCancel }: FormReuniaoStartColetorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    numero_opd: numeroOpd,

    // INFORMAÇÕES ESTRUTURAIS
    equipamento: '',
    data_entrega: '',
    escada: '',
    escada_outra: '',
    platibanda: '',
    tubo_coleta: '',
    compressores: '',
    info_adicional_estrutura: '',

    // INFORMAÇÕES DA CENTRAL E PAINEL
    voltagem_cliente: '',
    local_central: '',
    local_central_outro: '',
    local_painel: '',
    local_painel_outro: '',

    // INFORMAÇÕES IN LOCO
    fixacao_caixa_coletora: '',
    fixacao_caixa_outro: '',
    distancia_caixa_coletora: '',
    distancia_caixa_outra: '',
    info_adicional_loco: '',

    // RESPONSÁVEL
    responsavel_reuniao: '',
    data_reuniao: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.responsavel_reuniao || !formData.data_reuniao) {
      setError('Responsavel e data da reuniao sao obrigatorios');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/formularios-reuniao/${numeroOpd}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dados_formulario: formData,
          preenchido_por: formData.responsavel_reuniao
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSubmit(formData);
      } else {
        setError(result.error || 'Erro ao salvar formulario');
      }
    } catch (err) {
      setError('Erro ao salvar formulario');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const radioClass = "w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500";
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 sticky top-0 z-10">
        <h3 className="font-semibold text-blue-900">REGISTRO - REUNIAO DE START 1 (COLETOR MOVEL)</h3>
        <p className="text-sm text-blue-700 mt-1">OPD: {numeroOpd}</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {/* INFORMAÇÕES ESTRUTURAIS */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-4 text-blue-900">INFORMACOES ESTRUTURAIS</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Equipamento</label>
              <input type="text" name="equipamento" value={formData.equipamento} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Data de Entrega</label>
              <input type="date" name="data_entrega" value={formData.data_entrega} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          {/* Escada */}
          <div>
            <label className="block text-sm font-semibold mb-2">Escada</label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="escada" value="MARINHEIRO" checked={formData.escada === 'MARINHEIRO'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Marinheiro</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="escada" value="NENHUMA" checked={formData.escada === 'NENHUMA'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Nenhuma</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="escada" value="OUTRA" checked={formData.escada === 'OUTRA'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Outra:</span>
              </label>
              {formData.escada === 'OUTRA' && (
                <input type="text" name="escada_outra" value={formData.escada_outra} onChange={handleChange} placeholder="Especifique" className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-48" />
              )}
            </div>
          </div>

          {/* Platibanda */}
          <div>
            <label className="block text-sm font-semibold mb-2">Platibanda</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="platibanda" value="SIM" checked={formData.platibanda === 'SIM'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Sim</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="platibanda" value="NAO" checked={formData.platibanda === 'NAO'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Nao</span>
              </label>
            </div>
          </div>

          {/* Tubo de Coleta */}
          <div>
            <label className="block text-sm font-semibold mb-2">Tubo de Coleta</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tubo_coleta" value="PADRAO_3" checked={formData.tubo_coleta === 'PADRAO_3'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Padrao 3&quot;</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tubo_coleta" value="MAIOR" checked={formData.tubo_coleta === 'MAIOR'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Maior</span>
              </label>
            </div>
          </div>

          {/* Compressores */}
          <div>
            <label className="block text-sm font-semibold mb-2">Compressores</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="compressores" value="PADRAO_1" checked={formData.compressores === 'PADRAO_1'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Padrao 1</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="compressores" value="2" checked={formData.compressores === '2'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">2</span>
              </label>
            </div>
          </div>

          {/* Info adicional */}
          <div>
            <label className="block text-sm font-semibold mb-1">Alguma informacao adicional estrutura</label>
            <textarea name="info_adicional_estrutura" value={formData.info_adicional_estrutura} onChange={handleChange} rows={3} className={inputClass} />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES DA CENTRAL E PAINEL */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-lg mb-4 text-green-900">INFORMACOES DA CENTRAL E PAINEL</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Voltagem do Cliente</label>
            <select name="voltagem_cliente" value={formData.voltagem_cliente} onChange={handleChange} className={inputClass}>
              <option value="">Selecione</option>
              <option value="220V">220V</option>
              <option value="380V">380V</option>
              <option value="440V">440V</option>
            </select>
          </div>

          {/* Local da Central */}
          <div>
            <label className="block text-sm font-semibold mb-2">Local da Central</label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="local_central" value="NO_PE_DO_COLETOR" checked={formData.local_central === 'NO_PE_DO_COLETOR'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">No pe do coletor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="local_central" value="OUTRO" checked={formData.local_central === 'OUTRO'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Outro:</span>
              </label>
              {formData.local_central === 'OUTRO' && (
                <input type="text" name="local_central_outro" value={formData.local_central_outro} onChange={handleChange} placeholder="Especifique" className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 w-48" />
              )}
            </div>
          </div>

          {/* Local Painel */}
          <div>
            <label className="block text-sm font-semibold mb-2">Local Painel</label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="local_painel" value="NA_CENTRAL" checked={formData.local_painel === 'NA_CENTRAL'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Na central</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="local_painel" value="OUTRO" checked={formData.local_painel === 'OUTRO'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Outro:</span>
              </label>
              {formData.local_painel === 'OUTRO' && (
                <input type="text" name="local_painel_outro" value={formData.local_painel_outro} onChange={handleChange} placeholder="Especifique" className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 w-48" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES IN LOCO */}
      <div className="border-2 border-teal-300 rounded-lg p-4 bg-teal-50">
        <h4 className="font-bold text-lg mb-4 text-teal-900">INFORMACOES IN LOCO</h4>
        <div className="space-y-4">
          {/* Fixacao da Caixa Coletora */}
          <div>
            <label className="block text-sm font-semibold mb-2">Fixacao da Caixa Coletora</label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="fixacao_caixa_coletora" value="PROXIMO_AO_COLETOR" checked={formData.fixacao_caixa_coletora === 'PROXIMO_AO_COLETOR'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Proximo ao coletor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="fixacao_caixa_coletora" value="SALA_DE_OPERACAO" checked={formData.fixacao_caixa_coletora === 'SALA_DE_OPERACAO'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Sala de operacao</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="fixacao_caixa_coletora" value="OUTRO" checked={formData.fixacao_caixa_coletora === 'OUTRO'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Outro:</span>
              </label>
              {formData.fixacao_caixa_coletora === 'OUTRO' && (
                <input type="text" name="fixacao_caixa_outro" value={formData.fixacao_caixa_outro} onChange={handleChange} placeholder="Especifique" className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 w-48" />
              )}
            </div>
          </div>

          {/* Distancia da Caixa Coletora */}
          <div>
            <label className="block text-sm font-semibold mb-2">Distancia da Caixa Coletora</label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="distancia_caixa_coletora" value="AO_LADO_DO_COLETOR" checked={formData.distancia_caixa_coletora === 'AO_LADO_DO_COLETOR'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Ao lado do coletor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="distancia_caixa_coletora" value="OUTRA" checked={formData.distancia_caixa_coletora === 'OUTRA'} onChange={handleChange} className={radioClass} />
                <span className="text-sm">Outra:</span>
              </label>
              {formData.distancia_caixa_coletora === 'OUTRA' && (
                <input type="text" name="distancia_caixa_outra" value={formData.distancia_caixa_outra} onChange={handleChange} placeholder="Especifique distancia" className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 w-48" />
              )}
            </div>
          </div>

          {/* Info adicional */}
          <div>
            <label className="block text-sm font-semibold mb-1">Alguma outra informacao sobre diferencas no in loco</label>
            <textarea name="info_adicional_loco" value={formData.info_adicional_loco} onChange={handleChange} rows={3} className={inputClass} />
          </div>
        </div>
      </div>

      {/* RESPONSÁVEL */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-lg mb-4 text-red-900">RESPONSAVEL DA REUNIAO <span className="text-red-600">*</span></h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nome do Responsavel <span className="text-red-600">*</span></label>
            <input type="text" name="responsavel_reuniao" value={formData.responsavel_reuniao} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data da Reuniao <span className="text-red-600">*</span></label>
            <input type="date" name="data_reuniao" value={formData.data_reuniao} onChange={handleChange} required className={inputClass} />
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white pb-2">
        <button type="button" onClick={onCancel} disabled={loading} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center space-x-2">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar Reuniao de Start 1 (Coletor)</span>
          )}
        </button>
      </div>
    </form>
  );
}
