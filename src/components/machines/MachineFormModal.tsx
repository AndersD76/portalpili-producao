'use client';

import { useState, useEffect } from 'react';
import type { MachineWithKpis, Shift } from '@/types/machines';

interface MachineFormModalProps {
  open: boolean;
  machine?: MachineWithKpis | null; // null = creating new
  onClose: () => void;
  onSaved: () => void;
}

export default function MachineFormModal({ open, machine, onClose, onSaved }: MachineFormModalProps) {
  const isEdit = !!machine;

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (machine) {
      setName(machine.name);
      setMachineCode(machine.machine_code);
      setLocation(machine.location || '');
      setCamIp(machine.cam_ip || '');
      setCamPort(machine.cam_port || 80);
      setOperatorName(machine.operator_name || '');
      setOperatorShift(machine.operator_shift || 'A');
      setShiftStart(machine.shift_start || '07:00');
      setShiftEnd(machine.shift_end || '15:20');
      setDailyTarget(machine.daily_target || 400);
    } else {
      setName('');
      setMachineCode('');
      setLocation('');
      setCamIp('');
      setCamPort(80);
      setOperatorName('');
      setOperatorShift('A');
      setShiftStart('07:00');
      setShiftEnd('15:20');
      setDailyTarget(400);
    }
    setError('');
  }, [machine, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !machineCode.trim()) {
      setError('Nome e código são obrigatórios');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        machine_code: machineCode.trim(),
        location: location.trim() || null,
        cam_ip: camIp.trim() || null,
        cam_port: camPort,
        operator_name: operatorName.trim() || null,
        operator_shift: operatorShift,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        daily_target: dailyTarget,
      };

      const url = isEdit ? `/api/machines/${machine.id}` : '/api/machines';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        onSaved();
        onClose();
      } else {
        setError(json.error || 'Erro ao salvar');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputClass = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-colors";
  const labelClass = "block text-xs text-gray-500 font-medium uppercase tracking-wider mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 rounded-t-xl flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? 'Editar Máquina' : 'Nova Máquina'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nome *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Ex: Tombador 1" required />
            </div>
            <div>
              <label className={labelClass}>Código *</label>
              <input type="text" value={machineCode} onChange={e => setMachineCode(e.target.value)} className={inputClass} placeholder="Ex: TBD-01" required />
            </div>
          </div>

          <div>
            <label className={labelClass}>Localização</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} className={inputClass} placeholder="Ex: Linha A - Erechim" />
          </div>

          {/* Camera */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Câmera ESP32-CAM</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>IP da Câmera</label>
                <input type="text" value={camIp} onChange={e => setCamIp(e.target.value)} className={inputClass} placeholder="192.168.1.101" />
              </div>
              <div>
                <label className={labelClass}>Porta</label>
                <input type="number" value={camPort} onChange={e => setCamPort(parseInt(e.target.value) || 80)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Operator & Shift */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Operador & Turno</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Operador</label>
                <input type="text" value={operatorName} onChange={e => setOperatorName(e.target.value)} className={inputClass} placeholder="Nome do operador" />
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
                <label className={labelClass}>Início</label>
                <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fim</label>
                <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Target */}
          <div className="border-t border-gray-100 pt-4">
            <div className="w-1/2">
              <label className={labelClass}>Meta Diária (peças)</label>
              <input type="number" value={dailyTarget} onChange={e => setDailyTarget(parseInt(e.target.value) || 0)} className={inputClass} min={0} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Máquina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
