'use client';

import FormularioDocumentos from './FormularioDocumentos';

interface FormularioEngenhariaEletricaHidraulicaProps {
  numeroOpd: string;
  opd?: string;
  atividadeId?: number;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function FormularioEngenhariaEletricaHidraulica({
  numeroOpd,
  opd,
  atividadeId,
  onSubmit,
  onCancel,
}: FormularioEngenhariaEletricaHidraulicaProps) {
  return (
    <FormularioDocumentos
      titulo="Documentos de Engenharia Elétrica/Hidráulica"
      subtitulo="Adicione os documentos da engenharia elétrica e hidráulica (diagramas elétricos, esquemas hidráulicos, especificações, etc.)"
      cor="orange"
      numeroOpd={numeroOpd || opd || ''}
      atividadeId={atividadeId}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
