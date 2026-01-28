import { Wrench } from 'lucide-react'

export default function MaintenanceScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 px-6 text-center">
      <div className="h-24 w-24 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border border-yellow-500/20">
        <Wrench className="h-12 w-12 text-yellow-500" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">En Mantenimiento</h1>
      <p className="text-neutral-400 max-w-sm">
        Estamos aplicando mejoras importantes en la aplicación. Gracias por su espera.
      </p>
      <div className="mt-8 text-xs text-neutral-600 font-mono">
        Error Code: 503_SERVICE_UNAVAILABLE
      </div>
    </div>
  )
}