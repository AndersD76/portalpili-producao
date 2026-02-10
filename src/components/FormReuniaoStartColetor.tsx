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
    // INFORMAÇÕES DO EQUIPAMENTO
    equipamento: '',
    grau_rotacao: '',
    data_entrega: '',
    tipo_coletor: '',
    modelo_coletor: '',
    comprimento_trilhos: '',

    // INFORMAÇÕES DA CENTRAL HIDRÁULICA
    voltagem_cliente: '',
    frequencia: '',
    qtd_motores: '',
    marca_contactores: '',
    distancia_hidraulica: '',
    distancia_ciclone: '',

    // INFORMAÇÕES DO CICLONE E COLETA
    diametro_tubo: '',
    tipo_tubo_coleta: '',
    comprimento_tubo_coleta: '',
    tipo_ciclone: '',

    // INFORMAÇÕES DA ESTRUTURA
    tipo_escada: '',
    platibanda: '',
    tipo_coluna: '',
    altura_coluna_inferior: '',
    altura_coluna_superior: '',

    // INFORMAÇÕES ELÉTRICAS E COMANDO
    acionamento_comando: '',
    qtd_fio_controle: '',
    tipo_cabo_eletrico: '',
    sensor_nivel: '',

    // INFORMAÇÕES IN LOCO
    obra_civil_definida: '',
    prazo_definicao_obra: '',
    local_instalacao: '',
    acesso_guindaste: '',
    data_max_montagem_loco: '',
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
      setError('Responsável e data da reunião são obrigatórios');
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
        setError(result.error || 'Erro ao salvar formulário');
      }
    } catch (err) {
      setError('Erro ao salvar formulário');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 sticky top-0 z-10">
        <h3 className="font-semibold text-blue-900">REGISTRO - REUNIÃO DE START 1 (COLETOR)</h3>
        <p className="text-sm text-blue-700 mt-1">OPD: {numeroOpd}</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {/* INFORMAÇÕES DO EQUIPAMENTO */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-4 text-blue-900">INFORMAÇÕES DO EQUIPAMENTO</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Equipamento</label>
            <input type="text" name="equipamento" value={formData.equipamento} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data de Entrega</label>
            <input type="date" name="data_entrega" value={formData.data_entrega} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Grau de Rotação</label>
            <select name="grau_rotacao" value={formData.grau_rotacao} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="180">180°</option>
              <option value="270">270°</option>
              <option value="360">360°</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Tipo de Coletor</label>
            <select name="tipo_coletor" value={formData.tipo_coletor} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="ROTATIVO">ROTATIVO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Modelo</label>
            <input type="text" name="modelo_coletor" value={formData.modelo_coletor} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Comprimento Trilhos (m)</label>
            <input type="number" step="0.1" name="comprimento_trilhos" value={formData.comprimento_trilhos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES DA CENTRAL HIDRÁULICA */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-lg mb-4 text-green-900">INFORMAÇÕES DA CENTRAL HIDRÁULICA</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Voltagem Cliente</label>
            <select name="voltagem_cliente" value={formData.voltagem_cliente} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="220V">220V</option>
              <option value="380V">380V</option>
              <option value="440V">440V</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Frequência</label>
            <select name="frequencia" value={formData.frequencia} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="50Hz">50Hz</option>
              <option value="60Hz">60Hz</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd Motores</label>
            <input type="number" name="qtd_motores" value={formData.qtd_motores} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Marca Contactores</label>
            <input type="text" name="marca_contactores" value={formData.marca_contactores} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Distância Hidráulica (m)</label>
            <input type="number" step="0.1" name="distancia_hidraulica" value={formData.distancia_hidraulica} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Distância Ciclone (m)</label>
            <input type="number" step="0.1" name="distancia_ciclone" value={formData.distancia_ciclone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES DO CICLONE E COLETA */}
      <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
        <h4 className="font-bold text-lg mb-4 text-purple-900">CICLONE E TUBO DE COLETA</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Diâmetro Tubo</label>
            <input type="text" name="diametro_tubo" value={formData.diametro_tubo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Tipo Tubo Coleta</label>
            <input type="text" name="tipo_tubo_coleta" value={formData.tipo_tubo_coleta} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Comprimento Tubo (m)</label>
            <input type="number" step="0.1" name="comprimento_tubo_coleta" value={formData.comprimento_tubo_coleta} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Tipo Ciclone</label>
            <input type="text" name="tipo_ciclone" value={formData.tipo_ciclone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES DA ESTRUTURA */}
      <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
        <h4 className="font-bold text-lg mb-4 text-orange-900">ESTRUTURA</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Tipo de Escada</label>
            <select name="tipo_escada" value={formData.tipo_escada} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
              <option value="">Selecione</option>
              <option value="MARINHEIRO">MARINHEIRO</option>
              <option value="LANCE">LANCE</option>
              <option value="CARACOL">CARACOL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Platibanda</label>
            <select name="platibanda" value={formData.platibanda} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Tipo Coluna</label>
            <input type="text" name="tipo_coluna" value={formData.tipo_coluna} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Altura Coluna Inferior (m)</label>
            <input type="number" step="0.1" name="altura_coluna_inferior" value={formData.altura_coluna_inferior} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Altura Coluna Superior (m)</label>
            <input type="number" step="0.1" name="altura_coluna_superior" value={formData.altura_coluna_superior} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES ELÉTRICAS E COMANDO */}
      <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold text-lg mb-4 text-yellow-900">ELÉTRICA E COMANDO</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Acionamento/Comando</label>
            <select name="acionamento_comando" value={formData.acionamento_comando} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Selecione</option>
              <option value="CONTROLE_SEM_FIO">CONTROLE SEM FIO</option>
              <option value="CONTROLE_COM_FIO">CONTROLE COM FIO</option>
              <option value="AUTOMATICO">AUTOMÁTICO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd Fio Controle (m)</label>
            <input type="number" name="qtd_fio_controle" value={formData.qtd_fio_controle} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Tipo Cabo Elétrico</label>
            <input type="text" name="tipo_cabo_eletrico" value={formData.tipo_cabo_eletrico} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Sensor de Nível</label>
            <select name="sensor_nivel" value={formData.sensor_nivel} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES IN LOCO */}
      <div className="border-2 border-teal-300 rounded-lg p-4 bg-teal-50">
        <h4 className="font-bold text-lg mb-4 text-teal-900">INFORMAÇÕES IN LOCO</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Obra Civil Definida</label>
            <select name="obra_civil_definida" value={formData.obra_civil_definida} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Definição Obra</label>
            <input type="text" name="prazo_definicao_obra" value={formData.prazo_definicao_obra} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Local de Instalação</label>
            <input type="text" name="local_instalacao" value={formData.local_instalacao} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Acesso Guindaste</label>
            <select name="acesso_guindaste" value={formData.acesso_guindaste} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data Máx Montagem In Loco</label>
            <input type="date" name="data_max_montagem_loco" value={formData.data_max_montagem_loco} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1">Informações Adicionais</label>
            <textarea name="info_adicional_loco" value={formData.info_adicional_loco} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>
      </div>

      {/* RESPONSÁVEL */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-lg mb-4 text-red-900">RESPONSÁVEL DA REUNIÃO <span className="text-red-600">*</span></h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nome do Responsável <span className="text-red-600">*</span></label>
            <input type="text" name="responsavel_reuniao" value={formData.responsavel_reuniao} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data da Reunião <span className="text-red-600">*</span></label>
            <input type="date" name="data_reuniao" value={formData.data_reuniao} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
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
            <span>Salvar Reunião de Start 1 (Coletor)</span>
          )}
        </button>
      </div>
    </form>
  );
}
