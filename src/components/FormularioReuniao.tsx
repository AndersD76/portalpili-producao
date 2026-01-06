'use client';

import { useState } from 'react';

interface FormularioReuniaoProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioReuniao({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioReuniaoProps) {
  const [loading, setLoading] = useState(false);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Salvar formulário via API
      const response = await fetch(`/api/formularios-reuniao/${opd}`, {
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
        <h3 className="font-bold text-lg mb-2">OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* INFORMAÇÕES ESTRUTURAIS */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-4 text-blue-900">INFORMAÇÕES ESTRUTURAIS</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">EQUIPAMENTO:</label>
            <input
              type="text"
              name="equipamento"
              value={formData.equipamento}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ex: Tombador 26m"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">DATA DE ENTREGA:</label>
            <input
              type="date"
              name="data_entrega"
              value={formData.data_entrega}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">VIGAS:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="vigas" value="CAIXAO" checked={formData.vigas === 'CAIXAO'} onChange={handleChange} className="mr-1" />
                CAIXÃO
              </label>
              <label className="flex items-center">
                <input type="radio" name="vigas" value="VIGAS_W" checked={formData.vigas === 'VIGAS_W'} onChange={handleChange} className="mr-1" />
                VIGAS W
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">CILINDROS:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="cilindros_tipo" value="EXTERNOS" checked={formData.cilindros_tipo === 'EXTERNOS'} onChange={handleChange} className="mr-1" />
                EXTERNOS
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_tipo" value="INTERNOS" checked={formData.cilindros_tipo === 'INTERNOS'} onChange={handleChange} className="mr-1" />
                INTERNOS
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-1">CILINDROS (ESTÁGIOS):</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input type="radio" name="cilindros_estagios" value="2_EST" checked={formData.cilindros_estagios === '2_EST'} onChange={handleChange} className="mr-1" />
              2 EST.
            </label>
            <label className="flex items-center">
              <input type="radio" name="cilindros_estagios" value="3_EST" checked={formData.cilindros_estagios === '3_EST'} onChange={handleChange} className="mr-1" />
              3 EST.
            </label>
            <label className="flex items-center">
              <input type="radio" name="cilindros_estagios" value="4_EST" checked={formData.cilindros_estagios === '4_EST'} onChange={handleChange} className="mr-1" />
              4 EST.
            </label>
            <label className="flex items-center">
              <input type="radio" name="cilindros_estagios" value="5_EST" checked={formData.cilindros_estagios === '5_EST'} onChange={handleChange} className="mr-1" />
              5 EST.
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">MOLDURA:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="moldura" value="SIM" checked={formData.moldura === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="moldura" value="NAO" checked={formData.moldura === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">CALHAS LATERAIS:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="calhas_laterais" value="SIM" checked={formData.calhas_laterais === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="calhas_laterais" value="NAO" checked={formData.calhas_laterais === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">CALHAS INFERIORES:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="calhas_inferiores" value="SIM" checked={formData.calhas_inferiores === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="calhas_inferiores" value="NAO" checked={formData.calhas_inferiores === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">QUANTOS CONJ DE TRAVA RODAS:</label>
            <input
              type="text"
              name="qtd_trava_rodas"
              value={formData.qtd_trava_rodas}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">QUANTOS TRAVA CHASSI?</label>
            <input
              type="text"
              name="qtd_trava_chassis"
              value={formData.qtd_trava_chassis}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">MODELO TRAVA CHASSIS:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="modelo_trava_chassis" value="GAVETA" checked={formData.modelo_trava_chassis === 'GAVETA'} onChange={handleChange} className="mr-1" />
                GAVETA
              </label>
              <label className="flex items-center">
                <input type="radio" name="modelo_trava_chassis" value="ARTICULADO" checked={formData.modelo_trava_chassis === 'ARTICULADO'} onChange={handleChange} className="mr-1" />
                ARTICULADO
              </label>
              <label className="flex items-center">
                <input type="radio" name="modelo_trava_chassis" value="NENHUM" checked={formData.modelo_trava_chassis === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">TRAVA PINO:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="trava_pino" value="MODELO_NOVO" checked={formData.trava_pino === 'MODELO_NOVO'} onChange={handleChange} className="mr-1" />
                MODELO NOVO
              </label>
              <label className="flex items-center">
                <input type="radio" name="trava_pino" value="MODELO_ANTIGO" checked={formData.trava_pino === 'MODELO_ANTIGO'} onChange={handleChange} className="mr-1" />
                MODELO ANTIGO
              </label>
              <label className="flex items-center">
                <input type="radio" name="trava_pino" value="NENHUM" checked={formData.trava_pino === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">RODAS DE DESLOCAMENTO:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="rodas_deslocamento" value="4" checked={formData.rodas_deslocamento === '4'} onChange={handleChange} className="mr-1" />
                4
              </label>
              <label className="flex items-center">
                <input type="radio" name="rodas_deslocamento" value="6" checked={formData.rodas_deslocamento === '6'} onChange={handleChange} className="mr-1" />
                6
              </label>
              <label className="flex items-center">
                <input type="radio" name="rodas_deslocamento" value="NENHUMA" checked={formData.rodas_deslocamento === 'NENHUMA'} onChange={handleChange} className="mr-1" />
                NENHUMA
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">BRAÇOS:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="bracos" value="SIM" checked={formData.bracos === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="bracos" value="NAO" checked={formData.bracos === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">QUANTOS DENTES PARA CINTA COM CATRACA:</label>
            <input
              type="text"
              name="qtd_dentes_cinta"
              value={formData.qtd_dentes_cinta}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="padrão 26m"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">CALHAS VAO MONTADAS NO TRANSPORTE:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="calhas_montadas_transporte" value="SIM" checked={formData.calhas_montadas_transporte === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="calhas_montadas_transporte" value="NAO" checked={formData.calhas_montadas_transporte === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">DATA DE ENTREGA DE CHUMBADORES:</label>
            <input
              type="date"
              name="data_entrega_chumbadores"
              value={formData.data_entrega_chumbadores}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES DA CENTRAL E PAINEL */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-lg mb-4 text-green-900">INFORMAÇÕES DA CENTRAL E PAINEL</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">VOLTAGEM DO CLIENTE:</label>
            <input
              type="text"
              name="voltagem_cliente"
              value={formData.voltagem_cliente}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="aguardando"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">TIPO DE ACIONAMENTO:</label>
            <div className="flex gap-2 flex-wrap">
              <label className="flex items-center">
                <input type="radio" name="tipo_acionamento" value="CONTROLE_SEM_FIO" checked={formData.tipo_acionamento === 'CONTROLE_SEM_FIO'} onChange={handleChange} className="mr-1" />
                CONTROLE SEM FIO
              </label>
              <label className="flex items-center">
                <input type="radio" name="tipo_acionamento" value="CONTROLE_COM_FIO" checked={formData.tipo_acionamento === 'CONTROLE_COM_FIO'} onChange={handleChange} className="mr-1" />
                CONTROLE COM FIO
              </label>
              <label className="flex items-center">
                <input type="radio" name="tipo_acionamento" value="PEDESTAIS" checked={formData.tipo_acionamento === 'PEDESTAIS'} onChange={handleChange} className="mr-1" />
                PEDESTAIS
              </label>
              <label className="flex items-center">
                <input type="radio" name="tipo_acionamento" value="ALAVANCA" checked={formData.tipo_acionamento === 'ALAVANCA'} onChange={handleChange} className="mr-1" />
                ALAVANCA
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">SENSOR MOEGA CHEIA:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="sensor_moega_cheia" value="SIM" checked={formData.sensor_moega_cheia === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="sensor_moega_cheia" value="NAO" checked={formData.sensor_moega_cheia === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">SENSOR 40°:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="sensor_40" value="SIM" checked={formData.sensor_40 === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="sensor_40" value="NAO" checked={formData.sensor_40 === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">SENSOR TRAVA RODA ABERTO:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="sensor_trava_roda_aberto" value="SIM" checked={formData.sensor_trava_roda_aberto === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="sensor_trava_roda_aberto" value="NAO" checked={formData.sensor_trava_roda_aberto === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">RELÉ DE SEGURANÇA:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="rele_seguranca" value="SIM" checked={formData.rele_seguranca === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="rele_seguranca" value="NAO" checked={formData.rele_seguranca === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">TEM PEDESTAL DO MOTORISTA:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="pedestal_motorista" value="SIM" checked={formData.pedestal_motorista === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="pedestal_motorista" value="NAO" checked={formData.pedestal_motorista === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">ÓLEO ESPECIAL:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="oleo_especial" value="SIM" checked={formData.oleo_especial === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="oleo_especial" value="NAO" checked={formData.oleo_especial === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">CENTRAL AUXILIAR:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="central_auxiliar" value="SIM" checked={formData.central_auxiliar === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="central_auxiliar" value="NAO" checked={formData.central_auxiliar === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">CALÇO DE SEGURANÇA:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="calco_seguranca" value="MECANICO" checked={formData.calco_seguranca === 'MECANICO'} onChange={handleChange} className="mr-1" />
                MECÂNICO
              </label>
              <label className="flex items-center">
                <input type="radio" name="calco_seguranca" value="HIDRAULICO" checked={formData.calco_seguranca === 'HIDRAULICO'} onChange={handleChange} className="mr-1" />
                HIDRÁULICO
              </label>
              <label className="flex items-center">
                <input type="radio" name="calco_seguranca" value="NAO" checked={formData.calco_seguranca === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">ESPERA PARA SENSOR DE PORTAO NO PAINEL:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="espera_sensor_portao" value="SIM" checked={formData.espera_sensor_portao === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="espera_sensor_portao" value="NAO" checked={formData.espera_sensor_portao === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">KIT DESCIDA RÁPIDA:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="kit_descida_rapida" value="SIM" checked={formData.kit_descida_rapida === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="kit_descida_rapida" value="NAO" checked={formData.kit_descida_rapida === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">PRAZO PARA CORTE DA CENTRAL:</label>
            <input
              type="date"
              name="prazo_corte_central"
              value={formData.prazo_corte_central}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">PRAZO PARA DOBRA DA CENTRAL:</label>
            <input
              type="date"
              name="prazo_dobra_central"
              value={formData.prazo_dobra_central}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">PRAZO PARA SOLDA DA CENTRAL:</label>
            <input
              type="date"
              name="prazo_solda_central"
              value={formData.prazo_solda_central}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">PRAZO PARA ENGENHARIA ENTREGAR PLANOS E LISTAS DA CENTRAL:</label>
            <input
              type="date"
              name="prazo_eng_planos_central"
              value={formData.prazo_eng_planos_central}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-1">OUTRAS INFORMAÇÕES NECESSÁRIAS:</label>
          <textarea
            name="outras_informacoes"
            value={formData.outras_informacoes}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
            placeholder="Ex: Controle - trava rodas móvel"
          />
        </div>
      </div>

      {/* INFORMAÇÕES DE CILINDROS */}
      <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
        <h4 className="font-bold text-lg mb-4 text-purple-900">INFORMAÇÕES DE CILINDROS</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">CILINDROS DE TRAVA RODA:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_roda" value="2" checked={formData.cilindros_trava_roda === '2'} onChange={handleChange} className="mr-1" />
                2
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_roda" value="4" checked={formData.cilindros_trava_roda === '4'} onChange={handleChange} className="mr-1" />
                4
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_roda" value="NENHUM" checked={formData.cilindros_trava_roda === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">CILINDRO DE TRAVA CHASSI GAVETA:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_gaveta" value="1" checked={formData.cilindros_trava_chassis_gaveta === '1'} onChange={handleChange} className="mr-1" />
                1
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_gaveta" value="2" checked={formData.cilindros_trava_chassis_gaveta === '2'} onChange={handleChange} className="mr-1" />
                2
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_gaveta" value="3" checked={formData.cilindros_trava_chassis_gaveta === '3'} onChange={handleChange} className="mr-1" />
                3
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_gaveta" value="NENHUM" checked={formData.cilindros_trava_chassis_gaveta === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">CILINDRO DE TRAVA CHASSI TELESC. ARTICULAÇÃO:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_telesc_articulacao" value="1" checked={formData.cilindros_trava_chassis_telesc_articulacao === '1'} onChange={handleChange} className="mr-1" />
                1
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_telesc_articulacao" value="2" checked={formData.cilindros_trava_chassis_telesc_articulacao === '2'} onChange={handleChange} className="mr-1" />
                2
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_telesc_articulacao" value="3" checked={formData.cilindros_trava_chassis_telesc_articulacao === '3'} onChange={handleChange} className="mr-1" />
                3
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_telesc_articulacao" value="NENHUM" checked={formData.cilindros_trava_chassis_telesc_articulacao === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">CILINDRO DE TRAVA CHASSI TELESC. ELEVAÇÃO:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_telesc_elevacao" value="1" checked={formData.cilindros_trava_chassis_telesc_elevacao === '1'} onChange={handleChange} className="mr-1" />
                1
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_telesc_elevacao" value="2" checked={formData.cilindros_trava_chassis_telesc_elevacao === '2'} onChange={handleChange} className="mr-1" />
                2
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_telesc_elevacao" value="3" checked={formData.cilindros_trava_chassis_telesc_elevacao === '3'} onChange={handleChange} className="mr-1" />
                3
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_trava_chassis_telesc_elevacao" value="NENHUM" checked={formData.cilindros_trava_chassis_telesc_elevacao === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">CILINDRO DE RODAS:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="cilindros_rodas" value="2" checked={formData.cilindros_rodas === '2'} onChange={handleChange} className="mr-1" />
                2
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_rodas" value="4" checked={formData.cilindros_rodas === '4'} onChange={handleChange} className="mr-1" />
                4
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_rodas" value="6" checked={formData.cilindros_rodas === '6'} onChange={handleChange} className="mr-1" />
                6
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_rodas" value="NENHUM" checked={formData.cilindros_rodas === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">CILINDRO DE RAMPAS:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="cilindros_rampas" value="2" checked={formData.cilindros_rampas === '2'} onChange={handleChange} className="mr-1" />
                2
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_rampas" value="4" checked={formData.cilindros_rampas === '4'} onChange={handleChange} className="mr-1" />
                4
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_rampas" value="NENHUM" checked={formData.cilindros_rampas === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">CILINDRO DE FREIO:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="cilindros_freio" value="2" checked={formData.cilindros_freio === '2'} onChange={handleChange} className="mr-1" />
                2
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_freio" value="4" checked={formData.cilindros_freio === '4'} onChange={handleChange} className="mr-1" />
                4
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_freio" value="6" checked={formData.cilindros_freio === '6'} onChange={handleChange} className="mr-1" />
                6
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_freio" value="NENHUM" checked={formData.cilindros_freio === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">CILINDRO DE ABERTURA TRAVA PINO:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="cilindros_abertura_trava_pino" value="2" checked={formData.cilindros_abertura_trava_pino === '2'} onChange={handleChange} className="mr-1" />
                2
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_abertura_trava_pino" value="4" checked={formData.cilindros_abertura_trava_pino === '4'} onChange={handleChange} className="mr-1" />
                4
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_abertura_trava_pino" value="6" checked={formData.cilindros_abertura_trava_pino === '6'} onChange={handleChange} className="mr-1" />
                6
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_abertura_trava_pino" value="NENHUM" checked={formData.cilindros_abertura_trava_pino === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">CILINDRO DE CABEÇOTE TRAVA PINO:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="cilindros_cabecote_trava_pino" value="2" checked={formData.cilindros_cabecote_trava_pino === '2'} onChange={handleChange} className="mr-1" />
                2
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_cabecote_trava_pino" value="4" checked={formData.cilindros_cabecote_trava_pino === '4'} onChange={handleChange} className="mr-1" />
                4
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_cabecote_trava_pino" value="6" checked={formData.cilindros_cabecote_trava_pino === '6'} onChange={handleChange} className="mr-1" />
                6
              </label>
              <label className="flex items-center">
                <input type="radio" name="cilindros_cabecote_trava_pino" value="NENHUM" checked={formData.cilindros_cabecote_trava_pino === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">DATA MÁXIMA DE ENTREGA:</label>
            <input
              type="date"
              name="data_max_entrega_cilindros"
              value={formData.data_max_entrega_cilindros}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES IN LOCO */}
      <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold text-lg mb-4 text-yellow-900">INFORMAÇÕES IN LOCO</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">OBRA CIVIL JÁ DEFINIDA TOTALMENTE:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="obra_civil_definida" value="SIM" checked={formData.obra_civil_definida === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="obra_civil_definida" value="NAO" checked={formData.obra_civil_definida === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">CASO NÃO, PRAZO PARA DEFINIÇÃO DA OBRA:</label>
            <input
              type="date"
              name="prazo_definicao_obra"
              value={formData.prazo_definicao_obra}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">FIXAÇÃO DOS PEDESTAIS NA OBRA:</label>
            <input
              type="text"
              name="fixacao_pedestais"
              value={formData.fixacao_pedestais}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="de travadores na plataforma e de sobe e desce no piso"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">LOCALIZAÇÃO DA CENTRAL:</label>
            <select name="localizacao_central" value={formData.localizacao_central} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
              <option value="">Selecione...</option>
              <option value="NO_FOSSO">NO FOSSO</option>
              <option value="NO_NIVEL_CAMINHAO">NO NÍVEL DO CAMINHÃO</option>
              <option value="OUTRA">OUTRA</option>
            </select>
          </div>
        </div>

        {formData.localizacao_central === 'OUTRA' && (
          <div className="mt-4">
            <label className="block text-sm font-semibold mb-1">ESPECIFIQUE LOCALIZAÇÃO:</label>
            <input
              type="text"
              name="localizacao_central_outra"
              value={formData.localizacao_central_outra}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Especifique a localização"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">SUPORTE RIPAS LATERAIS:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="suporte_ripas_laterais" value="SIM" checked={formData.suporte_ripas_laterais === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="suporte_ripas_laterais" value="NAO" checked={formData.suporte_ripas_laterais === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">SUPORTE TUBULAÇÃO DA MOEGA:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="suporte_tubulacao_moega" value="SIM" checked={formData.suporte_tubulacao_moega === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="suporte_tubulacao_moega" value="NAO" checked={formData.suporte_tubulacao_moega === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">CONJUNTOS DE MUNHÕES TOTAIS OU PARCIAIS:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="conj_munhoes" value="TOTAIS" checked={formData.conj_munhoes === 'TOTAIS'} onChange={handleChange} className="mr-1" />
                TOTAIS
              </label>
              <label className="flex items-center">
                <input type="radio" name="conj_munhoes" value="PARCIAIS" checked={formData.conj_munhoes === 'PARCIAIS'} onChange={handleChange} className="mr-1" />
                PARCIAIS
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">QTD DE MUNHOES:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="qtd_munhoes" value="3" checked={formData.qtd_munhoes === '3'} onChange={handleChange} className="mr-1" />
                3
              </label>
              <label className="flex items-center">
                <input type="radio" name="qtd_munhoes" value="4" checked={formData.qtd_munhoes === '4'} onChange={handleChange} className="mr-1" />
                4
              </label>
              <label className="flex items-center">
                <input type="radio" name="qtd_munhoes" value="NENHUM" checked={formData.qtd_munhoes === 'NENHUM'} onChange={handleChange} className="mr-1" />
                NENHUM
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">ENCLAUSURAMENTO:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="enclausuramento" value="SIM" checked={formData.enclausuramento === 'SIM'} onChange={handleChange} className="mr-1" />
                SIM
              </label>
              <label className="flex items-center">
                <input type="radio" name="enclausuramento" value="NAO" checked={formData.enclausuramento === 'NAO'} onChange={handleChange} className="mr-1" />
                NÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">FABRICAR PORTÕES:</label>
            <select name="fabricar_portoes" value={formData.fabricar_portoes} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
              <option value="ENTRADA">ENTRADA</option>
              <option value="SAIDA">SAÍDA</option>
              <option value="AMBOS">AMBOS</option>
              <option value="NENHUM">NENHUM</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">DATA MÁXIMA MONTAGEM IN LOCO:</label>
            <input
              type="date"
              name="data_max_montagem_loco"
              value={formData.data_max_montagem_loco}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">INFORMAÇÕES ADICIONAIS:</label>
            <textarea
              name="info_adicional_loco"
              value={formData.info_adicional_loco}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
              placeholder="definir enclausuramento (10/10/2025)"
            />
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES SOB PLATAFORMA */}
      <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
        <h4 className="font-bold text-lg mb-4 text-orange-900">INFORMAÇÕES SOB PLATAFORMA</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">HIDRÁULICA:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="hidraulica" value="MANGUEIRA" checked={formData.hidraulica === 'MANGUEIRA'} onChange={handleChange} className="mr-1" />
                MANGUEIRA
              </label>
              <label className="flex items-center">
                <input type="radio" name="hidraulica" value="TUBULACAO" checked={formData.hidraulica === 'TUBULACAO'} onChange={handleChange} className="mr-1" />
                TUBULAÇÃO
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">PASSAGEM:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="passagem" value="PELO_MEIO" checked={formData.passagem === 'PELO_MEIO'} onChange={handleChange} className="mr-1" />
                PELO MEIO
              </label>
              <label className="flex items-center">
                <input type="radio" name="passagem" value="PELA_LATERAL" checked={formData.passagem === 'PELA_LATERAL'} onChange={handleChange} className="mr-1" />
                PELA LATERAL
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-1">DATA DE INÍCIO DE MONTAGEM:</label>
          <input
            type="date"
            name="data_inicio_montagem"
            value={formData.data_inicio_montagem}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* PRAZO PARA LIBERAÇÕES */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-lg mb-4 text-red-900">PRAZO PARA LIBERAÇÕES</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">PRAZO ESTRUTURA:</label>
            <input
              type="date"
              name="prazo_estrutura"
              value={formData.prazo_estrutura}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">PRAZO CENTRAL:</label>
            <input
              type="date"
              name="prazo_central"
              value={formData.prazo_central}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold mb-1">PRAZO PAINEL:</label>
            <input
              type="date"
              name="prazo_painel"
              value={formData.prazo_painel}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">PRAZO IN LOCO:</label>
            <input
              type="date"
              name="prazo_in_loco"
              value={formData.prazo_in_loco}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-1">PRAZO SOB PLATAFORMA:</label>
          <input
            type="date"
            name="prazo_sob_plataforma"
            value={formData.prazo_sob_plataforma}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : 'Salvar Formulário'}
        </button>
      </div>
    </form>
  );
}
