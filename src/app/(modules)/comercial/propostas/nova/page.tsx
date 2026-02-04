'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Types
interface Cliente {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  municipio: string;
  estado: string;
  pais: string;
  regiao: string;
}

interface Vendedor {
  id: number;
  nome: string;
  email: string;
}

interface PrecoBase {
  id: number;
  produto: string;
  tamanho: number;
  tipo: string;
  preco: number;
  descricao: string;
  qt_cilindros: number;
  qt_motores: number;
  qt_oleo: number;
  angulo_inclinacao: string;
}

interface Opcional {
  id: number;
  codigo: string;
  nome: string;
  preco: number;
  preco_tipo: string;
  categoria_nome: string;
  produto: string;
}

// Form data structure matching PDF
interface FormData {
  // Informações Gerais
  vendedor_id: number | null;
  vendedor_email: string;
  regiao: string;
  cliente_id: number | null;
  cliente_cnpj: string;
  cliente_razao_social: string;
  pais: string;
  estado: string;
  municipio: string;
  contato_cliente: string;
  prazo_entrega: string;
  prazo_entrega_outro: string;
  data_visita: string;
  validade_proposta: number;
  chance_negocio: number;

  // Produto
  produto: 'TOMBADOR' | 'COLETOR';

  // TOMBADOR Config
  tombador_tamanho: number | null;
  tombador_tipo: string;
  tombador_comprimento_trilhos: number | null;
  tombador_angulo: string;
  tombador_complemento_titulo: string;

  // TOMBADOR Opcionais
  tombador_economizador: string;
  tombador_economizador_qtd: number;
  tombador_economizador_valor: number;
  tombador_calco_manutencao: string;
  tombador_calco_acionamento: string;
  tombador_calco_qtd: number;
  tombador_calco_valor: number;
  tombador_kit_descida: string;
  tombador_kit_descida_qtd: number;
  tombador_kit_descida_valor: number;
  tombador_mangueiras_hidraulicas: number;
  tombador_cabos_eletricos: number;
  tombador_voltagem: string;
  tombador_frequencia: string;
  tombador_travamento: string;
  tombador_travamento_qtd: number;
  tombador_travamento_valor: number;
  tombador_rampas: string;
  tombador_rampas_tipo: string;
  tombador_observacoes_rampas: string;
  tombador_enclausuramento: string;
  tombador_enclausuramento_qtd: number;
  tombador_enclausuramento_valor: number;
  tombador_botoeiras: string;
  tombador_botoeiras_fio_qtd: number;
  tombador_moldura: string;
  tombador_grelhas: string;
  tombador_grelhas_qtd: number;
  tombador_grelhas_valor: number;
  tombador_varandas: string;
  tombador_varandas_qtd: number;
  tombador_varandas_valor: number;
  tombador_cilindros_qtd: number;
  tombador_cilindros_tipo: string;
  tombador_oleo: string;
  tombador_oleo_valor: number;
  tombador_outros_requisitos: string;
  tombador_guindaste: string;
  tombador_guindaste_qtd: number;
  tombador_guindaste_valor: number;

  // COLETOR Config
  coletor_tipo: string;
  coletor_comprimento_trilhos: number | null;
  coletor_grau_rotacao: number | null;
  coletor_retorno_grao: string;
  coletor_retorno_grao_qtd: number;
  coletor_retorno_grao_valor: number;
  coletor_tubo_diametro: string;
  coletor_tubo_qtd: number;
  coletor_tubo_valor: number;
  coletor_motor_qtd: string;
  coletor_voltagem: string;
  coletor_frequencia: string;
  coletor_platibanda: string;
  coletor_platibanda_qtd: number;
  coletor_platibanda_valor: number;
  coletor_cadeira_platibanda: string;
  coletor_cadeira_qtd: number;
  coletor_cadeira_valor: number;
  coletor_acionamento: string;
  coletor_fio_controle_qtd: number;
  coletor_contactores: string;
  coletor_contactores_outro: string;
  coletor_distancia_hidraulica: number;
  coletor_distancia_ciclone: number;
  coletor_tipo_escada: string;
  coletor_oleo: string;
  coletor_oleo_valor: number;
  coletor_outros_requisitos: string;

  // Comercial
  garantia_meses: number;
  quantidade: number;
  preco_equipamento: number;
  forma_pagamento: string;
  frete_tipo: string;
  frete_qtd: number;
  frete_valor: number;
  deslocamentos_qtd: number;
  diaria_valor: number;
  montagem: string;
  montagem_valor: number;

  // Informações Adicionais
  informacoes_adicionais: string;

  // Análise Crítica
  criterio_dados_cliente: string;
  criterio_local_entrega: string;
  criterio_prazo: string;
  criterio_pagamento: string;
  criterio_observacoes: string;
  criterio_outros_requisitos: string;
  todos_criterios_atendidos: string;
  acao_necessaria: string;
}

