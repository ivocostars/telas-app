import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api'
import { Modal } from '../components/Modal'

function validatePass(pw: string): string | null {
  if (pw.length < 8) return 'Mínimo 8 caracteres'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return 'Debe tener 1 carácter especial (!@#$%...)'
  return null
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showRecover, setShowRecover] = useState(false)
  const [recoverEmail, setRecoverEmail] = useState('')
  const [recoverCode, setRecoverCode] = useState('')
  const [newPass, setNewPass] = useState('')
  const [recoverMsg, setRecoverMsg] = useState('')
  const [recovering, setRecovering] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      localStorage.setItem('token', res.token)
      navigate('/')
    } catch {
      setError('Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = async () => {
    if (!recoverEmail || !recoverCode || !newPass) return
    const pwErr = validatePass(newPass)
    if (pwErr) { setRecoverMsg(pwErr); return }
    setRecovering(true)
    setRecoverMsg('')
    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoverEmail, recoveryCode: recoverCode, newPassword: newPass }),
      })
      const data = await res.json()
      if (data.ok) {
        setRecoverMsg('✅ Contraseña restablecida. Iniciá sesión con tu nueva contraseña.')
        setTimeout(() => { setShowRecover(false); setRecoverMsg('') }, 3000)
      } else {
        setRecoverMsg(data.error || 'Error al recuperar')
      }
    } catch {
      setRecoverMsg('Error de conexión')
    } finally {
      setRecovering(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-accent" />
        <h1 className="login-title">Telas Admin</h1>
        <p className="login-subtitle">Control de Entradas</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="form-input" placeholder="admin@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input id="password" type="password" className="form-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
          <button type="button" className="btn btn-block" style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }} onClick={() => setShowRecover(true)}>
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      </div>

      <Modal open={showRecover} onClose={() => setShowRecover(false)} title="Recuperar contraseña">
        <div className="form">
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: 8 }}>
            Necesitás el código de recuperación del servidor para restablecer la contraseña.
          </p>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={recoverEmail} onChange={(e) => setRecoverEmail(e.target.value)} placeholder="tu@email.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Código de recuperación</label>
            <input type="text" className="form-input" value={recoverCode} onChange={(e) => setRecoverCode(e.target.value)} placeholder="Ingresá el código del servidor" />
          </div>
          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <input type="password" className="form-input" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Mínimo 8 + 1 especial" />
            {newPass.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: 2 }}>{validatePass(newPass) || '✅'}</span>
            )}
          </div>
          {recoverMsg && <p className="form-error" style={{ color: recoverMsg.includes('✅') ? 'var(--color-success)' : 'var(--color-error)' }}>{recoverMsg}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setShowRecover(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={handleRecover} disabled={recovering}>
              {recovering ? 'Procesando...' : 'Restablecer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
