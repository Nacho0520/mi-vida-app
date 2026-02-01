import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Bug, Wand2, X, Image as ImageIcon } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabaseClient'

const MotionDiv = motion.div

export default function FeedbackSection({ user }) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState('bug')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const renderPortal = (node) => {
    if (typeof document === 'undefined') return null
    return createPortal(node, document.body)
  }

  const handleSubmit = async () => {
    if (!message.trim() || !user?.id) return
    setStatus('loading')
    setError('')
    try {
      let screenshotUrl = null
      if (screenshotFile) {
        if (screenshotFile.size > 3 * 1024 * 1024) {
          setError(t('feedback_screenshot_too_large'))
          setStatus('idle')
          return
        }
        const ext = screenshotFile.name.split('.').pop() || 'png'
        const path = `feedback/${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('feedback')
          .upload(path, screenshotFile, { upsert: true, contentType: screenshotFile.type })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('feedback').getPublicUrl(path)
        screenshotUrl = data?.publicUrl || null
      }

      const payload = {
        user_id: user.id,
        type,
        title: title.trim() || null,
        message: message.trim(),
        screenshot_url: screenshotUrl
      }
      const { error: insertError } = await supabase.from('feedback_reports').insert([payload])
      if (insertError) throw insertError

      try {
        const { data: admins } = await supabase.rpc('get_admin_user_ids')
        const adminIds = (admins || []).map((row) => row.user_id).filter(Boolean)
        if (adminIds.length > 0) {
          await supabase.functions.invoke('push-notification', {
            body: {
              title: t('feedback_push_title'),
              body: t('feedback_push_body'),
              url: 'https://mi-vida-app.vercel.app',
              user_ids: adminIds
            }
          })
        }
      } catch {
        // ignore admin notification errors
      }

      setStatus('success')
      setTitle('')
      setMessage('')
      setScreenshotFile(null)
      setScreenshotPreview('')
      setTimeout(() => {
        setIsOpen(false)
        setStatus('idle')
      }, 1200)
    } catch (err) {
      setError(err?.message || t('feedback_error'))
      setStatus('idle')
    }
  }

  return (
    <div className="bg-neutral-900/40 p-5 sm:p-6 radius-card border border-white/5 shadow-apple-soft relative overflow-hidden">
      <div className="absolute -top-20 left-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">{t('feedback_title')}</h2>
          <p className="text-[11px] text-neutral-500">{t('feedback_desc')}</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="text-[11px] text-neutral-200 bg-white/10 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/15 transition"
        >
          {t('feedback_action')}
        </button>
      </div>

      {isOpen &&
        renderPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md bg-neutral-900/95 radius-card p-5 shadow-apple border border-white/5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{t('feedback_modal_title')}</h3>
                  <p className="text-[11px] text-neutral-500">{t('feedback_modal_subtitle')}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 rounded-full border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {error && (
                <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setType('bug')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs border ${
                    type === 'bug'
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 text-neutral-300 border-white/10'
                  }`}
                >
                  <Bug size={14} /> {t('feedback_type_bug')}
                </button>
                <button
                  onClick={() => setType('idea')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs border ${
                    type === 'idea'
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 text-neutral-300 border-white/10'
                  }`}
                >
                  <Wand2 size={14} /> {t('feedback_type_idea')}
                </button>
              </div>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('feedback_title_placeholder')}
                className="w-full rounded-xl bg-neutral-950 border border-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 mb-3"
              />
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t('feedback_message_placeholder')}
                className="w-full h-28 rounded-xl bg-neutral-950 border border-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
              />
              <div className="mt-3 flex items-center gap-3">
                <label className="flex items-center gap-2 text-[11px] text-neutral-300 bg-white/5 border border-white/10 px-3 py-2 rounded-full cursor-pointer">
                  <ImageIcon size={14} />
                  {t('feedback_attach')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      setScreenshotFile(file)
                      setScreenshotPreview(URL.createObjectURL(file))
                    }}
                  />
                </label>
                {screenshotPreview && (
                  <div className="h-10 w-10 rounded-xl overflow-hidden border border-white/10">
                    <img src={screenshotPreview} alt="preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-neutral-300 px-3 py-2 rounded-full border border-white/10"
                >
                  {t('feedback_cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={status === 'loading'}
                  className="text-xs text-black bg-white px-4 py-2 rounded-full font-semibold disabled:opacity-60"
                >
                  {status === 'success' ? t('feedback_sent') : t('feedback_submit')}
                </button>
              </div>
            </MotionDiv>
          </div>
        )}
    </div>
  )
}
