'use client';

import { useState } from 'react';

interface FormReuniaoStartProps {
  numeroOpd: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormReuniaoStart({ numeroOpd, onSubmit, onCancel }: FormReuniaoStartProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    numero_opd: numeroOpd,
    // INFORMAÇÕES ESTRUTURAIS
    equipamento: '',
    data_entrega: '',
    vigas: '',
    cilindros_tipo: '',
    cilindros_estagios: '',
    cilindros_especificacao: '',
    tipo_piso: '',
    moldura: '',
    calhas_laterais: '',
    calhas_inferiores: '',
    qtd_trava_rodas: '',
    qtd_trava_chassis: '',
    modelo_trava_chassis: '',
    trava_pino: '',
    rodas_deslocamento: '',
    bracos: '',
    qtd_dentes_cinta: '',
    calhas_montadas_transporte: '',
    data_entrega_chumbadores: '',

    // INFORMAÇÕES DA CENTRAL E PAINEL
    voltagem_cliente: '',
    tipo_acionamento: '',
    sensor_moega_cheia: '',
    sensor_40: '',
    sensor_trava_roda_aberto: '',
    rele_seguranca: '',
    pedestal_motorista: '',
    oleo_especial: '',
    central_auxiliar: '',
    calco_seguranca: '',
    espera_sensor_portao: '',
    kit_descida_rapida: '',
    outras_informacoes: '',

    // INFORMAÇÕES DE CILINDROS
    cilindros_trava_roda: '',
    cilindros_trava_chassis_gaveta: '',
    cilindros_trava_chassis_telesc_articulacao: '',
    cilindros_trava_chassis_telesc_elevacao: '',
    cilindros_rodas: '',
    cilindros_rampas: '',
    cilindros_freio: '',
    cilindros_abertura_trava_pino: '',
    cilindros_cabecote_trava_pino: '',
    data_max_entrega_cilindros: '',

    // INFORMAÇÕES IN LOCO
    obra_civil_definida: '',
    prazo_definicao_obra: '',
    fixacao_pedestais: '',
    localizacao_central: '',
    localizacao_central_outra: '',
    suporte_ripas_laterais: '',
    suporte_tubulacao_moega: '',
    conj_munhoes: '',
    qtd_munhoes: '',
    enclausuramento: '',
    fabricar_portoes: '',
    data_max_montagem_loco: '',
    info_adicional_loco: '',

    // INFORMAÇÕES SOB PLATAFORMA
    hidraulica: '',
    passagem: '',
    data_inicio_montagem: '',

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
      <div className="bg-red-50 border-l-4 border-red-600 p-4 sticky top-0 z-10">
        <h3 className="font-semibold text-red-900">REGISTRO - REUNIÃO DE START 1</h3>
        <p className="text-sm text-red-700 mt-1">OPD: {numeroOpd}</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {/* INFORMAÇÕES ESTRUTURAIS */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-4 text-blue-900">INFORMAÇÕES ESTRUTURAIS</h4>
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
            <label className="block text-sm font-semibold mb-1">Vigas</label>
            <input type="text" name="vigas" value={formData.vigas} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Tipo</label>
            <select name="cilindros_tipo" value={formData.cilindros_tipo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="HYVA">HYVA</option>
              <option value="IMPORTADO">IMPORTADO</option>
              <option value="NACIONAL">NACIONAL</option>
              <option value="OUTRO">OUTRO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Estágios</label>
            <select name="cilindros_estagios" value={formData.cilindros_estagios} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="4 estágios para 18m (191mm)">4 estágios para 18m (191mm)</option>
              <option value="4 estágios padrão (214mm)">4 estágios padrão (214mm)</option>
              <option value="3 estágios hyva">3 estágios hyva</option>
              <option value="3 estágios importado">3 estágios importado</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          {formData.cilindros_estagios === 'Outro' && (
            <div>
              <label className="block text-sm font-semibold mb-1">Especifique Cilindro</label>
              <input type="text" name="cilindros_especificacao" value={formData.cilindros_especificacao} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-1">Tipo de Piso</label>
            <select name="tipo_piso" value={formData.tipo_piso} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="Fechado">Fechado</option>
              <option value="Gradeado">Gradeado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Moldura</label>
            <select name="moldura" value={formData.moldura} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="Sem moldura">Sem moldura</option>
              <option value="Com moldura até cilindros">Com moldura até cilindros</option>
              <option value="Com moldura curta">Com moldura curta</option>
              <option value="Com moldura completa">Com moldura completa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Calhas Laterais</label>
            <select name="calhas_laterais" value={formData.calhas_laterais} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Calhas Inferiores</label>
            <select name="calhas_inferiores" value={formData.calhas_inferiores} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd Trava Rodas</label>
            <input type="number" name="qtd_trava_rodas" value={formData.qtd_trava_rodas} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd Trava Chassis</label>
            <input type="number" name="qtd_trava_chassis" value={formData.qtd_trava_chassis} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Modelo Trava Chassis</label>
            <select name="modelo_trava_chassis" value={formData.modelo_trava_chassis} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="GAVETA">GAVETA</option>
              <option value="TELESCÓPICO">TELESCÓPICO</option>
              <option value="ARTICULADO">ARTICULADO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Trava Pino</label>
            <select name="trava_pino" value={formData.trava_pino} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Rodas Deslocamento</label>
            <input type="text" name="rodas_deslocamento" value={formData.rodas_deslocamento} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Braços</label>
            <input type="text" name="bracos" value={formData.bracos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd Dentes Cinta</label>
            <input type="number" name="qtd_dentes_cinta" value={formData.qtd_dentes_cinta} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Calhas Montadas Transporte</label>
            <select name="calhas_montadas_transporte" value={formData.calhas_montadas_transporte} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data Entrega Chumbadores</label>
            <input type="date" name="data_entrega_chumbadores" value={formData.data_entrega_chumbadores} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES DA CENTRAL E PAINEL */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-lg mb-4 text-green-900">INFORMAÇÕES DA CENTRAL E PAINEL</h4>
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
            <label className="block text-sm font-semibold mb-1">Tipo Acionamento</label>
            <select name="tipo_acionamento" value={formData.tipo_acionamento} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="MANUAL">MANUAL</option>
              <option value="AUTOMÁTICO">AUTOMÁTICO</option>
              <option value="SEMI-AUTOMÁTICO">SEMI-AUTOMÁTICO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Sensor Moega Cheia</label>
            <select name="sensor_moega_cheia" value={formData.sensor_moega_cheia} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Sensor 40%</label>
            <select name="sensor_40" value={formData.sensor_40} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Sensor Trava Roda Aberto</label>
            <select name="sensor_trava_roda_aberto" value={formData.sensor_trava_roda_aberto} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Relé Segurança</label>
            <select name="rele_seguranca" value={formData.rele_seguranca} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Pedestal Motorista</label>
            <select name="pedestal_motorista" value={formData.pedestal_motorista} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Óleo Especial</label>
            <select name="oleo_especial" value={formData.oleo_especial} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Central Auxiliar</label>
            <select name="central_auxiliar" value={formData.central_auxiliar} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Calço Segurança</label>
            <select name="calco_seguranca" value={formData.calco_seguranca} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Espera Sensor Portão</label>
            <select name="espera_sensor_portao" value={formData.espera_sensor_portao} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Kit Descida Rápida</label>
            <select name="kit_descida_rapida" value={formData.kit_descida_rapida} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1">Outras Informações</label>
            <textarea name="outras_informacoes" value={formData.outras_informacoes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES DE CILINDROS */}
      <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
        <h4 className="font-bold text-lg mb-4 text-purple-900">INFORMAÇÕES DE CILINDROS</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Trava Roda</label>
            <input type="text" name="cilindros_trava_roda" value={formData.cilindros_trava_roda} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Trava Chassis Gaveta</label>
            <input type="text" name="cilindros_trava_chassis_gaveta" value={formData.cilindros_trava_chassis_gaveta} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Trava Chassis Telesc Articulação</label>
            <input type="text" name="cilindros_trava_chassis_telesc_articulacao" value={formData.cilindros_trava_chassis_telesc_articulacao} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Trava Chassis Telesc Elevação</label>
            <input type="text" name="cilindros_trava_chassis_telesc_elevacao" value={formData.cilindros_trava_chassis_telesc_elevacao} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Rodas</label>
            <input type="text" name="cilindros_rodas" value={formData.cilindros_rodas} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Rampas</label>
            <input type="text" name="cilindros_rampas" value={formData.cilindros_rampas} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Freio</label>
            <input type="text" name="cilindros_freio" value={formData.cilindros_freio} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Abertura Trava Pino</label>
            <input type="text" name="cilindros_abertura_trava_pino" value={formData.cilindros_abertura_trava_pino} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Cabeçote Trava Pino</label>
            <input type="text" name="cilindros_cabecote_trava_pino" value={formData.cilindros_cabecote_trava_pino} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data Máx Entrega Cilindros</label>
            <input type="date" name="data_max_entrega_cilindros" value={formData.data_max_entrega_cilindros} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES IN LOCO */}
      <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold text-lg mb-4 text-yellow-900">INFORMAÇÕES IN LOCO</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Obra Civil Definida</label>
            <select name="obra_civil_definida" value={formData.obra_civil_definida} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Definição Obra</label>
            <input type="text" name="prazo_definicao_obra" value={formData.prazo_definicao_obra} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Fixação Pedestais</label>
            <select name="fixacao_pedestais" value={formData.fixacao_pedestais} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Selecione</option>
              <option value="CHUMBADORES">CHUMBADORES</option>
              <option value="SOLDA">SOLDA</option>
              <option value="PARAFUSOS">PARAFUSOS</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Localização Central</label>
            <select name="localizacao_central" value={formData.localizacao_central} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Selecione</option>
              <option value="SUPERIOR">SUPERIOR</option>
              <option value="INFERIOR">INFERIOR</option>
              <option value="LATERAL">LATERAL</option>
              <option value="OUTRA">OUTRA</option>
            </select>
          </div>
          {formData.localizacao_central === 'OUTRA' && (
            <div>
              <label className="block text-sm font-semibold mb-1">Outra Localização</label>
              <input type="text" name="localizacao_central_outra" value={formData.localizacao_central_outra} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-1">Suporte Ripas Laterais</label>
            <select name="suporte_ripas_laterais" value={formData.suporte_ripas_laterais} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Suporte Tubulação Moega</label>
            <select name="suporte_tubulacao_moega" value={formData.suporte_tubulacao_moega} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Conjunto Munhões</label>
            <select name="conj_munhoes" value={formData.conj_munhoes} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd Munhões</label>
            <input type="number" name="qtd_munhoes" value={formData.qtd_munhoes} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Enclausuramento</label>
            <select name="enclausuramento" value={formData.enclausuramento} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Fabricar Portões</label>
            <select name="fabricar_portoes" value={formData.fabricar_portoes} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data Máx Montagem In Loco</label>
            <input type="date" name="data_max_montagem_loco" value={formData.data_max_montagem_loco} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1">Informações Adicionais In Loco</label>
            <textarea name="info_adicional_loco" value={formData.info_adicional_loco} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES SOB PLATAFORMA */}
      <div className="border-2 border-pink-300 rounded-lg p-4 bg-pink-50">
        <h4 className="font-bold text-lg mb-4 text-pink-900">INFORMAÇÕES SOB PLATAFORMA</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Hidráulica</label>
            <select name="hidraulica" value={formData.hidraulica} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Passagem</label>
            <select name="passagem" value={formData.passagem} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500">
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data Início Montagem</label>
            <input type="date" name="data_inicio_montagem" value={formData.data_inicio_montagem} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500" />
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
        <button type="submit" disabled={loading} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center space-x-2">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar Reunião de Start 1</span>
          )}
        </button>
      </div>
    </form>
  );
}
