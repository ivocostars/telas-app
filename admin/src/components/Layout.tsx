import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { useToast } from './Toast'
import { changePassword, getUsuarios, createUsuario, deleteUsuario } from '../services/api'
import QRCode from 'qrcode'

function validatePass(pw: string): string | null {
  if (pw.length < 8) return 'Mínimo 8 caracteres'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return 'Debe tener al menos 1 carácter especial (!@#$%...)'
  return null
}

export function Layout() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const [showUsers, setShowUsers] = useState(false)
  const [users, setUsers] = useState<{ id: number; email: string; rol: string }[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newRol, setNewRol] = useState<'admin' | 'scanner'>('scanner')
  const [creating, setCreating] = useState(false)

  const [showApkLink, setShowApkLink] = useState(false)
  const [apkLink, setApkLink] = useState('')
  const [apkQr, setApkQr] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)

  const [showEvent, setShowEvent] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [eventAddress, setEventAddress] = useState('')
  const [savingEvent, setSavingEvent] = useState(false)

  const openEventConfig = async () => {
    setShowEvent(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/event-config', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.eventDate) {
        const d = new Date(data.eventDate)
        const pad = (n: number) => String(n).padStart(2, '0')
        setEventDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
      }
      setEventAddress(data.eventAddress || '')
    } catch {
      setEventDate('')
      setEventAddress('')
    }
  }

  const handleSaveEvent = async () => {
    setSavingEvent(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/event-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDate: eventDate ? new Date(eventDate).toISOString() : null,
          eventAddress: eventAddress || null,
        }),
      })
      if (res.ok) {
        addToast('Evento actualizado', 'success')
        setShowEvent(false)
      } else {
        const data = await res.json()
        addToast(data.error || 'Error al guardar', 'error')
      }
    } catch {
      addToast('Error de conexión', 'error')
    } finally {
      setSavingEvent(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) return
    const err = validatePass(newPw)
    if (err) { addToast(err, 'error'); return }
    setSavingPw(true)
    try {
      await changePassword(currentPw, newPw)
      addToast('Contraseña actualizada', 'success')
      setShowPassword(false)
      setCurrentPw('')
      setNewPw('')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setSavingPw(false)
    }
  }

  const openUsers = async () => {
    setShowUsers(true)
    try {
      const data = await getUsuarios()
      setUsers(data)
    } catch { addToast('Error al cargar usuarios', 'error') }
  }

  const handleCreateUser = async () => {
    if (!newEmail) return
    setCreating(true)
    try {
      const res = await createUsuario(newEmail, newRol)
      addToast(`Invitación enviada a ${newEmail}`, 'success')
      setNewEmail('')
      const data = await getUsuarios()
      setUsers(data)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteUser = async (id: number, email: string) => {
    if (!confirm(`¿Eliminar usuario ${email}?`)) return
    try {
      await deleteUsuario(id)
      addToast('Usuario eliminado', 'success')
      setUsers(users.filter((u) => u.id !== id))
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error', 'error')
    }
  }

  return (
    <div className="layout">
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">Telas Admin</h1>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">📊</span>
            Dashboard
          </NavLink>
          <NavLink to="/espectadores" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">👥</span>
            Espectadores
          </NavLink>
          <button className="nav-link" onClick={() => { setSidebarOpen(false); openUsers() }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span className="nav-icon">🔐</span>
            Usuarios
          </button>
          <button className="nav-link" onClick={() => { setSidebarOpen(false); openEventConfig() }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span className="nav-icon">📅</span>
            Evento
          </button>
          <button className="nav-link" onClick={async () => {
            setSidebarOpen(false)
            setGeneratingLink(true)
            setShowApkLink(true)
            try {
              const token = localStorage.getItem('token')
              const res = await fetch('/api/apk/token', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              })
              const data = await res.json()
              if (data.link) {
                setApkLink(data.link)
                setApkQr(await QRCode.toDataURL(data.link, { width: 200, margin: 2 }))
              } else {
                setApkLink('Error al generar link')
                setApkQr('')
              }
            } catch {
              setApkLink('Error al generar link')
              setApkQr('')
            } finally {
              setGeneratingLink(false)
            }
          }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span className="nav-icon">📲</span>
            Compartir App
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="nav-link" onClick={() => { setSidebarOpen(false); setShowPassword(true) }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span className="nav-icon">🔑</span>
            Cambiar contraseña
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Modal cambiar contraseña */}
      <Modal open={showPassword} onClose={() => setShowPassword(false)} title="Cambiar contraseña">
        <div className="form">
          <div className="form-group">
            <label className="form-label">Contraseña actual</label>
            <input type="password" className="form-input" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <input type="password" className="form-input" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Mínimo 8 caracteres + 1 especial" />
            {newPw.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: validatePass(newPw) ? 'var(--color-error)' : 'var(--color-success)', marginTop: 2 }}>
                {validatePass(newPw) || '✅'}
              </span>
            )}
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setShowPassword(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleChangePassword} disabled={savingPw}>
              {savingPw ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal usuarios */}
      <Modal open={showUsers} onClose={() => setShowUsers(false)} title="Usuarios" large>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: 12, color: 'var(--color-text)' }}>Crear nuevo usuario</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select className="form-input" value={newRol} onChange={(e) => setNewRol(e.target.value as 'admin' | 'scanner')}>
                <option value="scanner">Scanner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: -8, marginBottom: 8 }}>
            Se enviará un código de acceso por email para que configure su contraseña.
          </p>
          <button className="btn btn-primary" onClick={handleCreateUser} disabled={creating || !newEmail.trim()}>
            {creating ? 'Enviando...' : 'Crear usuario'}
          </button>
        </div>
        <div>
          <h3 style={{ fontSize: '0.95rem', marginBottom: 12, color: 'var(--color-text)' }}>Usuarios existentes</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Email</th><th>Rol</th><th>Acción</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.rol === 'admin' ? 'badge-primary' : 'badge-muted'}`}>{u.rol}</span></td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u.id, u.email)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Modal link de descarga */}
      <Modal open={showApkLink} onClose={() => setShowApkLink(false)} title="Compartir App">
        <div className="form">
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: 12 }}>
            Compartí este código QR o el link para descargar la app. Válido por 24 horas.
          </p>
          {generatingLink ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>Generando link...</p>
          ) : apkLink ? (
            <>
              {apkQr && (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <img src={apkQr} alt="QR de descarga" style={{ borderRadius: 8, border: '1px solid var(--color-border)' }} />
                </div>
              )}
              <div style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: 12,
                fontSize: '0.8rem',
                wordBreak: 'break-all',
                color: 'var(--color-text)',
                marginBottom: 12,
              }}>
                {apkLink}
              </div>
              <div className="form-actions">
                <button className="btn btn-outline" onClick={() => setShowApkLink(false)}>Cerrar</button>
                <button className="btn btn-primary" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(apkLink)
                    addToast('Link copiado al portapapeles', 'success')
                  } catch {
                    addToast('No se pudo copiar', 'error')
                  }
                }}>Copiar link</button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {/* Modal evento */}
      <Modal open={showEvent} onClose={() => setShowEvent(false)} title="Configuración del Evento">
        <div className="form">
          <div className="form-group">
            <label className="form-label">Fecha y hora del evento</label>
            <input type="datetime-local" className="form-input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input type="text" className="form-input" value={eventAddress} onChange={(e) => setEventAddress(e.target.value)} placeholder="Ej: Teatro Colón, CABA" />
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setShowEvent(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSaveEvent} disabled={savingEvent}>
              {savingEvent ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
