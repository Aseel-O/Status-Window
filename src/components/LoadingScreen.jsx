export default function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-app">
      <div className="w-8 h-8 rounded-sm border-2 border-gold/30 border-t-gold animate-spin" />
      <p className="eyebrow">{label}</p>
    </div>
  )
}
