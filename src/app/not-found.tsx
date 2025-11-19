import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Página não encontrada</h2>
      <Link
        href="/login"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0070f3',
          color: 'white',
          borderRadius: '0.5rem',
          textDecoration: 'none'
        }}
      >
        Voltar para o login
      </Link>
    </div>
  );
}
