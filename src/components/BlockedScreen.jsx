import { Ban } from 'lucide-react'

export default function BlockedScreen({ title, message }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 px-6 text-center">
      <div className="h-24 w-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
        <Ban className="h-12 w-12 text-red-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">{title || 'Acceso bloqueado'}</h1>
      <p className="text-neutral-400 max-w-sm">
        {message || 'Tu cuenta está bloqueada temporalmente. Contacta con soporte si crees que es un error.'}
      </p>
    </div>
  )
}