const initialFormData: FormData = {
  vendedor_id: null,
  vendedor_email: '',
  regiao: '',
  cliente_id: null,
  cliente_cnpj: '',
  cliente_razao_social: '',
  pais: 'Brasil',
  estado: '',
  municipio: '',
  contato_cliente: '',
  prazo_entrega: '120',
  prazo_entrega_outro: '',
  data_visita: '',
  validade_proposta: 15,
  chance_negocio: 7,
  produto: 'TOMBADOR',

  // TOMBADOR
  tombador_tamanho: null,
  tombador_tipo: 'FIXO',
  tombador_comprimento_trilhos: null,
  tombador_angulo: '40',
  tombador_complemento_titulo: '',
  tombador_economizador: 'N/A',
  tombador_economizador_qtd: 1,
  tombador_economizador_valor: 0,
  tombador_calco_manutencao: 'SEM',
  tombador_calco_acionamento: 'MANUAL',
  tombador_calco_qtd: 1,
  tombador_calco_valor: 0,
  tombador_kit_descida: 'SEM',
  tombador_kit_descida_qtd: 1,
  tombador_kit_descida_valor: 0,
  tombador_mangueiras_hidraulicas: 7,
  tombador_cabos_eletricos: 1,
  tombador_voltagem: '380',
  tombador_frequencia: '60',
  tombador_travamento: 'SEM',
  tombador_travamento_qtd: 1,
  tombador_travamento_valor: 0,
  tombador_rampas: 'SEM',
  tombador_rampas_tipo: 'UMA FIXA',
  tombador_observacoes_rampas: '',
  tombador_enclausuramento: 'SEM',
  tombador_enclausuramento_qtd: 1,
  tombador_enclausuramento_valor: 0,
  tombador_botoeiras: 'COM FIO',
  tombador_botoeiras_fio_qtd: 15,
  tombador_moldura: 'SEM MOLDURA',
  tombador_grelhas: 'N/A',
  tombador_grelhas_qtd: 1,
  tombador_grelhas_valor: 0,
  tombador_varandas: 'N/A',
  tombador_varandas_qtd: 1,
  tombador_varandas_valor: 0,
  tombador_cilindros_qtd: 2,
  tombador_cilindros_tipo: 'INTERNOS',
  tombador_oleo: 'COM',
  tombador_oleo_valor: 0,
  tombador_outros_requisitos: '',
  tombador_guindaste: 'SEM',
  tombador_guindaste_qtd: 1,
  tombador_guindaste_valor: 0,

  // COLETOR
  coletor_tipo: 'FIXO',
  coletor_comprimento_trilhos: null,
  coletor_grau_rotacao: 180,
  coletor_retorno_grao: 'SEM RETORNO DE GRÃO',
  coletor_retorno_grao_qtd: 1,
  coletor_retorno_grao_valor: 0,
  coletor_tubo_diametro: '3 POLEGADAS',
  coletor_tubo_qtd: 1,
  coletor_tubo_valor: 0,
  coletor_motor_qtd: 'UM MOTOR DE 4,8 CV',
  coletor_voltagem: '220',
  coletor_frequencia: '60',
  coletor_platibanda: 'SEM PLATIBANDA',
  coletor_platibanda_qtd: 1,
  coletor_platibanda_valor: 0,
  coletor_cadeira_platibanda: 'SEM CADEIRA',
  coletor_cadeira_qtd: 1,
  coletor_cadeira_valor: 0,
  coletor_acionamento: 'ATRAVÉS DE ALAVANCA ELETRO HIDRÁULICA PROPORCIONAL',
  coletor_fio_controle_qtd: 15,
  coletor_contactores: 'SIEMENS',
  coletor_contactores_outro: '',
  coletor_distancia_hidraulica: 2,
  coletor_distancia_ciclone: 2,
  coletor_tipo_escada: 'MARINHEIRO',
  coletor_oleo: 'COM',
  coletor_oleo_valor: 0,
  coletor_outros_requisitos: '',

  // Comercial
  garantia_meses: 12,
  quantidade: 1,
  preco_equipamento: 0,
  forma_pagamento: '',
  frete_tipo: 'CIF',
  frete_qtd: 1,
  frete_valor: 0,
  deslocamentos_qtd: 1,
  diaria_valor: 2500,
  montagem: 'SEM MONTAGEM DO EQUIPAMENTO',
  montagem_valor: 0,

  informacoes_adicionais: '',

  criterio_dados_cliente: 'N/A',
  criterio_local_entrega: 'N/A',
  criterio_prazo: 'N/A',
  criterio_pagamento: 'N/A',
  criterio_observacoes: 'N/A',
  criterio_outros_requisitos: 'N/A',
  todos_criterios_atendidos: 'SIM',
  acao_necessaria: '',
};

// Constants
const REGIOES = ['SUL', 'SUDESTE', 'CENTRO-OESTE', 'NORDESTE', 'NORTE', 'MERCADO EXTERNO'];
const ESTADOS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO', 'NA'];
const PAISES = ['Argentina', 'Bolívia', 'Brasil', 'Chile', 'Colômbia', 'Costa Rica', 'Cuba', 'Equador', 'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicarágua', 'Panamá', 'Paraguai', 'Peru', 'República Dominicana', 'Uruguai', 'Venezuela'];
const TAMANHOS_TOMBADOR = [30, 26, 21, 18, 12, 11, 10];

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Section Component
function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
      >
        <span className="font-semibold text-gray-900 flex items-center gap-2">
          <span>{icon}</span> {title}
        </span>
        <svg className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 border-t">{children}</div>}
    </div>
  );
}

// Field Components
function SelectField({ label, value, onChange, options, required = false, disabled = false }: {
  label: string; value: string | number; onChange: (v: string) => void; options: { value: string | number; label: string }[]; required?: boolean; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', required = false, disabled = false, placeholder = '' }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; required?: boolean; disabled?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100" />
    </div>
  );
}

function RadioGroup({ label, value, onChange, options, required = false }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label} {required && <span className="text-red-500">*</span>}</label>
      <div className="flex flex-wrap gap-4">
        {options.map(o => (
          <label key={o.value} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} className="w-4 h-4 text-red-600 focus:ring-red-500" />
            <span className="text-sm">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
    </div>
  );
}

