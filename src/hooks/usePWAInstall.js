import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detectar si ya está instalada como PWA
    const standaloneMedia = window.matchMedia('(display-mode: standalone)')
    const checkInstalled = () =>
      setIsInstalled(standaloneMedia.matches || navigator.standalone === true)

    checkInstalled()
    standaloneMedia.addEventListener('change', checkInstalled)

    // Detectar iOS Safari (no soporta BeforeInstallPromptEvent)
    const ua = navigator.userAgent
    const isIOSDevice = /iphone|ipad|ipod/i.test(ua)
    const isInStandaloneMode = navigator.standalone === true
    setIsIOS(isIOSDevice && !isInStandaloneMode)

    // Android / Chrome — capturar el prompt nativo
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Detectar instalación completada
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    })

    return () => {
      standaloneMedia.removeEventListener('change', checkInstalled)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const triggerInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
  }

  return { installPrompt, isInstalled, isIOS, triggerInstall }
}
