'use client';

import { AssistenteIA } from '@/components/comercial';

export default function ComercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AssistenteIA
        sugestoes={[
          'Quem sao meus clientes?',
          'Resumo do pipeline',
          'Oportunidades em risco',
        ]}
      />
    </>
  );
}
