'use client';

import FormularioDocumentos from './FormularioDocumentos';

interface FormularioObraCivilProps {
  numeroOpd: string;
  opd?: string;
  atividadeId?: number;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function FormularioObraCivil({
  numeroOpd,
  opd,
  atividadeId,
  onSubmit,
  onCancel,
}: FormularioObraCivilProps) {
  return (
    <FormularioDocumentos
      titulo="Documentos da Obra Civil"
      subtitulo="Adicione os documentos relacionados à definição da obra civil (projetos, plantas, memorial de cálculo, etc.)"
      cor="blue"
      numeroOpd={numeroOpd || opd || ''}
      atividadeId={atividadeId}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
