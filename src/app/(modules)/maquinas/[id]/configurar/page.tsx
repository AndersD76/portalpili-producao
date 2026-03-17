'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Machine, Shift } from '@/types/machines';

export default function MachineConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authenticated } = useAuth();
  const router = useRouter();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [machineCode, setMachineCode] = useState('');
  const [location, setLocation] = useState('');
  const [camIp, setCamIp] = useState('');
  const [camPort, setCamPort] = useState(80);
  const [operatorName, setOperatorName] = useState('');
  const [operatorShift, setOperatorShift] = useState<Shift>('A');
  const [shiftStart, setShiftStart] = useState('07:00');
  const [shiftEnd, setShiftEnd] = useState('15:20');
  const [dailyTarget, setDailyTarget] = useState(400);

  useEffect(() => {
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchMachine();
  }, [authenticated, router, id]);

  const fetchMachine = async () => {
    try {
      const res = await fetch(`/api/machines/${id}`);
      const json = await res.json();
      if (json.success) {
        const m: Machine = json.data;
        setMachine(m);
        setName(m.name);
        setMachineCode(m.machine_code);
        setLocation(m.location || '');
        setCamIp(m.cam_ip || '');
        setCamPort(m.cam_port || 80);
        setOperatorName(m.operator_name || '');
        setOperatorShift(m.operator_shift || 'A');
        setShiftStart(m.shift_start || '07:00');
        setShiftEnd(m.shift_end || '15:20');
        setDailyTarget(m.daily_target || 400);
      }
    } catch (err) {
      console.error('Erro ao carregar máquina:', err);
      toast.error('Erro ao carregar dados da máquina');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/machines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, machine_code: machineCode, location, cam_ip: camIp,
          cam_port: camPort, operator_name: operatorName,
          operator_shift: operatorShift, shift_start: shiftStart,
          shift_end: shiftEnd, daily_target: dailyTarget,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Máquina atualizada com sucesso');
        router.push(`/maquinas/${id}`);
      } else {
        toast.error(json.error || 'Erro ao salvar');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!confirm('Gerar nova API key? A chave anterior será invalidada.')) return;

    try {
      const res = await fetch(`/api/machines/${id}/regenerate-key`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setMachine(prev => prev ? { ...prev, api_key: json.data.api_key } : prev);
        toast.success('Nova API key gerada');
      }
    } catch {
      toast.error('Erro ao gerar nova API key');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">
        Máquina não encontrada
      </div>
    );
  }

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors";
  const labelClass = "block text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/maquinas/${id}`} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold">Configurar Máquina</h1>
            <p className="text-xs text-gray-500">{machine.name} — {machine.machine_code}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Info */}
          <section className="bg-gray-900 rounded-lg border border-gray-800 p-5">
            <h2 className="text-sm font-semibold mb-4">Informações Básicas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome da Máquina</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Código</label>
                <input type="text" value={machineCode} onChange={e => setMachineCode(e.target.value)} className={inputClass} required />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Localização</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} className={inputClass} placeholder="Ex: Linha A - Erechim" />
              </div>
            </div>
          </section>

          {/* Camera */}
          <section className="bg-gray-900 rounded-lg border border-gray-800 p-5">
            <h2 className="text-sm font-semibold mb-4">Câmera ESP32-CAM</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>IP da Câmera</label>
                <input type="text" value={camIp} onChange={e => setCamIp(e.target.value)} className={inputClass} placeholder="192.168.1.101" />
              </div>
              <div>
                <label className={labelClass}>Porta</label>
                <input type="number" value={camPort} onChange={e => setCamPort(parseInt(e.target.value) || 80)} className={inputClass} />
              </div>
            </div>
          </section>

          {/* Operator & Shift */}
          <section className="bg-gray-900 rounded-lg border border-gray-800 p-5">
            <h2 className="text-sm font-semibold mb-4">Operador & Turno</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome do Operador</label>
                <input type="text" value={operatorName} onChange={e => setOperatorName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Turno</label>
                <select value={operatorShift} onChange={e => setOperatorShift(e.target.value as Shift)} className={inputClass}>
                  <option value="A">Turno A</option>
                  <option value="B">Turno B</option>
                  <option value="C">Turno C</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Início do Turno</label>
                <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fim do Turno</label>
                <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Meta Diária (peças)</label>
                <input type="number" value={dailyTarget} onChange={e => setDailyTarget(parseInt(e.target.value) || 0)} className={inputClass} min={0} />
              </div>
            </div>
          </section>

          {/* API Key */}
          <section className="bg-gray-900 rounded-lg border border-gray-800 p-5">
            <h2 className="text-sm font-semibold mb-4">Autenticação ESP32</h2>
            <div>
              <label className={labelClass}>API Key (X-Pili-Key)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={machine.api_key}
                  readOnly
                  className={`${inputClass} font-mono text-xs bg-gray-850`}
                />
                <button
                  type="button"
                  onClick={handleGenerateApiKey}
                  className="shrink-0 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Gerar Nova
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Use esta chave no header X-Pili-Key das requisições do ESP32
              </p>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href={`/maquinas/${id}`}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
