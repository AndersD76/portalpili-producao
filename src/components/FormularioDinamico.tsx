'use client';

import { TipoFormulario } from '@/types/atividade';
import FormularioPreparacao from './formularios/FormularioPreparacao';
import FormularioDesembarque from './formularios/FormularioDesembarque';
import FormularioLiberacaoEmbarque from './formularios/FormularioLiberacaoEmbarque';
import FormularioEntrega from './formularios/FormularioEntrega';

interface FormularioDinamicoProps {
  tipo: TipoFormulario;
  numeroOPD: string;
  atividadeId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FormularioDinamico({
  tipo,
  numeroOPD,
  atividadeId,
  onSuccess,
  onCancel
}: FormularioDinamicoProps) {
  switch (tipo) {
    case 'PREPARACAO':
      return (
        <FormularioPreparacao
          numeroOPD={numeroOPD}
          atividadeId={atividadeId}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

    case 'DESEMBARQUE_PRE_INSTALACAO':
      return (
        <FormularioDesembarque
          numeroOPD={numeroOPD}
          atividadeId={atividadeId}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

    case 'LIBERACAO_EMBARQUE':
      return (
        <FormularioLiberacaoEmbarque
          numeroOPD={numeroOPD}
          atividadeId={atividadeId}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

    case 'ENTREGA':
      return (
        <FormularioEntrega
          numeroOPD={numeroOPD}
          atividadeId={atividadeId}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

    default:
      return (
        <div className="text-center py-8">
          <p className="text-red-600">Tipo de formulário não reconhecido: {tipo}</p>
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      );
  }
}
