import type { NextPageContext } from 'next'

function ErrorPage({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 700, color: '#9ca3af', margin: 0 }}>
          {statusCode || 'Error'}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.125rem', marginTop: '0.5rem' }}>
          {statusCode === 404 ? 'Page not found' : 'An error occurred'}
        </p>
        <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: '#334155', color: '#fff', borderRadius: '0.375rem', textDecoration: 'none' }}>
          Back to Home
        </a>
      </div>
    </div>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404
  return { statusCode }
}

export default ErrorPage
