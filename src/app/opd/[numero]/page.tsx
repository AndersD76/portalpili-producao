'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OPDRedirect({ params }: { params: Promise<{ numero: string }> }) {
  const router = useRouter();
  const { numero } = use(params);

  useEffect(() => {
    // Redirecionar para a página nova de produção
    router.replace(`/producao/opd/${numero}`);
  }, [numero, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">Redirecionando...</p>
      </div>
    </div>
  );
}
