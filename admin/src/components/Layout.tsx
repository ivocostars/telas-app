import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { useToast } from './Toast'
import { changePassword, getUsuarios, createUsuario, deleteUsuario } from '../services/api'

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
  const [newPass, setNewPass] = useState('')
  const [newRol, setNewRol] = useState<'admin' | 'scanner'>('scanner')
  const [creating, setCreating] = useState(false)

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
    if (!newEmail || !newPass) return
    setCreating(true)
    try {
      await createUsuario(newEmail, newPass, newRol)
      addToast('Usuario creado', 'success')
      setNewEmail('')
      setNewPass('')
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
              <label className="form-label">Contraseña</label>
              <input type="password" className="form-input" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 8 }}>
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select className="form-input" value={newRol} onChange={(e) => setNewRol(e.target.value as 'admin' | 'scanner')}>
                <option value="scanner">Scanner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end', display: 'flex' }}>
              <button className="btn btn-primary" onClick={handleCreateUser} disabled={creating} style={{ marginTop: 22 }}>
                {creating ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
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
    </div>
  )
}