// Optional Item Component (COM/SEM with qty and value)
function OpcionalItem({ label, descricao, value, onValueChange, qtd, onQtdChange, valor, onValorChange, showQtdValor = true }: {
  label: string; descricao?: string; value: string; onValueChange: (v: string) => void; qtd?: number; onQtdChange?: (v: number) => void; valor?: number; onValorChange?: (v: number) => void; showQtdValor?: boolean
}) {
  const showFields = value === 'COM' && showQtdValor;
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{label}</p>
          {descricao && <p className="text-xs text-gray-500 mt-1">{descricao}</p>}
        </div>
        <div className="flex gap-2">
          {['COM', 'SEM', 'N/A'].map(opt => (
            <button key={opt} type="button" onClick={() => onValueChange(opt)}
              className={`px-3 py-1 text-sm rounded ${value === opt ? 'bg-red-600 text-white' : 'bg-white border hover:bg-gray-100'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {showFields && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {onQtdChange && (
            <div>
              <label className="text-xs text-gray-600">Quantidade</label>
              <input type="number" min="1" value={qtd} onChange={(e) => onQtdChange(parseInt(e.target.value) || 1)}
                className="w-full px-2 py-1 text-sm border rounded" />
            </div>
          )}
          {onValorChange && (
            <div>
              <label className="text-xs text-gray-600">Valor Unit. (R$)</label>
              <input type="number" min="0" step="100" value={valor} onChange={(e) => onValorChange(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border rounded" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NovaPropostaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [precosBase, setPrecosBase] = useState<PrecoBase[]>([]);
  const [opcionais, setOpcionais] = useState<Opcional[]>([]);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [precoCalculado, setPrecoCalculado] = useState({ base: 0, opcionais: 0, total: 0 });

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [clientesRes, vendedoresRes, precosRes, opcionaisRes] = await Promise.all([
          fetch('/api/comercial/clientes?limit=1000'),
          fetch('/api/comercial/vendedores?ativo=true'),
          fetch('/api/comercial/admin/precos?tipo=base&ativo=true'),
          fetch('/api/comercial/admin/precos?tipo=opcoes&ativo=true'),
        ]);

        if (clientesRes.ok) {
          const data = await clientesRes.json();
          setClientes(data.data || []);
        }
        if (vendedoresRes.ok) {
          const data = await vendedoresRes.json();
          setVendedores(data.data || []);
        }
        if (precosRes.ok) {
          const data = await precosRes.json();
          setPrecosBase(data.data || []);
        }
        if (opcionaisRes.ok) {
          const data = await opcionaisRes.json();
          setOpcionais(data.data || []);
        }

        // Set current user as vendedor
        const userData = localStorage.getItem('user_data');
        if (userData) {
          const user = JSON.parse(userData);
          setForm(prev => ({ ...prev, vendedor_id: user.id, vendedor_email: user.email || '' }));
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Update form field
  const updateForm = useCallback((field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // When cliente changes, fill cliente data
  useEffect(() => {
    if (form.cliente_id) {
      const cliente = clientes.find(c => c.id === form.cliente_id);
      if (cliente) {
        setForm(prev => ({
          ...prev,
          cliente_cnpj: cliente.cpf_cnpj || '',
          cliente_razao_social: cliente.razao_social || '',
          estado: cliente.estado || '',
          municipio: cliente.municipio || '',
          pais: cliente.pais || 'Brasil',
          regiao: cliente.regiao || '',
          contato_cliente: cliente.email || cliente.telefone || '',
        }));
      }
    }
  }, [form.cliente_id, clientes]);

  // Helper function to get opcional price by codigo pattern
  const getOpcionalPreco = useCallback((codigoPattern: string, tamanho?: number) => {
    // Try exact match first
    let opc = opcionais.find(o => o.codigo === codigoPattern);
    if (opc) return Number(opc.preco) || 0;

    // Try with tamanho suffix
    if (tamanho) {
      opc = opcionais.find(o => o.codigo === `${codigoPattern}_${tamanho}`);
      if (opc) return Number(opc.preco) || 0;
    }

    // Try partial match
    opc = opcionais.find(o => o.codigo.startsWith(codigoPattern));
    return Number(opc?.preco) || 0;
  }, [opcionais]);

  // Auto-fill optional prices when tombador_tamanho changes
  useEffect(() => {
    if (form.produto === 'TOMBADOR' && form.tombador_tamanho && opcionais.length > 0) {
      const tam = form.tombador_tamanho;

      // Get prices for each opcional based on tamanho
      const economizadorPreco = getOpcionalPreco('ECONOMIZADOR', tam) ||
        (tam >= 26 ? 39000 : tam >= 18 ? 20000 : 0);
      const calcoPreco = getOpcionalPreco('CALCO_MECANICO') || 5800;
      const kitDescidaPreco = getOpcionalPreco('KIT_DESCIDA') || 12000;
      const travamentoPreco = getOpcionalPreco('TRAVAMENTO_MOVEL') || 45000;
      const enclausuramentoPreco = getOpcionalPreco('ENCLAUSURAMENTO') || 8500;
      const grelhasPreco = getOpcionalPreco('GRELHA', tam) ||
        (tam === 30 ? 55000 : tam === 26 ? 42000 : tam === 21 ? 35000 : 0);
      const varandasPreco = getOpcionalPreco('VARANDA', tam) ||
        (tam === 30 ? 42000 : tam === 26 ? 35000 : tam === 21 ? 28000 : 0);
      const oleoPreco = getOpcionalPreco('OLEO', tam) ||
        (tam >= 26 ? 20000 : tam >= 18 ? 11000 : 5600);
      const guindastePreco = getOpcionalPreco('GUINDASTE') || 85000;

      setForm(prev => ({
        ...prev,
        tombador_economizador_valor: economizadorPreco,
        tombador_calco_valor: calcoPreco,
        tombador_kit_descida_valor: kitDescidaPreco,
        tombador_travamento_valor: travamentoPreco,
        tombador_enclausuramento_valor: enclausuramentoPreco,
        tombador_grelhas_valor: grelhasPreco,
        tombador_varandas_valor: varandasPreco,
        tombador_oleo_valor: oleoPreco,
        tombador_guindaste_valor: guindastePreco,
        // Auto-set economizador for 26/30m
        tombador_economizador: tam >= 26 ? 'COM' : prev.tombador_economizador,
        // Auto-set grelhas for 21-30m
        tombador_grelhas: tam >= 21 ? 'COM' : prev.tombador_grelhas,
        // Auto-set varandas for 26-30m
        tombador_varandas: tam >= 26 ? 'COM' : prev.tombador_varandas,
      }));
    }
  }, [form.produto, form.tombador_tamanho, opcionais, getOpcionalPreco]);

  // Auto-fill optional prices when coletor_grau_rotacao changes
  useEffect(() => {
    if (form.produto === 'COLETOR' && form.coletor_grau_rotacao && opcionais.length > 0) {
      const retornoGraoPreco = getOpcionalPreco('RETORNO_GRAO') || 18000;
      const platibandaPreco = getOpcionalPreco('PLATIBANDA') || 12000;
      const cadeiraPreco = getOpcionalPreco('CADEIRA_PLATIBANDA') || 8500;
      const tuboPreco = getOpcionalPreco('TUBO_4POL') || 5500;
      const oleoPreco = getOpcionalPreco('OLEO_COLETOR') || 1700;

      setForm(prev => ({
        ...prev,
        coletor_retorno_grao_valor: retornoGraoPreco,
        coletor_platibanda_valor: platibandaPreco,
        coletor_cadeira_valor: cadeiraPreco,
        coletor_tubo_valor: tuboPreco,
        coletor_oleo_valor: oleoPreco,
      }));
    }
  }, [form.produto, form.coletor_grau_rotacao, opcionais, getOpcionalPreco]);

  // Calculate price when product config changes
  useEffect(() => {
    let precoBase = 0;
    let precoOpcionais = 0;

    if (form.produto === 'TOMBADOR' && form.tombador_tamanho) {
      // Find base price - use Number() to ensure type consistency
      const preco = precosBase.find(p =>
        p.produto === 'TOMBADOR' &&
        Number(p.tamanho) === Number(form.tombador_tamanho) &&
        p.tipo === form.tombador_tipo
      );
      precoBase = Number(preco?.preco) || 0;

      // Debug log
      console.log('Tombador price lookup:', {
        tamanho: form.tombador_tamanho,
        tipo: form.tombador_tipo,
        found: preco,
        precoBase,
        allPrices: precosBase.filter(p => p.produto === 'TOMBADOR')
      });

      // Add opcionais values - use Number() to ensure correct arithmetic
      if (form.tombador_economizador === 'COM') precoOpcionais += Number(form.tombador_economizador_qtd) * Number(form.tombador_economizador_valor);
      if (form.tombador_calco_manutencao === 'COM') precoOpcionais += Number(form.tombador_calco_qtd) * Number(form.tombador_calco_valor);
      if (form.tombador_kit_descida === 'COM') precoOpcionais += Number(form.tombador_kit_descida_qtd) * Number(form.tombador_kit_descida_valor);
      if (form.tombador_travamento === 'COM') precoOpcionais += Number(form.tombador_travamento_qtd) * Number(form.tombador_travamento_valor);
      if (form.tombador_enclausuramento === 'COM') precoOpcionais += Number(form.tombador_enclausuramento_qtd) * Number(form.tombador_enclausuramento_valor);
      if (form.tombador_grelhas === 'COM') precoOpcionais += Number(form.tombador_grelhas_qtd) * Number(form.tombador_grelhas_valor);
      if (form.tombador_varandas === 'COM') precoOpcionais += Number(form.tombador_varandas_qtd) * Number(form.tombador_varandas_valor);
      if (form.tombador_oleo === 'COM') precoOpcionais += Number(form.tombador_oleo_valor);
      if (form.tombador_guindaste === 'COM') precoOpcionais += Number(form.tombador_guindaste_qtd) * Number(form.tombador_guindaste_valor);
    } else if (form.produto === 'COLETOR' && form.coletor_grau_rotacao) {
      // Find base price - use Number() to ensure type consistency
      const preco = precosBase.find(p =>
        p.produto === 'COLETOR' &&
        Number(p.tamanho) === Number(form.coletor_grau_rotacao) &&
        p.tipo === form.coletor_tipo
      );
      precoBase = Number(preco?.preco) || 0;

      // Debug log
      console.log('Coletor price lookup:', {
        grau: form.coletor_grau_rotacao,
        tipo: form.coletor_tipo,
        found: preco,
        precoBase,
        allPrices: precosBase.filter(p => p.produto === 'COLETOR')
      });

      // Add coletor opcionais - use Number() to ensure correct arithmetic
      if (form.coletor_retorno_grao === 'COM RETORNO DE GRÃO') precoOpcionais += Number(form.coletor_retorno_grao_qtd) * Number(form.coletor_retorno_grao_valor);
      if (form.coletor_tubo_diametro === '4 POLEGADAS') precoOpcionais += Number(form.coletor_tubo_qtd) * Number(form.coletor_tubo_valor);
      if (form.coletor_platibanda === 'COM PLATIBANDA') precoOpcionais += Number(form.coletor_platibanda_qtd) * Number(form.coletor_platibanda_valor);
      if (form.coletor_cadeira_platibanda === 'COM CADEIRA') precoOpcionais += Number(form.coletor_cadeira_qtd) * Number(form.coletor_cadeira_valor);
      if (form.coletor_oleo === 'COM') precoOpcionais += Number(form.coletor_oleo_valor);
    }

    // Add frete and montagem
    if (form.frete_tipo === 'CIF') precoOpcionais += Number(form.frete_qtd) * Number(form.frete_valor);
    if (form.montagem === 'COM MONTAGEM DO EQUIPAMENTO') precoOpcionais += Number(form.montagem_valor);

    const total = (precoBase + precoOpcionais) * Number(form.quantidade);
    setPrecoCalculado({ base: precoBase, opcionais: precoOpcionais, total });
  }, [form, precosBase]);

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.cliente_id) {
      alert('Selecione um cliente');
      return;
    }
    if (form.produto === 'TOMBADOR' && !form.tombador_tamanho) {
      alert('Selecione o tamanho do tombador');
      return;
    }
    if (form.produto === 'COLETOR' && !form.coletor_grau_rotacao) {
      alert('Selecione o grau de rotação do coletor');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        valor_equipamento: precoCalculado.base,
        valor_opcionais: precoCalculado.opcionais,
        valor_total: precoCalculado.total,
      };

      const res = await fetch('/api/comercial/propostas-comerciais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/comercial/propostas/${data.data.id}`);
      } else {
        alert(data.error || 'Erro ao criar proposta');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao criar proposta');
    } finally {
      setSubmitting(false);
    }
  };

  // Get available sizes for selected product/type
  const tamanhosDisponiveis = form.produto === 'TOMBADOR'
    ? precosBase.filter(p => p.produto === 'TOMBADOR' && p.tipo === form.tombador_tipo)
    : precosBase.filter(p => p.produto === 'COLETOR' && p.tipo === form.coletor_tipo);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/comercial" className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Nova Proposta Comercial</h1>
              <p className="text-sm text-gray-500">Preencha todos os campos do formulário</p>
            </div>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Informações Gerais */}
            <Section title="Informações Gerais" icon="📋" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <SelectField label="Vendedor/Representante" value={form.vendedor_id || ''} required
                  onChange={(v) => {
                    updateForm('vendedor_id', v ? parseInt(v) : null);
                    const vend = vendedores.find(x => x.id === parseInt(v));
                    if (vend) updateForm('vendedor_email', vend.email);
                  }}
                  options={vendedores.map(v => ({ value: v.id, label: v.nome }))} />
                <InputField label="E-mail do Vendedor" value={form.vendedor_email} onChange={(v) => updateForm('vendedor_email', v)} required />
                <SelectField label="Região" value={form.regiao} onChange={(v) => updateForm('regiao', v)} required
                  options={REGIOES.map(r => ({ value: r, label: r }))} />
                <SelectField label="Cliente" value={form.cliente_id || ''} required
                  onChange={(v) => updateForm('cliente_id', v ? parseInt(v) : null)}
                  options={clientes.map(c => ({ value: c.id, label: `${c.razao_social} ${c.nome_fantasia ? `(${c.nome_fantasia})` : ''}` }))} />
                <InputField label="CPF/CNPJ do Cliente" value={form.cliente_cnpj} onChange={(v) => updateForm('cliente_cnpj', v)} required disabled />
                <InputField label="Razão Social" value={form.cliente_razao_social} onChange={(v) => updateForm('cliente_razao_social', v)} disabled />
                <SelectField label="País" value={form.pais} onChange={(v) => updateForm('pais', v)} required
                  options={PAISES.map(p => ({ value: p, label: p }))} />
                <SelectField label="Estado" value={form.estado} onChange={(v) => updateForm('estado', v)} required
                  options={ESTADOS.map(e => ({ value: e, label: e }))} />
                <InputField label="Município" value={form.municipio} onChange={(v) => updateForm('municipio', v)} required />
                <InputField label="E-mail/Telefone/WhatsApp do Cliente" value={form.contato_cliente} onChange={(v) => updateForm('contato_cliente', v)} required />
                <SelectField label="Prazo de Entrega (dias)" value={form.prazo_entrega} onChange={(v) => updateForm('prazo_entrega', v)} required
                  options={[{ value: '120', label: '120 dias' }, { value: '150', label: '150 dias' }, { value: '180', label: '180 dias' }, { value: 'outro', label: 'Outro' }]} />
                {form.prazo_entrega === 'outro' && (
                  <InputField label="Outro Prazo" value={form.prazo_entrega_outro} onChange={(v) => updateForm('prazo_entrega_outro', v)} type="number" />
                )}
                <InputField label="Data da Visita ao Cliente" value={form.data_visita} onChange={(v) => updateForm('data_visita', v)} type="date" required />
                <InputField label="Validade da Proposta (dias)" value={form.validade_proposta} onChange={(v) => updateForm('validade_proposta', parseInt(v) || 15)} type="number" />
                <SelectField label="Chance do Negócio" value={form.chance_negocio} onChange={(v) => updateForm('chance_negocio', parseInt(v))} required
                  options={[{ value: 10, label: '10 - MUITO PROVÁVEL' }, { value: 7, label: '7 - PROVÁVEL' }, { value: 4, label: '4 - POUCO PROVÁVEL' }]} />
              </div>
            </Section>

            {/* Produto */}
            <Section title="Configuração do Produto" icon="🏭" defaultOpen={true}>
              <div className="mt-4 space-y-4">
                <RadioGroup label="Tipo de Produto" value={form.produto} required
                  onChange={(v) => updateForm('produto', v as 'TOMBADOR' | 'COLETOR')}
                  options={[{ value: 'TOMBADOR', label: 'TOMBADOR' }, { value: 'COLETOR', label: 'COLETOR' }]} />

                {form.produto === 'TOMBADOR' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900">Configuração TOMBADOR</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectField label="Tamanho do Tombador (metros)" value={form.tombador_tamanho || ''} required
                        onChange={(v) => updateForm('tombador_tamanho', v ? parseInt(v) : null)}
                        options={TAMANHOS_TOMBADOR.map(t => ({ value: t, label: `${t}m` }))} />
                      <RadioGroup label="Tipo" value={form.tombador_tipo}
                        onChange={(v) => updateForm('tombador_tipo', v)}
                        options={[{ value: 'FIXO', label: 'FIXO' }, { value: 'MOVEL', label: 'MÓVEL' }]} />
                      {form.tombador_tipo === 'MOVEL' && (
                        <InputField label="Comprimento dos Trilhos (m)" value={form.tombador_comprimento_trilhos || ''}
                          onChange={(v) => updateForm('tombador_comprimento_trilhos', v ? parseInt(v) : null)} type="number" />
                      )}
                      <SelectField label="Ângulo de Inclinação" value={form.tombador_angulo}
                        onChange={(v) => updateForm('tombador_angulo', v)}
                        options={[{ value: '40', label: '40°' }, { value: '35', label: '35°' }]} />
                      <div className="md:col-span-2">
                        <InputField label="Complemento ao Título do Produto" value={form.tombador_complemento_titulo}
                          onChange={(v) => updateForm('tombador_complemento_titulo', v)} placeholder="Ex: Para descarga de arroz, trigo..." />
                      </div>
                      <SelectField label="Voltagem dos Motores" value={form.tombador_voltagem}
                        onChange={(v) => updateForm('tombador_voltagem', v)}
                        options={[{ value: '220', label: '220V' }, { value: '380', label: '380V' }, { value: '440', label: '440V' }, { value: '660', label: '660V' }]} />
                      <SelectField label="Frequência dos Motores" value={form.tombador_frequencia}
                        onChange={(v) => updateForm('tombador_frequencia', v)}
                        options={[{ value: '60', label: '60 Hz' }, { value: '50', label: '50 Hz' }]} />
                      <InputField label="Mangueiras Hidráulicas (metros)" value={form.tombador_mangueiras_hidraulicas}
                        onChange={(v) => updateForm('tombador_mangueiras_hidraulicas', parseInt(v) || 7)} type="number" />
                      <InputField label="Rede Elétrica (metros)" value={form.tombador_cabos_eletricos}
                        onChange={(v) => updateForm('tombador_cabos_eletricos', parseInt(v) || 1)} type="number" />
                      <SelectField label="Cilindros Hidráulicos - Tipo" value={form.tombador_cilindros_tipo}
                        onChange={(v) => updateForm('tombador_cilindros_tipo', v)}
                        options={[{ value: 'INTERNOS', label: 'INTERNOS' }, { value: 'EXTERNOS', label: 'EXTERNOS' }]} />
                      <SelectField label="Botoeiras" value={form.tombador_botoeiras}
                        onChange={(v) => updateForm('tombador_botoeiras', v)}
                        options={[{ value: 'COM FIO', label: 'COM FIO' }, { value: 'SEM FIO', label: 'SEM FIO' }, { value: 'PEDESTAL', label: 'PEDESTAL' }]} />
                      {form.tombador_botoeiras === 'COM FIO' && (
                        <InputField label="Quantidade de Fio (metros)" value={form.tombador_botoeiras_fio_qtd}
                          onChange={(v) => updateForm('tombador_botoeiras_fio_qtd', parseInt(v) || 15)} type="number" />
                      )}
                      <SelectField label="Tipo de Moldura" value={form.tombador_moldura}
                        onChange={(v) => updateForm('tombador_moldura', v)}
                        options={[{ value: 'SEM MOLDURA', label: 'SEM MOLDURA' }, { value: 'COM MEIA MOLDURA', label: 'COM MEIA MOLDURA' }, { value: 'COM MOLDURA INTEIRA', label: 'COM MOLDURA INTEIRA' }]} />
                    </div>
                  </div>
                )}

                {form.produto === 'COLETOR' && (
                  <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900">Configuração COLETOR</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RadioGroup label="Tipo de Coletor" value={form.coletor_tipo}
                        onChange={(v) => updateForm('coletor_tipo', v)}
                        options={[{ value: 'FIXO', label: 'FIXO' }, { value: 'MOVEL', label: 'MÓVEL' }]} />
                      {form.coletor_tipo === 'MOVEL' && (
                        <InputField label="Comprimento dos Trilhos (m)" value={form.coletor_comprimento_trilhos || ''}
                          onChange={(v) => updateForm('coletor_comprimento_trilhos', v ? parseInt(v) : null)} type="number" />
                      )}
                      <SelectField label="Grau de Rotação" value={form.coletor_grau_rotacao || ''} required
                        onChange={(v) => updateForm('coletor_grau_rotacao', v ? parseInt(v) : null)}
                        options={[{ value: 180, label: '180°' }, { value: 270, label: '270°' }]} />
                      <SelectField label="Voltagem do Motor" value={form.coletor_voltagem}
                        onChange={(v) => updateForm('coletor_voltagem', v)}
                        options={[{ value: '220', label: '220V' }, { value: '380', label: '380V' }]} />
                      <SelectField label="Frequência do Motor" value={form.coletor_frequencia}
                        onChange={(v) => updateForm('coletor_frequencia', v)}
                        options={[{ value: '60', label: '60 Hz' }, { value: '50', label: '50 Hz' }]} />
                      <SelectField label="Diâmetro do Tubo" value={form.coletor_tubo_diametro}
                        onChange={(v) => updateForm('coletor_tubo_diametro', v)}
                        options={[{ value: '3 POLEGADAS', label: '3 POLEGADAS (Padrão)' }, { value: '4 POLEGADAS', label: '4 POLEGADAS (+1 motor)' }]} />
                      <SelectField label="Motor do Compressor" value={form.coletor_motor_qtd}
                        onChange={(v) => updateForm('coletor_motor_qtd', v)}
                        options={[{ value: 'UM MOTOR DE 4,8 CV', label: 'UM MOTOR DE 4,8 CV (Padrão)' }, { value: 'DOIS MOTORES DE 4,8 CV', label: 'DOIS MOTORES DE 4,8 CV' }]} />
                      <SelectField label="Tipo de Escada" value={form.coletor_tipo_escada}
                        onChange={(v) => updateForm('coletor_tipo_escada', v)}
                        options={[{ value: 'MARINHEIRO', label: 'MARINHEIRO (Padrão)' }, { value: 'RETA', label: 'RETA' }, { value: 'N/A', label: 'N/A' }]} />
                      <SelectField label="Marca dos Contactores" value={form.coletor_contactores}
                        onChange={(v) => updateForm('coletor_contactores', v)}
                        options={[{ value: 'SIEMENS', label: 'SIEMENS' }, { value: 'WEG', label: 'WEG' }, { value: 'OUTRA', label: 'Outra' }]} />
                      {form.coletor_contactores === 'OUTRA' && (
                        <InputField label="Qual marca?" value={form.coletor_contactores_outro}
                          onChange={(v) => updateForm('coletor_contactores_outro', v)} />
                      )}
                      <SelectField label="Acionamento e Comando Hidráulico" value={form.coletor_acionamento}
                        onChange={(v) => updateForm('coletor_acionamento', v)}
                        options={[
                          { value: 'ATRAVÉS DE ALAVANCA ELETRO HIDRÁULICA PROPORCIONAL', label: 'Alavanca Eletro Hidráulica Proporcional' },
                          { value: 'ATRAVÉS DE CONTROLE REMOTO SEM FIO', label: 'Controle Remoto Sem Fio' },
                          { value: 'ATRAVÉS DE CONTROLE REMOTO COM FIO', label: 'Controle Remoto Com Fio' }
                        ]} />
                      {form.coletor_acionamento === 'ATRAVÉS DE CONTROLE REMOTO COM FIO' && (
                        <InputField label="Quantidade de Fio (metros)" value={form.coletor_fio_controle_qtd}
                          onChange={(v) => updateForm('coletor_fio_controle_qtd', parseInt(v) || 15)} type="number" />
                      )}
                      <InputField label="Distância Hidráulica-Equipamento (m)" value={form.coletor_distancia_hidraulica}
                        onChange={(v) => updateForm('coletor_distancia_hidraulica', parseInt(v) || 2)} type="number" />
                      <InputField label="Distância Ciclone-Equipamento (m)" value={form.coletor_distancia_ciclone}
                        onChange={(v) => updateForm('coletor_distancia_ciclone', parseInt(v) || 2)} type="number" />
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Opcionais */}
            <Section title="Opcionais e Acessórios" icon="⚙️">
              <div className="mt-4 space-y-3">
                {form.produto === 'TOMBADOR' ? (
                  <>
                    <OpcionalItem label="Economizador de Energia"
                      descricao={form.tombador_tamanho && form.tombador_tamanho >= 26 ? 'OBRIGATÓRIO para 30 e 26m' : form.tombador_tamanho && form.tombador_tamanho >= 18 ? 'OPCIONAL para 21 e 18m' : 'NÃO POSSUI para 12, 11 e 10m'}
                      value={form.tombador_economizador} onValueChange={(v) => updateForm('tombador_economizador', v)}
                      qtd={form.tombador_economizador_qtd} onQtdChange={(v) => updateForm('tombador_economizador_qtd', v)}
                      valor={form.tombador_economizador_valor} onValorChange={(v) => updateForm('tombador_economizador_valor', v)} />
                    <OpcionalItem label="Calço de Manutenção" value={form.tombador_calco_manutencao}
                      onValueChange={(v) => updateForm('tombador_calco_manutencao', v)}
                      qtd={form.tombador_calco_qtd} onQtdChange={(v) => updateForm('tombador_calco_qtd', v)}
                      valor={form.tombador_calco_valor} onValorChange={(v) => updateForm('tombador_calco_valor', v)} />
                    <OpcionalItem label="Kit de Descida Rápida" value={form.tombador_kit_descida}
                      onValueChange={(v) => updateForm('tombador_kit_descida', v)}
                      qtd={form.tombador_kit_descida_qtd} onQtdChange={(v) => updateForm('tombador_kit_descida_qtd', v)}
                      valor={form.tombador_kit_descida_valor} onValorChange={(v) => updateForm('tombador_kit_descida_valor', v)} />
                    <OpcionalItem label="Travamento Auxiliar/Móvel" value={form.tombador_travamento}
                      onValueChange={(v) => updateForm('tombador_travamento', v)}
                      qtd={form.tombador_travamento_qtd} onQtdChange={(v) => updateForm('tombador_travamento_qtd', v)}
                      valor={form.tombador_travamento_valor} onValorChange={(v) => updateForm('tombador_travamento_valor', v)} />
                    <OpcionalItem label="Rampas" value={form.tombador_rampas}
                      onValueChange={(v) => updateForm('tombador_rampas', v)} showQtdValor={false} />
                    {form.tombador_rampas === 'COM' && (
                      <div className="ml-4">
                        <SelectField label="Quantidade de Rampas" value={form.tombador_rampas_tipo}
                          onChange={(v) => updateForm('tombador_rampas_tipo', v)}
                          options={[
                            { value: 'UMA FIXA', label: 'UMA FIXA' },
                            { value: 'UMA ARTICULADA', label: 'UMA ARTICULADA' },
                            { value: 'DUAS FIXAS', label: 'DUAS FIXAS' },
                            { value: 'DUAS ARTICULADAS', label: 'DUAS ARTICULADAS' },
                            { value: 'UMA FIXA NA ENTRADA E UMA ARTICULADA NA SAÍDA', label: 'UMA FIXA NA ENTRADA E UMA ARTICULADA NA SAÍDA' },
                            { value: 'UMA ARTICULADA NA ENTRADA E UMA FIXA NA SAÍDA', label: 'UMA ARTICULADA NA ENTRADA E UMA FIXA NA SAÍDA' }
                          ]} />
                      </div>
                    )}
                    <OpcionalItem label="Enclausuramento" value={form.tombador_enclausuramento}
                      onValueChange={(v) => updateForm('tombador_enclausuramento', v)}
                      qtd={form.tombador_enclausuramento_qtd} onQtdChange={(v) => updateForm('tombador_enclausuramento_qtd', v)}
                      valor={form.tombador_enclausuramento_valor} onValorChange={(v) => updateForm('tombador_enclausuramento_valor', v)} />
                    <OpcionalItem label="Grelhas/Assoalhos"
                      descricao={form.tombador_tamanho && form.tombador_tamanho >= 21 ? 'OBRIGATÓRIO para 30 a 21m' : form.tombador_tamanho === 18 ? 'OPCIONAL para 18m' : 'NÃO POSSUI para 12, 11 e 10m'}
                      value={form.tombador_grelhas} onValueChange={(v) => updateForm('tombador_grelhas', v)}
                      qtd={form.tombador_grelhas_qtd} onQtdChange={(v) => updateForm('tombador_grelhas_qtd', v)}
                      valor={form.tombador_grelhas_valor} onValorChange={(v) => updateForm('tombador_grelhas_valor', v)} />
                    <OpcionalItem label="Varandas Laterais"
                      descricao={form.tombador_tamanho && form.tombador_tamanho >= 26 ? 'OBRIGATÓRIO para 30 e 26m' : form.tombador_tamanho && form.tombador_tamanho >= 18 ? 'OPCIONAL para 21 e 18m' : 'NÃO POSSUI para 12, 11 e 10m'}
                      value={form.tombador_varandas} onValueChange={(v) => updateForm('tombador_varandas', v)}
                      qtd={form.tombador_varandas_qtd} onQtdChange={(v) => updateForm('tombador_varandas_qtd', v)}
                      valor={form.tombador_varandas_valor} onValorChange={(v) => updateForm('tombador_varandas_valor', v)} />
                    <OpcionalItem label="Óleo Hidráulico" value={form.tombador_oleo}
                      onValueChange={(v) => updateForm('tombador_oleo', v)}
                      valor={form.tombador_oleo_valor} onValorChange={(v) => updateForm('tombador_oleo_valor', v)} />
                    <OpcionalItem label="Guindaste (Descarregamento)" value={form.tombador_guindaste}
                      onValueChange={(v) => updateForm('tombador_guindaste', v)}
                      qtd={form.tombador_guindaste_qtd} onQtdChange={(v) => updateForm('tombador_guindaste_qtd', v)}
                      valor={form.tombador_guindaste_valor} onValorChange={(v) => updateForm('tombador_guindaste_valor', v)} />
                  </>
                ) : (
                  <>
                    <OpcionalItem label="Retorno do Grão para o Caminhão" value={form.coletor_retorno_grao}
                      onValueChange={(v) => updateForm('coletor_retorno_grao', v)}
                      qtd={form.coletor_retorno_grao_qtd} onQtdChange={(v) => updateForm('coletor_retorno_grao_qtd', v)}
                      valor={form.coletor_retorno_grao_valor} onValorChange={(v) => updateForm('coletor_retorno_grao_valor', v)} />
                    <OpcionalItem label="Platibanda" value={form.coletor_platibanda}
                      onValueChange={(v) => updateForm('coletor_platibanda', v)}
                      qtd={form.coletor_platibanda_qtd} onQtdChange={(v) => updateForm('coletor_platibanda_qtd', v)}
                      valor={form.coletor_platibanda_valor} onValorChange={(v) => updateForm('coletor_platibanda_valor', v)} />
                    <OpcionalItem label="Cadeira na Platibanda" value={form.coletor_cadeira_platibanda}
                      onValueChange={(v) => updateForm('coletor_cadeira_platibanda', v)}
                      qtd={form.coletor_cadeira_qtd} onQtdChange={(v) => updateForm('coletor_cadeira_qtd', v)}
                      valor={form.coletor_cadeira_valor} onValorChange={(v) => updateForm('coletor_cadeira_valor', v)} />
                    <OpcionalItem label="Óleo Hidráulico (85 litros HLP 86)" value={form.coletor_oleo}
                      onValueChange={(v) => updateForm('coletor_oleo', v)}
                      valor={form.coletor_oleo_valor} onValorChange={(v) => updateForm('coletor_oleo_valor', v)} />
                  </>
                )}
              </div>
            </Section>

            {/* Comercial */}
            <Section title="Informações Comerciais" icon="💰">
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField label="Tempo de Garantia" value={form.garantia_meses}
                    onChange={(v) => updateForm('garantia_meses', parseInt(v))}
                    options={[{ value: 6, label: '6 meses' }, { value: 12, label: '12 meses' }]} />
                  <InputField label="Quantidade de Equipamentos" value={form.quantidade}
                    onChange={(v) => updateForm('quantidade', parseInt(v) || 1)} type="number" />
                  <SelectField label="Tipo de Frete" value={form.frete_tipo}
                    onChange={(v) => updateForm('frete_tipo', v)}
                    options={[{ value: 'CIF', label: 'CIF (Pili paga o frete)' }, { value: 'FOB', label: 'FOB (Cliente retira)' }]} />
                  {form.frete_tipo === 'CIF' && (
                    <>
                      <InputField label="Quantidade de Fretes" value={form.frete_qtd}
                        onChange={(v) => updateForm('frete_qtd', parseInt(v) || 1)} type="number" />
                      <InputField label="Valor Unitário do Frete (R$)" value={form.frete_valor}
                        onChange={(v) => updateForm('frete_valor', parseFloat(v) || 0)} type="number" />
                    </>
                  )}
                  <InputField label="Deslocamentos Técnicos" value={form.deslocamentos_qtd}
                    onChange={(v) => updateForm('deslocamentos_qtd', parseInt(v) || 1)} type="number" />
                  <InputField label="Valor da Diária Técnica (R$)" value={form.diaria_valor}
                    onChange={(v) => updateForm('diaria_valor', parseFloat(v) || 2500)} type="number" />
                  {form.produto === 'COLETOR' && (
                    <>
                      <SelectField label="Montagem do Equipamento" value={form.montagem}
                        onChange={(v) => updateForm('montagem', v)}
                        options={[
                          { value: 'SEM MONTAGEM DO EQUIPAMENTO', label: 'SEM MONTAGEM' },
                          { value: 'COM MONTAGEM DO EQUIPAMENTO', label: 'COM MONTAGEM' }
                        ]} />
                      {form.montagem === 'COM MONTAGEM DO EQUIPAMENTO' && (
                        <InputField label="Preço da Montagem (R$)" value={form.montagem_valor}
                          onChange={(v) => updateForm('montagem_valor', parseFloat(v) || 0)} type="number" />
                      )}
                    </>
                  )}
                </div>
                <TextareaField label="Forma de Pagamento (Detalhes)" value={form.forma_pagamento}
                  onChange={(v) => updateForm('forma_pagamento', v)} rows={3}
                  placeholder="Ex: 30% entrada + 3x iguais no boleto" />
              </div>
            </Section>

            {/* Outros Requisitos */}
            <Section title="Outros Requisitos e Observações" icon="📝">
              <div className="mt-4">
                <TextareaField label={`Outros requisitos solicitados pelo cliente (${form.produto})`}
                  value={form.produto === 'TOMBADOR' ? form.tombador_outros_requisitos : form.coletor_outros_requisitos}
                  onChange={(v) => updateForm(form.produto === 'TOMBADOR' ? 'tombador_outros_requisitos' : 'coletor_outros_requisitos', v)}
                  rows={4} />
                <div className="mt-4">
                  <TextareaField label="Informações Adicionais" value={form.informacoes_adicionais}
                    onChange={(v) => updateForm('informacoes_adicionais', v)} rows={4}
                    placeholder="Descreva informações relevantes e outros detalhes que possam impactar a negociação" />
                </div>
              </div>
            </Section>
          </div>

          {/* Sidebar - Resumo */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-20">
              <h3 className="font-semibold text-gray-900 mb-4">Resumo da Proposta</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Produto:</span>
                  <span className="font-medium">{form.produto}</span>
                </div>
                {form.produto === 'TOMBADOR' && form.tombador_tamanho && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tamanho:</span>
                      <span className="font-medium">{form.tombador_tamanho}m {form.tombador_tipo}</span>
                    </div>
                    {(() => {
                      const precoInfo = precosBase.find(p =>
                        p.produto === 'TOMBADOR' &&
                        Number(p.tamanho) === Number(form.tombador_tamanho) &&
                        p.tipo === form.tombador_tipo
                      );
                      return precoInfo?.descricao && (
                        <div className="text-xs text-gray-500 italic">{precoInfo.descricao}</div>
                      );
                    })()}
                  </>
                )}
                {form.produto === 'COLETOR' && form.coletor_grau_rotacao && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rotação:</span>
                      <span className="font-medium">{form.coletor_grau_rotacao}° {form.coletor_tipo}</span>
                    </div>
                    {(() => {
                      const precoInfo = precosBase.find(p =>
                        p.produto === 'COLETOR' &&
                        Number(p.tamanho) === Number(form.coletor_grau_rotacao) &&
                        p.tipo === form.coletor_tipo
                      );
                      return precoInfo?.descricao && (
                        <div className="text-xs text-gray-500 italic">{precoInfo.descricao}</div>
                      );
                    })()}
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantidade:</span>
                  <span className="font-medium">{form.quantidade}</span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Preço Base:</span>
                    <span className="font-medium">{formatarMoeda(precoCalculado.base)}</span>
                  </div>

                  {/* Show selected optionals with values */}
                  {form.produto === 'TOMBADOR' && (
                    <div className="mt-2 space-y-1 text-xs">
                      {form.tombador_economizador === 'COM' && (
                        <div className="flex justify-between text-green-700">
                          <span>Economizador ({form.tombador_economizador_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.tombador_economizador_qtd) * Number(form.tombador_economizador_valor))}</span>
                        </div>
                      )}
                      {form.tombador_calco_manutencao === 'COM' && (
                        <div className="flex justify-between text-green-700">
                          <span>Calço Manutenção ({form.tombador_calco_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.tombador_calco_qtd) * Number(form.tombador_calco_valor))}</span>
                        </div>
                      )}
                      {form.tombador_kit_descida === 'COM' && (
                        <div className="flex justify-between text-green-700">
                          <span>Kit Descida ({form.tombador_kit_descida_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.tombador_kit_descida_qtd) * Number(form.tombador_kit_descida_valor))}</span>
                        </div>
                      )}
                      {form.tombador_travamento === 'COM' && (
                        <div className="flex justify-between text-green-700">
                          <span>Travamento ({form.tombador_travamento_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.tombador_travamento_qtd) * Number(form.tombador_travamento_valor))}</span>
                        </div>
                      )}
                      {form.tombador_enclausuramento === 'COM' && (
                        <div className="flex justify-between text-green-700">
                          <span>Enclausuramento ({form.tombador_enclausuramento_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.tombador_enclausuramento_qtd) * Number(form.tombador_enclausuramento_valor))}</span>
                        </div>
                      )}
                      {form.tombador_grelhas === 'COM' && (
                        <div className="flex justify-between text-green-700">
                          <span>Grelhas ({form.tombador_grelhas_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.tombador_grelhas_qtd) * Number(form.tombador_grelhas_valor))}</span>
                        </div>
                      )}
                      {form.tombador_varandas === 'COM' && (
                        <div className="flex justify-between text-green-700">
                          <span>Varandas ({form.tombador_varandas_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.tombador_varandas_qtd) * Number(form.tombador_varandas_valor))}</span>
                        </div>
                      )}
                      {form.tombador_oleo === 'COM' && (
                        <div className="flex justify-between text-green-700">
                          <span>Óleo Hidráulico</span>
                          <span>+ {formatarMoeda(Number(form.tombador_oleo_valor))}</span>
                        </div>
                      )}
                      {form.tombador_guindaste === 'COM' && (
                        <div className="flex justify-between text-green-700">
                          <span>Guindaste ({form.tombador_guindaste_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.tombador_guindaste_qtd) * Number(form.tombador_guindaste_valor))}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {form.produto === 'COLETOR' && (
                    <div className="mt-2 space-y-1 text-xs">
                      {form.coletor_retorno_grao === 'COM RETORNO DE GRÃO' && (
                        <div className="flex justify-between text-green-700">
                          <span>Retorno Grão ({form.coletor_retorno_grao_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.coletor_retorno_grao_qtd) * Number(form.coletor_retorno_grao_valor))}</span>
                        </div>
                      )}
                      {form.coletor_tubo_diametro === '4 POLEGADAS' && (
                        <div className="flex justify-between text-green-700">
                          <span>Tubo 4 pol ({form.coletor_tubo_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.coletor_tubo_qtd) * Number(form.coletor_tubo_valor))}</span>
                        </div>
                      )}
                      {form.coletor_platibanda === 'COM PLATIBANDA' && (
                        <div className="flex justify-between text-green-700">
                          <span>Platibanda ({form.coletor_platibanda_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.coletor_platibanda_qtd) * Number(form.coletor_platibanda_valor))}</span>
                        </div>
                      )}
                      {form.coletor_cadeira_platibanda === 'COM CADEIRA' && (
                        <div className="flex justify-between text-green-700">
                          <span>Cadeira ({form.coletor_cadeira_qtd}x)</span>
                          <span>+ {formatarMoeda(Number(form.coletor_cadeira_qtd) * Number(form.coletor_cadeira_valor))}</span>
                        </div>
                      )}
                      {form.coletor_oleo === 'COM' && (
                        <div className="flex justify-between text-green-700">
                          <span>Óleo Hidráulico</span>
                          <span>+ {formatarMoeda(Number(form.coletor_oleo_valor))}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Frete and Montagem */}
                  {form.frete_tipo === 'CIF' && Number(form.frete_valor) > 0 && (
                    <div className="flex justify-between text-xs text-blue-700 mt-1">
                      <span>Frete CIF ({form.frete_qtd}x)</span>
                      <span>+ {formatarMoeda(Number(form.frete_qtd) * Number(form.frete_valor))}</span>
                    </div>
                  )}
                  {form.montagem === 'COM MONTAGEM DO EQUIPAMENTO' && Number(form.montagem_valor) > 0 && (
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>Montagem</span>
                      <span>+ {formatarMoeda(Number(form.montagem_valor))}</span>
                    </div>
                  )}

                  {precoCalculado.opcionais > 0 && (
                    <div className="flex justify-between text-green-600 mt-2 pt-2 border-t border-dashed">
                      <span className="font-medium">Total Opcionais:</span>
                      <span className="font-medium">+ {formatarMoeda(precoCalculado.opcionais)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-bold text-red-600">{formatarMoeda(precoCalculado.total)}</span>
                  </div>
                  {form.quantidade > 1 && (
                    <div className="text-xs text-gray-500 text-right">
                      ({form.quantidade} unidades)
                    </div>
                  )}
                </div>

                {form.cliente_id && (
                  <div className="border-t pt-3 text-xs text-gray-500">
                    <p><strong>Cliente:</strong> {form.cliente_razao_social}</p>
                    <p><strong>Local:</strong> {form.municipio}/{form.estado}</p>
                  </div>
                )}
              </div>

              <button type="submit" disabled={submitting}
                className="w-full mt-6 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50">
                {submitting ? 'Criando Proposta...' : 'Criar Proposta'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
