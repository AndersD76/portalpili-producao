'use client';

import { useState, useEffect } from 'react';

interface FormularioReuniaoStart2Props {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioReuniaoStart2({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioReuniaoStart2Props) {
  const [loading, setLoading] = useState(false);
  const [loadingPreviousData, setLoadingPreviousData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    // INFORMAÇÕES ESTRUTURAIS
    equipamento: '',
    data_entrega: '',
    vigas: '',
    cilindros_tipo: '',
    cilindros_estagios: '',
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
    prazo_corte_central: '',
    prazo_dobra_central: '',
    prazo_solda_central: '',
    prazo_eng_planos_central: '',
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

    // PRAZO PARA LIBERAÇÕES
    prazo_estrutura: '',
    prazo_central: '',
    prazo_painel: '',
    prazo_in_loco: '',
    prazo_sob_plataforma: ''
  });

  // Carregar dados da Reunião de Start 1
  useEffect(() => {
    const fetchPreviousData = async () => {
      try {
        setLoadingPreviousData(true);
        const response = await fetch(`/api/formularios-reuniao/${opd}`);
        const result = await response.json();

        if (result.success && result.data && result.data.dados_formulario) {
          // Pre-preencher com dados do Start 1
          const dadosStart1 = typeof result.data.dados_formulario === 'string'
            ? JSON.parse(result.data.dados_formulario)
            : result.data.dados_formulario;

          setFormData(prev => ({ ...prev, ...dadosStart1 }));
        }
      } catch (err) {
        console.error('Erro ao carregar dados da Reunião de Start 1:', err);
        setError('Aviso: Não foi possível carregar os dados da Reunião de Start 1. Preencha manualmente.');
      } finally {
        setLoadingPreviousData(false);
      }
    };

    fetchPreviousData();
  }, [opd]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Salvar formulário Start 2 via API
      const response = await fetch(`/api/formularios-start2/${opd}`, {
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

  if (loadingPreviousData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados da Reunião de Start 1...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {/* Mensagem de validação */}
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p className="font-semibold">Reunião de Start 2 - Validação</p>
        <p className="text-sm">Os dados abaixo foram carregados da Reunião de Start 1. Valide e atualize conforme necessário.</p>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* INFORMAÇÕES ESTRUTURAIS */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-4 text-blue-900">INFORMAÇÕES ESTRUTURAIS</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Equipamento</label>
            <input
              type="text"
              name="equipamento"
              value={formData.equipamento}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data de Entrega</label>
            <input
              type="date"
              name="data_entrega"
              value={formData.data_entrega}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Vigas</label>
            <input
              type="text"
              name="vigas"
              value={formData.vigas}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Tipo</label>
            <input
              type="text"
              name="cilindros_tipo"
              value={formData.cilindros_tipo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Estágios</label>
            <input
              type="text"
              name="cilindros_estagios"
              value={formData.cilindros_estagios}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Moldura</label>
            <input
              type="text"
              name="moldura"
              value={formData.moldura}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Calhas Laterais</label>
            <input
              type="text"
              name="calhas_laterais"
              value={formData.calhas_laterais}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Calhas Inferiores</label>
            <input
              type="text"
              name="calhas_inferiores"
              value={formData.calhas_inferiores}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd Trava Rodas</label>
            <input
              type="text"
              name="qtd_trava_rodas"
              value={formData.qtd_trava_rodas}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd Trava Chassis</label>
            <input
              type="text"
              name="qtd_trava_chassis"
              value={formData.qtd_trava_chassis}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Modelo Trava Chassis</label>
            <input
              type="text"
              name="modelo_trava_chassis"
              value={formData.modelo_trava_chassis}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Trava Pino</label>
            <input
              type="text"
              name="trava_pino"
              value={formData.trava_pino}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Rodas Deslocamento</label>
            <input
              type="text"
              name="rodas_deslocamento"
              value={formData.rodas_deslocamento}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Braços</label>
            <input
              type="text"
              name="bracos"
              value={formData.bracos}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd Dentes Cinta</label>
            <input
              type="text"
              name="qtd_dentes_cinta"
              value={formData.qtd_dentes_cinta}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Calhas Montadas Transporte</label>
            <select
              name="calhas_montadas_transporte"
              value={formData.calhas_montadas_transporte}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data Entrega Chumbadores</label>
            <input
              type="date"
              name="data_entrega_chumbadores"
              value={formData.data_entrega_chumbadores}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES DA CENTRAL E PAINEL */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-lg mb-4 text-green-900">INFORMAÇÕES DA CENTRAL E PAINEL</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Voltagem Cliente</label>
            <input
              type="text"
              name="voltagem_cliente"
              value={formData.voltagem_cliente}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Tipo Acionamento</label>
            <input
              type="text"
              name="tipo_acionamento"
              value={formData.tipo_acionamento}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Sensor Moega Cheia</label>
            <select
              name="sensor_moega_cheia"
              value={formData.sensor_moega_cheia}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Sensor 40%</label>
            <select
              name="sensor_40"
              value={formData.sensor_40}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Sensor Trava Roda Aberto</label>
            <select
              name="sensor_trava_roda_aberto"
              value={formData.sensor_trava_roda_aberto}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Relé Segurança</label>
            <select
              name="rele_seguranca"
              value={formData.rele_seguranca}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Pedestal Motorista</label>
            <select
              name="pedestal_motorista"
              value={formData.pedestal_motorista}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Óleo Especial</label>
            <select
              name="oleo_especial"
              value={formData.oleo_especial}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Central Auxiliar</label>
            <select
              name="central_auxiliar"
              value={formData.central_auxiliar}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Calço Segurança</label>
            <select
              name="calco_seguranca"
              value={formData.calco_seguranca}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Espera Sensor Portão</label>
            <select
              name="espera_sensor_portao"
              value={formData.espera_sensor_portao}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Kit Descida Rápida</label>
            <select
              name="kit_descida_rapida"
              value={formData.kit_descida_rapida}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Corte Central</label>
            <input
              type="text"
              name="prazo_corte_central"
              value={formData.prazo_corte_central}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Dobra Central</label>
            <input
              type="text"
              name="prazo_dobra_central"
              value={formData.prazo_dobra_central}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Solda Central</label>
            <input
              type="text"
              name="prazo_solda_central"
              value={formData.prazo_solda_central}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Eng Planos Central</label>
            <input
              type="text"
              name="prazo_eng_planos_central"
              value={formData.prazo_eng_planos_central}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1">Outras Informações</label>
            <textarea
              name="outras_informacoes"
              value={formData.outras_informacoes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES DE CILINDROS */}
      <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
        <h4 className="font-bold text-lg mb-4 text-purple-900">INFORMAÇÕES DE CILINDROS</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Trava Roda</label>
            <input
              type="text"
              name="cilindros_trava_roda"
              value={formData.cilindros_trava_roda}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Trava Chassis Gaveta</label>
            <input
              type="text"
              name="cilindros_trava_chassis_gaveta"
              value={formData.cilindros_trava_chassis_gaveta}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Trava Chassis Telesc Articulação</label>
            <input
              type="text"
              name="cilindros_trava_chassis_telesc_articulacao"
              value={formData.cilindros_trava_chassis_telesc_articulacao}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Trava Chassis Telesc Elevação</label>
            <input
              type="text"
              name="cilindros_trava_chassis_telesc_elevacao"
              value={formData.cilindros_trava_chassis_telesc_elevacao}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Rodas</label>
            <input
              type="text"
              name="cilindros_rodas"
              value={formData.cilindros_rodas}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Rampas</label>
            <input
              type="text"
              name="cilindros_rampas"
              value={formData.cilindros_rampas}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Freio</label>
            <input
              type="text"
              name="cilindros_freio"
              value={formData.cilindros_freio}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Abertura Trava Pino</label>
            <input
              type="text"
              name="cilindros_abertura_trava_pino"
              value={formData.cilindros_abertura_trava_pino}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Cilindros Cabeçote Trava Pino</label>
            <input
              type="text"
              name="cilindros_cabecote_trava_pino"
              value={formData.cilindros_cabecote_trava_pino}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data Máx Entrega Cilindros</label>
            <input
              type="date"
              name="data_max_entrega_cilindros"
              value={formData.data_max_entrega_cilindros}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES IN LOCO */}
      <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold text-lg mb-4 text-yellow-900">INFORMAÇÕES IN LOCO</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Obra Civil Definida</label>
            <select
              name="obra_civil_definida"
              value={formData.obra_civil_definida}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Definição Obra</label>
            <input
              type="text"
              name="prazo_definicao_obra"
              value={formData.prazo_definicao_obra}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Fixação Pedestais</label>
            <input
              type="text"
              name="fixacao_pedestais"
              value={formData.fixacao_pedestais}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Localização Central</label>
            <select
              name="localizacao_central"
              value={formData.localizacao_central}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
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
              <input
                type="text"
                name="localizacao_central_outra"
                value={formData.localizacao_central_outra}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-1">Suporte Ripas Laterais</label>
            <select
              name="suporte_ripas_laterais"
              value={formData.suporte_ripas_laterais}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Suporte Tubulação Moega</label>
            <select
              name="suporte_tubulacao_moega"
              value={formData.suporte_tubulacao_moega}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Conjunto Munhões</label>
            <select
              name="conj_munhoes"
              value={formData.conj_munhoes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd Munhões</label>
            <input
              type="text"
              name="qtd_munhoes"
              value={formData.qtd_munhoes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Enclausuramento</label>
            <select
              name="enclausuramento"
              value={formData.enclausuramento}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Fabricar Portões</label>
            <select
              name="fabricar_portoes"
              value={formData.fabricar_portoes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data Máx Montagem In Loco</label>
            <input
              type="date"
              name="data_max_montagem_loco"
              value={formData.data_max_montagem_loco}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1">Informações Adicionais In Loco</label>
            <textarea
              name="info_adicional_loco"
              value={formData.info_adicional_loco}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES SOB PLATAFORMA */}
      <div className="border-2 border-pink-300 rounded-lg p-4 bg-pink-50">
        <h4 className="font-bold text-lg mb-4 text-pink-900">INFORMAÇÕES SOB PLATAFORMA</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Hidráulica</label>
            <select
              name="hidraulica"
              value={formData.hidraulica}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Passagem</label>
            <select
              name="passagem"
              value={formData.passagem}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Selecione</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Data Início Montagem</label>
            <input
              type="date"
              name="data_inicio_montagem"
              value={formData.data_inicio_montagem}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>
      </div>

      {/* PRAZO PARA LIBERAÇÕES */}
      <div className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
        <h4 className="font-bold text-lg mb-4 text-indigo-900">PRAZO PARA LIBERAÇÕES</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Estrutura</label>
            <input
              type="text"
              name="prazo_estrutura"
              value={formData.prazo_estrutura}
              onChange={handleChange}
              placeholder="Ex: 30 dias"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Central</label>
            <input
              type="text"
              name="prazo_central"
              value={formData.prazo_central}
              onChange={handleChange}
              placeholder="Ex: 20 dias"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Painel</label>
            <input
              type="text"
              name="prazo_painel"
              value={formData.prazo_painel}
              onChange={handleChange}
              placeholder="Ex: 25 dias"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo In Loco</label>
            <input
              type="text"
              name="prazo_in_loco"
              value={formData.prazo_in_loco}
              onChange={handleChange}
              placeholder="Ex: 15 dias"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Prazo Sob Plataforma</label>
            <input
              type="text"
              name="prazo_sob_plataforma"
              value={formData.prazo_sob_plataforma}
              onChange={handleChange}
              placeholder="Ex: 10 dias"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
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
              <span>Salvar Reunião de Start 2</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
