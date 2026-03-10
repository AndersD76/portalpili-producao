'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES, PAYMENT_METHODS, SERVICE_TYPES, FUEL_TYPES, EXPENSE_LIMITS } from '@/lib/servicos/constants';
import { ConfidenceLevel } from '@/lib/servicos/types';

interface Vehicle { id: number; plate: string; model: string; description: string }
interface ClienteResult {
  id: number;
  razao_social: string;
  nome_fantasia?: string;
  municipio?: string;
  estado?: string;
}

type PageStatus = 'capture' | 'analyzing' | 'review' | 'submitting' | 'success';

const analyzeMessages = [
  'Identificando estabelecimento...',
  'Lendo o valor...',
  'Verificando a data...',
  'Quase pronto...',
];

function ConfidenceBadge({ level }: { level?: ConfidenceLevel | null }) {
  if (!level) return null;
  const config = {
    alta:  { icon: '✓', cls: 'text-green-600 bg-green-50 border-green-300' },
    media: { icon: '⚠', cls: 'text-amber-600 bg-amber-50 border-amber-300' },
    baixa: { icon: '?', cls: 'text-red-600 bg-red-50 border-red-300' },
  };
  const c = config[level];
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border ${c.cls}`}>
      {c.icon} {level === 'alta' ? 'IA' : level === 'media' ? 'Verificar' : 'Manual'}
    </span>
  );
}

function fieldBorderClass(level?: ConfidenceLevel | null): string {
  if (!level) return 'border-gray-300';
  if (level === 'alta') return 'border-green-300 bg-green-50/30';
  if (level === 'media') return 'border-amber-300 bg-amber-50/30';
  return 'border-red-300 bg-red-50/30';
}

export default function NovaDespesaPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<PageStatus>('capture');
  const [analyzeMsg, setAnalyzeMsg] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [aiRaw, setAiRaw] = useState<unknown>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [location, setLocation] = useState('');
  const [nfNumber, setNfNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [serviceTypeCustom, setServiceTypeCustom] = useState('');
  const [osvNumber, setOsvNumber] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleKm, setVehicleKm] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Cliente atendido - autocomplete from system clients
  const [clienteAtendidoSearch, setClienteAtendidoSearch] = useState('');
  const [clienteAtendidoId, setClienteAtendidoId] = useState<number | null>(null);
  const [clienteAtendidoNome, setClienteAtendidoNome] = useState('');
  const [clienteAtendidoCidade, setClienteAtendidoCidade] = useState('');
  const [clienteResults, setClienteResults] = useState<ClienteResult[]>([]);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [searchingClientes, setSearchingClientes] = useState(false);
  const clienteDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Confidence levels from AI
  const [confiancas, setConfiancas] = useState<Record<string, ConfidenceLevel>>({});

  // Lookups
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Auth code validation
  const [authStatus, setAuthStatus] = useState<{ valid: boolean; message: string } | null>(null);
  const authDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Load lookup data
  useEffect(() => {
    fetch('/api/servicos/despesas/filtros')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setVehicles(res.data.vehicles || []);
        }
      })
      .catch(() => {});
  }, []);

  // Analyze progress messages
  useEffect(() => {
    if (status !== 'analyzing') return;
    const interval = setInterval(() => {
      setAnalyzeMsg(prev => (prev + 1) % analyzeMessages.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [status]);

  // Client search with debounce
  const searchClientes = useCallback((term: string) => {
    if (clienteDebounceRef.current) clearTimeout(clienteDebounceRef.current);
    if (term.length < 2) {
      setClienteResults([]);
      setShowClienteDropdown(false);
      return;
    }
    clienteDebounceRef.current = setTimeout(async () => {
      setSearchingClientes(true);
      try {
        const res = await fetch(`/api/servicos/buscar-clientes?search=${encodeURIComponent(term)}&limit=8`);
        const data = await res.json();
        if (data.success) {
          setClienteResults(data.data || []);
          setShowClienteDropdown(true);
        }
      } catch {
        setClienteResults([]);
      } finally {
        setSearchingClientes(false);
      }
    }, 300);
  }, []);

  // Auth code validation with debounce
  useEffect(() => {
    if (authDebounceRef.current) clearTimeout(authDebounceRef.current);
    if (authCode.length !== 8) {
      setAuthStatus(null);
      return;
    }
    authDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/servicos/autorizacoes/validar-codigo?code=${authCode}`);
        const data = await res.json();
        if (data.valido) {
          setAuthStatus({ valid: true, message: `Autorizado por ${data.manager_name}` });
        } else {
          setAuthStatus({ valid: false, message: 'Código inválido ou já utilizado' });
        }
      } catch {
        setAuthStatus({ valid: false, message: 'Erro ao validar código' });
      }
    }, 500);
  }, [authCode]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageCapture = async (file: File) => {
    setError(null);
    setStatus('analyzing');
    setAnalyzeMsg(0);

    setPreviewUrl(URL.createObjectURL(file));

    try {
      const base64 = await fileToBase64(file);
      setImageBase64(base64);

      const res = await fetch('/api/servicos/despesas/analisar-comprovante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagem_base64: base64, mime_type: file.type || 'image/jpeg' }),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error || 'Não foi possível analisar o comprovante');
        setStatus('review');
        return;
      }

      const dados = result.dados;
      setAiRaw(result.ai_raw);

      if (dados.cliente_nome) setClientName(dados.cliente_nome);
      if (dados.valor) setAmount(String(dados.valor));
      if (dados.categoria) {
        // Map Hospedagem -> Pernoite
        const cat = dados.categoria === 'Hospedagem' ? 'Pernoite' : dados.categoria;
        setCategory(cat);
      }
      if (dados.data) {
        const parts = dados.data.split('/');
        if (parts.length === 3) {
          setExpenseDate(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        }
      }
      if (dados.localizacao) setLocation(dados.localizacao);
      if (dados.numero_nf) setNfNumber(dados.numero_nf);
      if (dados.forma_pagamento) setPaymentMethod(dados.forma_pagamento);
      if (dados.combustivel_litros) setFuelLiters(String(dados.combustivel_litros));
      if (dados.combustivel_tipo) setFuelType(dados.combustivel_tipo);

      setConfiancas(dados.confiancas || {});
      setStatus('review');
    } catch (err) {
      console.error('Error analyzing receipt:', err);
      setError('Erro ao processar a imagem. Preencha os campos manualmente.');
      setStatus('review');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageCapture(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleImageCapture(file);
  };

  const selectCliente = (c: ClienteResult) => {
    const nome = c.nome_fantasia || c.razao_social;
    const cidadeUf = c.municipio ? (c.estado ? `${c.municipio} - ${c.estado}` : c.municipio) : '';
    const displayName = cidadeUf ? `${nome} - ${cidadeUf}` : nome;

    setClienteAtendidoId(c.id);
    setClienteAtendidoNome(nome);
    setClienteAtendidoSearch(displayName);
    setClienteAtendidoCidade(cidadeUf);
    // Preencher localidade com cidade/estado do cliente
    if (cidadeUf && !location) setLocation(cidadeUf);
    setShowClienteDropdown(false);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate required fields
    if (!category) { setError('Selecione a categoria'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Informe o valor'); return; }
    if (!expenseDate) { setError('Informe a data'); return; }

    // Check expense limits
    const limite = EXPENSE_LIMITS[category];
    if (limite && parseFloat(amount) > limite) {
      setError(`Valor R$${amount} excede o limite de R$${limite} para ${category}`);
      return;
    }

    // OSV obrigatório apenas para Assistência e Montagem
    if (['Assistência', 'Montagem'].includes(serviceType) && !osvNumber) {
      setError('Informe o número da OSV'); return;
    }

    // Category-specific validation
    if (category === 'Combustível') {
      if (!vehicleId) { setError('Selecione o veículo'); return; }
      if (!vehicleKm) { setError('Informe o KM atual'); return; }
    }
    if (['Peças', 'Outros'].includes(category)) {
      if (!authCode || authCode.length !== 8) { setError('Informe o código de autorização (8 caracteres)'); return; }
      if (!itemDescription) { setError('Descreva o item/serviço'); return; }
    }

    setStatus('submitting');

    try {
      // Upload receipt image first
      let receiptImageUrl: string | null = null;
      if (imageBase64) {
        try {
          // Convert base64 data URI to blob
          const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
          const mimeMatch = imageBase64.match(/data:([^;]+);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const byteChars = atob(base64Data);
          const byteArray = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteArray[i] = byteChars.charCodeAt(i);
          }
          const blob = new Blob([byteArray], { type: mime });
          const formData = new FormData();
          formData.append('file', blob, `comprovante_${Date.now()}.jpg`);
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          if (uploadData.success) {
            receiptImageUrl = uploadData.url;
          }
        } catch (uploadErr) {
          console.error('Erro no upload da imagem:', uploadErr);
          // Continua sem imagem
        }
      }

      // Usar cliente atendido ou nome do estabelecimento
      const finalClientName = clienteAtendidoNome || clienteAtendidoSearch || clientName || null;
      const finalLocation = location || clienteAtendidoCidade || null;

      const payload = {
        receipt_image_url: receiptImageUrl,
        ai_raw_response: aiRaw,
        ai_confidence: confiancas,
        technician_name: user?.nome || 'Desconhecido',
        client_name: finalClientName,
        location: finalLocation,
        category,
        expense_date: expenseDate || null,
        vehicle_id: vehicleId || null,
        vehicle_km: vehicleKm || null,
        fuel_liters: fuelLiters || null,
        fuel_type: fuelType || null,
        service_type: serviceType || null,
        service_type_custom: serviceTypeCustom || null,
        auth_code: authCode || null,
        item_description: itemDescription || null,
        amount: parseFloat(amount),
        payment_method: paymentMethod || null,
        osv_number: osvNumber || null,
        nf_number: nfNumber || null,
        notes: notes || null,
      };

      const res = await fetch('/api/servicos/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        setCreatedId(result.data.id);
        setStatus('success');
      } else {
        setError(result.error || 'Erro ao registrar despesa');
        setStatus('review');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Erro ao enviar. Tente novamente.');
      setStatus('review');
    }
  };

  const resetForm = () => {
    setStatus('capture');
    setPreviewUrl(null);
    setImageBase64(null);
    setAiRaw(null);
    setCreatedId(null);
    setError(null);
    setClientName('');
    setAmount('');
    setCategory('');
    setExpenseDate('');
    setLocation('');
    setNfNumber('');
    setPaymentMethod('');
    setServiceType('');
    setServiceTypeCustom('');
    setClienteAtendidoSearch('');
    setClienteAtendidoId(null);
    setClienteAtendidoNome('');
    setClienteAtendidoCidade('');
    setClienteResults([]);
    setOsvNumber('');
    setVehicleId('');
    setVehicleKm('');
    setFuelLiters('');
    setFuelType('');
    setAuthCode('');
    setItemDescription('');
    setNotes('');
    setConfiancas({});
    setAuthStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Count AI-filled fields
  const aiFilledCount = Object.values(confiancas).filter(v => v === 'alta' || v === 'media').length;

  const showVehicleSection = category === 'Combustível';
  const showAuthSection = ['Peças', 'Outros'].includes(category);

  // ==================== RENDER ====================

  // STATE: Success
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Despesa registrada!</h2>
          <p className="text-gray-500 text-sm mb-1">ID: #{createdId}</p>
          <p className="text-gray-400 text-xs mb-6">Os dados serão validados pela administração.</p>
          <div className="flex gap-3">
            <button
              onClick={resetForm}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Nova Despesa
            </button>
            <Link
              href="/servicos"
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
            >
              Voltar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // STATE: Capture
  if (status === 'capture') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-red-700 text-white px-4 py-4 flex items-center gap-3">
          <Link href="/servicos" className="p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-bold text-lg">Nova Despesa</h1>
        </div>

        <div className="max-w-lg mx-auto px-4 py-8">
          <div
            className="bg-white rounded-2xl border-2 border-dashed border-red-300 p-8 text-center cursor-pointer hover:border-red-500 hover:bg-red-50/50 transition-all"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="animate-pulse">
              <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <p className="text-gray-600 font-medium mb-2">Fotografe o comprovante</p>

            <button
              type="button"
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors mb-3"
              onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              ABRIR CÂMERA
            </button>

            <p className="text-gray-400 text-sm">ou arraste/selecione uma imagem</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="mt-4 bg-red-50 rounded-lg p-3 flex gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">
              Certifique-se que o valor e o nome do local estão visíveis na foto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STATE: Analyzing
  if (status === 'analyzing') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-red-700 text-white px-4 py-4 flex items-center gap-3">
          <button onClick={resetForm} className="p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-bold text-lg">Analisando...</h1>
        </div>

        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          {previewUrl && (
            <div className="relative rounded-xl overflow-hidden mb-6 mx-auto max-w-[280px]">
              <img src={previewUrl} alt="Comprovante" className="w-full opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {analyzeMessages.map((msg, i) => (
              <div
                key={msg}
                className={`flex items-center gap-2 justify-center transition-opacity duration-300 ${
                  i <= analyzeMsg ? 'opacity-100' : 'opacity-30'
                }`}
              >
                {i < analyzeMsg ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i === analyzeMsg ? (
                  <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-5 h-5" />
                )}
                <span className={`text-sm ${i <= analyzeMsg ? 'text-gray-700' : 'text-gray-400'}`}>
                  {msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // STATE: Review (and submitting)
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-red-700 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={resetForm} className="p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="font-bold text-lg">Nova Despesa</h1>
          <p className="text-red-200 text-xs">{user?.nome || 'Carregando...'}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Preview thumbnail */}
        {previewUrl && (
          <div className="flex items-center gap-3 bg-white rounded-lg p-3">
            <img src={previewUrl} alt="Comprovante" className="w-16 h-16 rounded-lg object-cover" />
            <div>
              <span className="text-green-600 font-medium text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Capturado
              </span>
              {aiFilledCount > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {aiFilledCount} campos preenchidos pela IA
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* === Receipt Data Section === */}
        <div className="bg-white rounded-xl p-4 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Dados do Comprovante
          </h3>

          {/* Estabelecimento */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Estabelecimento</label>
              <ConfidenceBadge level={confiancas.estabelecimento} />
            </div>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Nome do local"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${fieldBorderClass(confiancas.estabelecimento)}`}
            />
          </div>

          {/* Valor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Valor (R$) *</label>
              <ConfidenceBadge level={confiancas.valor_total} />
            </div>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0,00"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${fieldBorderClass(confiancas.valor_total)}`}
            />
            {category && EXPENSE_LIMITS[category] && (
              <p className="text-xs text-gray-400 mt-1">
                Limite: R${EXPENSE_LIMITS[category]} para {category}
              </p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Categoria *</label>
              <ConfidenceBadge level={confiancas.categoria_sugerida} />
            </div>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${fieldBorderClass(confiancas.categoria_sugerida)}`}
            >
              <option value="">Selecione...</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Data *</label>
              <ConfidenceBadge level={confiancas.data} />
            </div>
            <input
              type="date"
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${fieldBorderClass(confiancas.data)}`}
            />
          </div>

          {/* Localidade */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Localidade</label>
              <ConfidenceBadge level={confiancas.cidade} />
            </div>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Cidade - UF"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${fieldBorderClass(confiancas.cidade)}`}
            />
          </div>

          {/* NF */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">NF / Cupom Fiscal</label>
              <ConfidenceBadge level={confiancas.numero_nf} />
            </div>
            <input
              type="text"
              value={nfNumber}
              onChange={e => setNfNumber(e.target.value)}
              placeholder="Número da NF"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${fieldBorderClass(confiancas.numero_nf)}`}
            />
          </div>

          {/* Forma de pagamento */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Como pagou</label>
              <ConfidenceBadge level={confiancas.forma_pagamento} />
            </div>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${fieldBorderClass(confiancas.forma_pagamento)}`}
            >
              <option value="">Selecione...</option>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* === Service Data Section === */}
        <div className="bg-white rounded-xl p-4 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Dados do Serviço
          </h3>

          {/* Tipo de Serviço */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de Serviço</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map(s => (
                <label
                  key={s}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                    serviceType === s
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="serviceType"
                    value={s}
                    checked={serviceType === s}
                    onChange={e => setServiceType(e.target.value)}
                    className="sr-only"
                  />
                  {s}
                </label>
              ))}
            </div>
            {serviceType === 'Outro' && (
              <input
                type="text"
                value={serviceTypeCustom}
                onChange={e => setServiceTypeCustom(e.target.value)}
                placeholder="Descreva o tipo de serviço"
                className="w-full mt-2 px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
              />
            )}
          </div>

          {/* Número da OSV */}
          {serviceType && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Número da OSV {['Assistência', 'Montagem'].includes(serviceType) ? '*' : ''}
              </label>
              <input
                type="text"
                value={osvNumber}
                onChange={e => setOsvNumber(e.target.value)}
                placeholder="OSV-XXXX"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
              />
            </div>
          )}

          {/* Cliente Atendido - Autocomplete */}
          <div className="relative">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Cliente Atendido</label>
            <input
              type="text"
              value={clienteAtendidoSearch}
              onChange={e => {
                const val = e.target.value;
                setClienteAtendidoSearch(val);
                setClienteAtendidoId(null);
                setClienteAtendidoNome('');
                setClienteAtendidoCidade('');
                searchClientes(val);
              }}
              onFocus={() => {
                if (clienteResults.length > 0) setShowClienteDropdown(true);
              }}
              placeholder="Buscar cliente do sistema..."
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                clienteAtendidoId ? 'border-green-400 bg-green-50' : 'border-gray-300'
              }`}
            />
            {searchingClientes && (
              <div className="absolute right-3 top-9">
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {clienteAtendidoId && clienteAtendidoCidade && (
              <p className="text-xs text-green-600 mt-1">
                {clienteAtendidoCidade}
              </p>
            )}

            {/* Dropdown de resultados */}
            {showClienteDropdown && clienteResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                {clienteResults.map(c => {
                  const nome = c.nome_fantasia || c.razao_social;
                  const cidadeUf = c.municipio ? (c.estado ? `${c.municipio} - ${c.estado}` : c.municipio) : '';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCliente(c)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 text-sm"
                    >
                      <div className="font-medium text-gray-900 truncate">
                        {nome}{cidadeUf ? ` - ${cidadeUf}` : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {showClienteDropdown && clienteResults.length === 0 && clienteAtendidoSearch.length >= 2 && !searchingClientes && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 p-3 text-center text-sm text-gray-500">
                Nenhum cliente encontrado.
                <br />
                <span className="text-xs text-gray-400">O nome digitado será usado como novo registro.</span>
              </div>
            )}
          </div>
        </div>

        {/* === Vehicle Section (Combustível only) === */}
        {showVehicleSection && (
          <div className="bg-white rounded-xl p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Combustível
            </h3>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Veículo *</label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
              >
                <option value="">Selecione o veículo...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.description}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">KM Atual *</label>
              <input
                type="number"
                value={vehicleKm}
                onChange={e => setVehicleKm(e.target.value)}
                placeholder="Ex: 87432"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Litros</label>
                <input
                  type="number"
                  step="0.01"
                  value={fuelLiters}
                  onChange={e => setFuelLiters(e.target.value)}
                  placeholder="Ex: 45.5"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</label>
                <select
                  value={fuelType}
                  onChange={e => setFuelType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="">Selecione...</option>
                  {FUEL_TYPES.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* === Authorization Section (Peças/Outros only) === */}
        {showAuthSection && (
          <div className="bg-white rounded-xl p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Autorização Necessária
            </h3>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Código de Autorização *
              </label>
              <input
                type="text"
                value={authCode}
                onChange={e => setAuthCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="8 caracteres"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm font-mono tracking-wider ${
                  authStatus?.valid ? 'border-green-400 bg-green-50' :
                  authStatus && !authStatus.valid ? 'border-red-400 bg-red-50' :
                  'border-gray-300'
                }`}
              />
              {authStatus && (
                <p className={`text-xs mt-1 ${authStatus.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {authStatus.valid ? '✓' : '✗'} {authStatus.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Descrição do Item/Serviço *
              </label>
              <textarea
                value={itemDescription}
                onChange={e => setItemDescription(e.target.value)}
                rows={2}
                placeholder="Descreva o que foi comprado/contratado"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm resize-none"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Observações</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Alguma observação adicional?"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm resize-none"
          />
        </div>
      </div>

      {/* Fixed bottom submit button */}
      <div className="fixed bottom-14 sm:bottom-0 left-0 right-0 bg-white border-t p-4 z-10">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmit}
            disabled={status === 'submitting'}
            className={`w-full py-3.5 rounded-lg font-bold text-lg transition-colors ${
              status === 'submitting'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
            }`}
          >
            {status === 'submitting' ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </span>
            ) : (
              'CONFIRMAR DESPESA'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
