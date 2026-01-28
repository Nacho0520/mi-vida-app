import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false) // Toggle entre Login y Registro
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('') // Estado para el nombre
  const [errorMsg, setErrorMsg] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    let error

    if (isSignUp) {
      // LOGICA DE REGISTRO (+ Nombre)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName, // Aquí guardamos el nombre en Supabase
          },
        },
      })
      error = signUpError
      if (!error) {
        // Opcional: Avisar que revise el correo si tienes confirmación activada
        // alert('¡Registro exitoso! Revisa tu correo si es necesario confirmar.')
      }
    } else {
      // LOGICA DE LOGIN
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      error = signInError
    }

    if (error) {
      setErrorMsg(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-neutral-800 p-6 shadow-xl border border-neutral-700">
        <h1 className="mb-2 text-center text-2xl font-semibold text-white">
          {isSignUp ? 'Crear Cuenta' : 'Bienvenido'}
        </h1>
        <p className="mb-6 text-center text-sm text-neutral-400">
          {isSignUp ? 'Empieza a organizar tu vida' : 'Inicia sesión para continuar'}
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-900/30 p-3 text-center text-sm text-red-400 border border-red-900">
            {errorMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleAuth}>
          {/* Campo Nombre (Solo en Registro) */}
          {isSignUp && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-200">
                Tu Nombre
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Ej. Paco"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-200">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-200">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-200 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Cargando...' : isSignUp ? 'Registrarse' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-400">
            {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setErrorMsg(null)
              }}
              className="ml-2 font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}