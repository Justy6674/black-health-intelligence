export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-deep-black text-white">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-silver-300">404</h1>
        <p className="text-silver-400 text-lg">Page not found</p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-3 bg-slate-blue text-white rounded hover:bg-slate-blue/80 transition-colors"
        >
          Back to Home
        </a>
      </div>
    </div>
  )
}
