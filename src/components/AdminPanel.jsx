import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ShieldAlert, RefreshCw, Megaphone, CheckCircle, Activity, Save, ChevronLeft, Users, Trash2, Globe, Bell, UserX, UserCheck, ListChecks, LineChart, Wrench, Mail } from 'lucide-react'

export default function AdminPanel({ onClose, version }) {
  const [maintenance, setMaintenance] = useState(false)
  const [appVersion, setAppVersion] = useState(version || '1.0.0')
  const [bannerTextES, setBannerTextES] = useState('')
  const [bannerTextEN, setBannerTextEN] = useState('')
  const [stats, setStats] = useState({ habits: 0, logs: 0, users: 0 })
  const [users, setUsers] = useState([])
  const [habitStats, setHabitStats] = useState([])
  const [appMetrics, setAppMetrics] = useState(null)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [whitelist, setWhitelist] = useState([])
  const [whitelistInput, setWhitelistInput] = useState('')
  const [notifyNow, setNotifyNow] = useState({ title: '', body: '', language: 'es', min_version: '', max_version: '', url: '' })
  const [notifySchedule, setNotifySchedule] = useState({ title: '', body: '', language: 'es', send_at: '', url: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [openSection, setOpenSection] = useState('maintenance')

  useEffect(() => { fetchAdminData() }, [])

  const fetchAdminData = async () => {
    try {
      const { data: settings } = await supabase.from('app_settings').select('*')
      if (settings) {
        const m = settings.find(s => s.key === 'maintenance_mode')
        const v = settings.find(s => s.key === 'app_version')
        if (m) setMaintenance(m.value === 'true' || m.value === true)
        if (v) setAppVersion(v.value)
      }

      const { data: announcement } = await supabase.from('announcements').select('message').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single()
      if (announcement) {
        try {
          const parsed = JSON.parse(announcement.message)
          if (parsed.es && parsed.en) {
            setBannerTextES(parsed.es)
            setBannerTextEN(parsed.en)
          } else {
            setBannerTextES(announcement.message)
          }
        } catch {
          setBannerTextES(announcement.message)
        }
      }

      const { data: rpcStats } = await supabase.rpc('get_admin_stats')
      if (rpcStats && rpcStats[0]) {
        setStats({ users: rpcStats[0].total_users || 0, habits: rpcStats[0].total_habits || 0, logs: rpcStats[0].total_logs || 0 })
      }

      const { data: usersData } = await supabase.rpc('get_admin_users')
      if (usersData) setUsers(usersData)

      const { data: habitData } = await supabase.rpc('get_admin_habit_stats')
      if (habitData) setHabitStats(habitData)

      const { data: metricsData } = await supabase.rpc('get_admin_app_metrics')
      if (metricsData && metricsData[0]) setAppMetrics(metricsData[0])

      const { data: whitelistData } = await supabase.from('maintenance_whitelist').select('email').order('email', { ascending: true })
      if (whitelistData) setWhitelist(whitelistData.map(w => w.email))

      const { data: textSettings } = await supabase.from('app_settings_text').select('*').eq('key', 'maintenance_message').single()
      if (textSettings?.value) setMaintenanceMessage(textSettings.value)
    } catch (error) {
      console.error('Error crítico:', error)
    }
  }

  const handleUpdateSettings = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const updates = [
        supabase.from('app_settings').update({ value: maintenance.toString() }).eq('key', 'maintenance_mode'),
        supabase.from('app_settings').update({ value: appVersion }).eq('key', 'app_version')
      ]
      await supabase.from('announcements').update({ is_active: false }).neq('id', 0)
      if (bannerTextES.trim().length > 0) {
        const finalMessage = JSON.stringify({
          es: bannerTextES,
          en: bannerTextEN || bannerTextES
        })
        updates.push(supabase.from('announcements').insert([{ message: finalMessage, is_active: true }]))
      }
      await Promise.all(updates)
      setMessage({ type: 'success', text: 'Sincronización global completada.' })
      setTimeout(() => setMessage(null), 3000)
    } catch {
      setMessage({ type: 'error', text: 'Error en la sincronización' })
    } finally { setLoading(false) }
  }

  const clearAnnouncement = () => {
    setBannerTextES('')
    setBannerTextEN('')
  }

  const toggleBlockUser = async (userId, blocked) => {
    await supabase.rpc('set_user_blocked', { p_user_id: userId, p_blocked: blocked })
    fetchAdminData()
  }

  const deleteUserData = async (userId) => {
    if (!confirm('¿Eliminar datos del usuario?')) return
    await supabase.rpc('delete_user_data', { p_user_id: userId })
    fetchAdminData()
  }

  const deleteUser = async (userId) => {
    if (!confirm('¿Eliminar usuario y todos sus datos?')) return
    await supabase.functions.invoke('admin-users', { body: { action: 'delete_user', user_id: userId } })
    fetchAdminData()
  }

  const saveMaintenanceMessage = async () => {
    await supabase.from('app_settings_text').upsert({ key: 'maintenance_message', value: maintenanceMessage })
    setMessage({ type: 'success', text: 'Mensaje de mantenimiento guardado.' })
    setTimeout(() => setMessage(null), 3000)
  }

  const addWhitelistEmail = async () => {
    if (!whitelistInput.trim()) return
    await supabase.from('maintenance_whitelist').insert({ email: whitelistInput.trim() })
    setWhitelistInput('')
    fetchAdminData()
  }

  const removeWhitelistEmail = async (email) => {
    await supabase.from('maintenance_whitelist').delete().eq('email', email)
    fetchAdminData()
  }

  const sendNotificationNow = async () => {
    if (!notifyNow.title.trim() || !notifyNow.body.trim()) return
    await supabase.functions.invoke('push-notification', { body: notifyNow })
    setMessage({ type: 'success', text: 'Notificación enviada.' })
    setTimeout(() => setMessage(null), 3000)
  }

  const scheduleNotification = async () => {
    if (!notifySchedule.title.trim() || !notifySchedule.body.trim() || !notifySchedule.send_at) return
    await supabase.from('scheduled_notifications').insert({
      title: notifySchedule.title,
      body: notifySchedule.body,
      language: notifySchedule.language,
      send_at: notifySchedule.send_at,
      url: notifySchedule.url || null
    })
    setMessage({ type: 'success', text: 'Notificación programada.' })
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6 pb-20 overflow-y-auto font-sans">
      <header className="flex justify-between items-center mb-10">
        <button onClick={onClose} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-all active:scale-95">
          <ChevronLeft size={24} /> <span className="font-medium text-sm">Escritorio</span>
        </button>
        <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Torre de Control</span>
        </div>
      </header>

      {message && <div className={`mb-8 p-4 rounded-2xl text-sm font-bold border flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{message.text}</div>}

      <div className="grid grid-cols-3 gap-3 mb-10">
        <div className="bg-neutral-800/40 p-4 rounded-3xl border border-white/5 text-center"><Users className="text-blue-400 mx-auto mb-2" size={20} /><p className="text-xl font-black">{stats.users}</p><p className="text-[8px] text-neutral-500 uppercase font-black">Usuarios</p></div>
        <div className="bg-neutral-800/40 p-4 rounded-3xl border border-white/5 text-center"><CheckCircle className="text-purple-400 mx-auto mb-2" size={20} /><p className="text-xl font-black">{stats.habits}</p><p className="text-[8px] text-neutral-500 uppercase font-black">Hábitos</p></div>
        <div className="bg-neutral-800/40 p-4 rounded-3xl border border-white/5 text-center"><Activity className="text-emerald-400 mx-auto mb-2" size={20} /><p className="text-xl font-black">{stats.logs}</p><p className="text-[8px] text-neutral-500 uppercase font-black">Registros</p></div>
      </div>

      <div className="space-y-6">
        <section className="bg-neutral-800/20 rounded-[3rem] p-6 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-purple-500/10 rounded-[1.5rem] border border-purple-500/10"><RefreshCw className="text-purple-500" size={28} /></div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight">Software v{version}</h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase">Versión de sincronización</p>
              </div>
            </div>
            <input type="text" value={appVersion} onChange={(e) => setAppVersion(e.target.value)} className="w-28 bg-neutral-900 border border-neutral-800/60 rounded-2xl px-4 py-3 text-center text-sm font-black text-purple-400 focus:border-neutral-400/50 outline-none" />
          </div>
        </section>

        <section className="bg-neutral-800/20 rounded-[3rem] p-6 border border-white/5">
          <button
            onClick={() => setOpenSection(openSection === 'maintenance' ? null : 'maintenance')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-amber-500/10 rounded-[1.5rem] border border-amber-500/10"><ShieldAlert className="text-amber-500" size={28} /></div>
              <div><h3 className="font-black text-sm uppercase tracking-tight">Mantenimiento</h3><p className="text-[10px] text-neutral-500 font-bold uppercase">Cierre de emergencia</p></div>
            </div>
            <div className="text-xs text-neutral-500">{openSection === 'maintenance' ? 'Cerrar' : 'Abrir'}</div>
          </button>
          {openSection === 'maintenance' && (
            <>
              <div className="h-px bg-white/5 my-6" />
              <div className="mt-2 space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-neutral-900/70 border border-white/5 flex items-center justify-center">
                      <Wrench size={16} className="text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Mensaje de mantenimiento</p>
                      <p className="text-xs text-neutral-600">Texto que verán los usuarios bloqueados</p>
                    </div>
                  </div>
                  <textarea value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800/60 rounded-[1.5rem] p-4 text-sm font-medium outline-none h-24 resize-none focus:border-neutral-400/50 transition-colors" placeholder="Estamos aplicando mejoras importantes..." />
                  <div className="mt-3 flex items-center gap-3">
                    <button onClick={saveMaintenanceMessage} className="bg-white text-black font-bold px-4 py-2 rounded-xl">Guardar mensaje</button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-neutral-900/70 border border-white/5 flex items-center justify-center">
                      <UserCheck size={16} className="text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Lista blanca</p>
                      <p className="text-xs text-neutral-600">Emails con acceso durante mantenimiento</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input value={whitelistInput} onChange={(e) => setWhitelistInput(e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-800/60 rounded-xl px-3 py-2 text-sm text-white" placeholder="email@dominio.com" />
                    <button onClick={addWhitelistEmail} className="bg-white text-black font-bold px-3 rounded-xl">Añadir</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {whitelist.map((email) => (
                      <button key={email} onClick={() => removeWhitelistEmail(email)} className="px-3 py-1 rounded-full border border-white/5 bg-neutral-900/60 text-xs text-neutral-300">
                        {email}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="bg-neutral-800/20 rounded-[3rem] p-6 border border-white/5">
          <button
            onClick={() => setOpenSection(openSection === 'announcements' ? null : 'announcements')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-500/10 rounded-[1.5rem] border border-indigo-500/10"><Megaphone className="text-indigo-500" size={28} /></div>
              <div><h3 className="font-black text-sm uppercase tracking-tight">Anuncio Forzoso</h3><p className="text-[10px] text-neutral-500 font-bold uppercase">Multi-idioma activo</p></div>
            </div>
            <div className="text-xs text-neutral-500">{openSection === 'announcements' ? 'Cerrar' : 'Abrir'}</div>
          </button>
          {openSection === 'announcements' && (
            <>
              <div className="h-px bg-white/5 my-6" />
              <div className="flex items-center justify-end mb-4">
                {bannerTextES && (
                  <button onClick={clearAnnouncement} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors" title="Borrar y desactivar">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-neutral-900/70 border border-white/5 flex items-center justify-center">
                      <Globe size={12} className="text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Mensaje en Español</p>
                      <p className="text-xs text-neutral-600">Texto principal para usuarios ES</p>
                    </div>
                  </div>
                  <textarea value={bannerTextES} onChange={(e) => setBannerTextES(e.target.value)} placeholder="Escribe el mensaje en Español..." className="w-full bg-neutral-900 border border-neutral-800/60 rounded-[1.5rem] p-4 text-sm font-medium outline-none h-24 resize-none focus:border-neutral-400/50 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-neutral-900/70 border border-white/5 flex items-center justify-center">
                      <Globe size={12} className="text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Mensaje en Inglés</p>
                      <p className="text-xs text-neutral-600">Fallback para usuarios EN</p>
                    </div>
                  </div>
                  <textarea value={bannerTextEN} onChange={(e) => setBannerTextEN(e.target.value)} placeholder="Write the message in English..." className="w-full bg-neutral-900 border border-neutral-800/60 rounded-[1.5rem] p-4 text-sm font-medium outline-none h-24 resize-none focus:border-neutral-400/50 transition-colors" />
                </div>
              </div>
            </>
          )}
        </section>

        <section className="bg-neutral-800/20 rounded-[3rem] p-6 border border-white/5">
          <button
            onClick={() => setOpenSection(openSection === 'users' ? null : 'users')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-slate-500/10 rounded-[1.5rem] border border-slate-500/10"><Users className="text-slate-300" size={28} /></div>
              <div><h3 className="font-black text-sm uppercase tracking-tight">Usuarios</h3><p className="text-[10px] text-neutral-500 font-bold uppercase">Gestión y bloqueos</p></div>
            </div>
            <div className="text-xs text-neutral-500">{openSection === 'users' ? 'Cerrar' : 'Abrir'}</div>
          </button>
          {openSection === 'users' && (
            <>
              <div className="h-px bg-white/5 my-6" />
              <div className="space-y-4">
                {users.map(u => (
                  <div key={u.user_id} className="bg-neutral-900/50 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-neutral-800 border border-white/5 flex items-center justify-center">
                        <Mail size={16} className="text-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{u.email}</p>
                        <p className="text-[10px] text-neutral-500">Alta: {u.created_at?.slice(0, 10)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => toggleBlockUser(u.user_id, !u.is_blocked)} className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-800 border border-white/5">
                        {u.is_blocked ? <span className="flex items-center gap-1 text-emerald-400"><UserCheck size={14} /> Activar</span> : <span className="flex items-center gap-1 text-amber-400"><UserX size={14} /> Bloquear</span>}
                      </button>
                      <button onClick={() => deleteUserData(u.user_id)} className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-800 border border-white/5 text-neutral-400">
                        Limpiar
                      </button>
                      <button onClick={() => deleteUser(u.user_id)} className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="bg-neutral-800/20 rounded-[3rem] p-6 border border-white/5">
          <button
            onClick={() => setOpenSection(openSection === 'habits' ? null : 'habits')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-500/10 rounded-[1.5rem] border border-emerald-500/10"><ListChecks className="text-emerald-400" size={28} /></div>
              <div><h3 className="font-black text-sm uppercase tracking-tight">Hábitos</h3><p className="text-[10px] text-neutral-500 font-bold uppercase">Más usados y rendimiento</p></div>
            </div>
            <div className="text-xs text-neutral-500">{openSection === 'habits' ? 'Cerrar' : 'Abrir'}</div>
          </button>
          {openSection === 'habits' && (
            <>
              <div className="h-px bg-white/5 my-6" />
              <div className="space-y-3">
                {habitStats.slice(0, 6).map(h => (
                  <div key={h.habit_id} className="bg-neutral-900/50 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{h.title}</p>
                      <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
                        {h.completed} completados · {h.skipped} omitidos
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-neutral-800">
                        <div className="h-1.5 rounded-full bg-emerald-400/60" style={{ width: `${Math.min(100, (h.completed / Math.max(1, h.completed + h.skipped)) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-neutral-500">{Math.round((h.completed / Math.max(1, h.completed + h.skipped)) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="bg-neutral-800/20 rounded-[3rem] p-6 border border-white/5">
          <button
            onClick={() => setOpenSection(openSection === 'metrics' ? null : 'metrics')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-500/10 rounded-[1.5rem] border border-blue-500/10"><LineChart className="text-blue-400" size={28} /></div>
              <div><h3 className="font-black text-sm uppercase tracking-tight">Métricas</h3><p className="text-[10px] text-neutral-500 font-bold uppercase">DAU/WAU/MAU y ratios</p></div>
            </div>
            <div className="text-xs text-neutral-500">{openSection === 'metrics' ? 'Cerrar' : 'Abrir'}</div>
          </button>
          {openSection === 'metrics' && appMetrics && (
            <>
              <div className="h-px bg-white/5 my-6" />
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-900/50 p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">DAU</p>
                  <p className="text-xl font-black">{appMetrics.dau}</p>
                </div>
                <div className="bg-neutral-900/50 p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">WAU</p>
                  <p className="text-xl font-black">{appMetrics.wau}</p>
                </div>
                <div className="bg-neutral-900/50 p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">MAU</p>
                  <p className="text-xl font-black">{appMetrics.mau}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-neutral-900/50 p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Cumplimiento</p>
                  <p className="text-xl font-black">{Math.round((appMetrics.avg_completion || 0) * 100)}%</p>
                </div>
                <div className="bg-neutral-900/50 p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Hábitos / Usuario</p>
                  <p className="text-xl font-black">{Number(appMetrics.avg_habits_per_user || 0).toFixed(1)}</p>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="bg-neutral-800/20 rounded-[3rem] p-6 border border-white/5">
          <button
            onClick={() => setOpenSection(openSection === 'notifications' ? null : 'notifications')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-fuchsia-500/10 rounded-[1.5rem] border border-fuchsia-500/10"><Bell className="text-fuchsia-400" size={28} /></div>
              <div><h3 className="font-black text-sm uppercase tracking-tight">Notificaciones</h3><p className="text-[10px] text-neutral-500 font-bold uppercase">Personalizadas y cron</p></div>
            </div>
            <div className="text-xs text-neutral-500">{openSection === 'notifications' ? 'Cerrar' : 'Abrir'}</div>
          </button>
          {openSection === 'notifications' && (
            <>
              <div className="h-px bg-white/5 my-6" />
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-neutral-900/70 border border-white/5 flex items-center justify-center">
                      <Bell size={14} className="text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Envío inmediato</p>
                      <p className="text-xs text-neutral-600">Notificación instantánea</p>
                    </div>
                  </div>
                  <input value={notifyNow.title} onChange={(e) => setNotifyNow({ ...notifyNow, title: e.target.value })} className="bg-neutral-900 border border-neutral-800/60 rounded-xl px-3 py-2 text-sm text-white" placeholder="Título" />
                  <textarea value={notifyNow.body} onChange={(e) => setNotifyNow({ ...notifyNow, body: e.target.value })} className="bg-neutral-900 border border-neutral-800/60 rounded-xl px-3 py-2 text-sm text-white h-20 resize-none" placeholder="Mensaje" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={notifyNow.min_version} onChange={(e) => setNotifyNow({ ...notifyNow, min_version: e.target.value })} className="bg-neutral-900 border border-neutral-800/60 rounded-xl px-3 py-2 text-sm text-white" placeholder="Versión mínima" />
                    <input value={notifyNow.max_version} onChange={(e) => setNotifyNow({ ...notifyNow, max_version: e.target.value })} className="bg-neutral-900 border border-neutral-800/60 rounded-xl px-3 py-2 text-sm text-white" placeholder="Versión máxima" />
                  </div>
                  <input value={notifyNow.url} onChange={(e) => setNotifyNow({ ...notifyNow, url: e.target.value })} className="bg-neutral-900 border border-neutral-800/60 rounded-xl px-3 py-2 text-sm text-white" placeholder="URL (opcional)" />
                  <button onClick={sendNotificationNow} className="bg-white text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 justify-center">
                    <Wrench size={16} /> Enviar ahora
                  </button>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-xl bg-neutral-900/70 border border-white/5 flex items-center justify-center">
                      <Save size={14} className="text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Programadas</p>
                      <p className="text-xs text-neutral-600">Se ejecutan vía cronjob</p>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <input value={notifySchedule.title} onChange={(e) => setNotifySchedule({ ...notifySchedule, title: e.target.value })} className="bg-neutral-900 border border-neutral-800/60 rounded-xl px-3 py-2 text-sm text-white" placeholder="Título" />
                    <textarea value={notifySchedule.body} onChange={(e) => setNotifySchedule({ ...notifySchedule, body: e.target.value })} className="bg-neutral-900 border border-neutral-800/60 rounded-xl px-3 py-2 text-sm text-white h-20 resize-none" placeholder="Mensaje" />
                    <input type="datetime-local" value={notifySchedule.send_at} onChange={(e) => setNotifySchedule({ ...notifySchedule, send_at: e.target.value })} className="bg-neutral-900 border border-neutral-800/60 rounded-xl px-3 py-2 text-sm text-white" />
                    <input value={notifySchedule.url} onChange={(e) => setNotifySchedule({ ...notifySchedule, url: e.target.value })} className="bg-neutral-900 border border-neutral-800/60 rounded-xl px-3 py-2 text-sm text-white" placeholder="URL (opcional)" />
                    <button onClick={scheduleNotification} className="bg-white text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 justify-center">
                      <Save size={16} /> Programar
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <button onClick={handleUpdateSettings} disabled={loading} className="w-full bg-white text-black font-black py-6 rounded-[2.5rem] text-lg active:scale-95 transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,255,255,0.05)]">
          {loading ? 'Sincronizando...' : <><Save size={22} /> Ejecutar Órdenes</>}
        </button>
      </div>
    </div>
  )
}