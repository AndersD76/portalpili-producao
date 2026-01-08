'use client';

import FormularioDocumentos from './FormularioDocumentos';

interface FormularioEngenhariaMecanicaProps {
  numeroOpd: string;
  opd?: string;
  atividadeId?: number;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function FormularioEngenhariaMecanica({
  numeroOpd,
  opd,
  atividadeId,
  onSubmit,
  onCancel,
}: FormularioEngenhariaMecanicaProps) {
  return (
    <FormularioDocumentos
      titulo="Documentos de Engenharia Mecânica"
      subtitulo="Adicione os documentos da engenharia mecânica (projetos mecânicos, desenhos técnicos, especificações, etc.)"
      cor="green"
      numeroOpd={numeroOpd || opd || ''}
      atividadeId={atividadeId}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
