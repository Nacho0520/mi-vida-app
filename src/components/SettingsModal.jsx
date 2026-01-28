import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { X } from 'lucide-react'
import NotificationManager from './NotificationManager'

export default function SettingsModal({ isOpen, onClose, user }) {
  // BLINDAJE 1: Safari puede fallar si intentamos usar user.user_metadata inmediatamente
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  if (!isOpen) return null

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const updates = {}
    // Solo actualizar si hay datos para evitar errores de red en móvil
    if (fullName.trim()) updates.data = { full_name: fullName }
    if (password) updates.password = password

    const { error } = await supabase.auth.updateUser(updates)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: '¡Perfil actualizado!' })
      if (password) setMessage({ type: 'success', text: 'Contraseña cambiada. Vuelve a iniciar sesión.' })
      setTimeout(() => {
        onClose()
        window.location.reload()
      }, 1500)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-neutral-800 rounded-2xl p-6 shadow-xl border border-neutral-700 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Ajustes de Perfil</h2>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-900/30 text-red-300' : 'bg-emerald-900/30 text-emerald-300'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Nombre visible</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Nueva contraseña (opcional)</label>
            <input
              type="password"
              placeholder="Deja vacío para no cambiar"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* --- BLINDAJE PARA IPHONE (SAFARI) --- */}
          <div className="pt-2 border-t border-neutral-700 mt-4">
            <p className="text-xs text-neutral-400 mb-2">Permisos del Sistema</p>
            {/* Solo cargamos el manager si existe el ID del usuario para evitar el error 500 en Safari */}
            {user?.id ? (
              <NotificationManager userId={user.id} />
            ) : (
              <p className="text-xs text-neutral-500 italic">Cargando permisos...</p>
            )}
          </div>
          {/* ------------------------------------- */}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}