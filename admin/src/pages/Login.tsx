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
  const [recStep, setRecStep] = useState<'email' | 'reset'>('email')
  const [recEmail, setRecEmail] = useState('')
  const [recCode, setRecCode] = useState('')
  const [newPass, setNewPass] = useState('')
  const [recMsg, setRecMsg] = useState('')
  const [recovering, setRecovering] = useState(false)

  const [mustChange, setMustChange] = useState(false)
  const [changeEmail, setChangeEmail] = useState('')
  const [changeCode, setChangeCode] = useState('')
  const [changeNewPass, setChangeNewPass] = useState('')
  const [changeMsg, setChangeMsg] = useState('')
  const [changing, setChanging] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      if (res.mustChangePassword) {
        setChangeEmail(email)
        setChangeCode(password)
        setMustChange(true)
        return
      }
      localStorage.setItem('token', res.token)
      navigate('/')
    } catch {
      setError('Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    const err = validatePass(changeNewPass)
    if (err) { setChangeMsg(err); return }
    setChanging(true)
    setChangeMsg('')
    try {
      // Llama al setup-password o reset-password (funcionan igual)
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: changeEmail, code: changeCode, newPassword: changeNewPass }),
      })
      const data = await res.json()
      if (data.ok) {
        // Login con la nueva contraseña
        const loginRes = await login(changeEmail, changeNewPass)
        localStorage.setItem('token', loginRes.token)
        setMustChange(false)
        navigate('/')
      } else {
        setChangeMsg(data.error || 'Error')
      }
    } catch {
      setChangeMsg('Error de conexión')
    } finally {
      setChanging(false)
    }
  }

  const handleSendCode = async () => {
    if (!recEmail.trim()) return
    setRecovering(true)
    setRecMsg('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recEmail.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setRecStep('reset')
        setRecMsg('📧 Revisá tu email. Llegó un código de 6 dígitos.')
      } else {
        setRecMsg(data.error || 'Error')
      }
    } catch {
      setRecMsg('Error de conexión')
    } finally {
      setRecovering(false)
    }
  }

  const handleReset = async () => {
    if (!recCode.trim() || !newPass.trim()) return
    const pwErr = validatePass(newPass)
    if (pwErr) { setRecMsg(pwErr); return }
    setRecovering(true)
    setRecMsg('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recEmail.trim(), code: recCode.trim(), newPassword: newPass }),
      })
      const data = await res.json()
      if (data.ok) {
        // Login con la nueva contraseña
        const loginRes = await login(recEmail.trim(), newPass)
        localStorage.setItem('token', loginRes.token)
        setShowRecover(false)
        setRecStep('email')
        setRecMsg('')
        navigate('/')
      } else {
        setRecMsg(data.error || 'Error')
      }
    } catch {
      setRecMsg('Error de conexión')
    } finally {
      setRecovering(false)
    }
  }

  return (
    <>
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
              <label className="form-label" htmlFor="password">Contraseña o código</label>
              <input id="password" type="password" className="form-input" placeholder="Ingresá tu contraseña o código" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            <button type="button" className="btn btn-block" style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }} onClick={() => { setShowRecover(true); setRecStep('email'); setRecMsg(''); setRecCode(''); setNewPass('') }}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        </div>

        <Modal open={showRecover} onClose={() => setShowRecover(false)} title="Recuperar contraseña">
          <div className="form">
            {recStep === 'email' ? (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: 8 }}>Te enviaremos un código de recuperación a tu email.</p>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={recEmail} onChange={(e) => setRecEmail(e.target.value)} placeholder="tu@email.com" />
                </div>
                {recMsg && <p className="form-error" style={{ color: 'var(--color-text-light)' }}>{recMsg}</p>}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowRecover(false)}>Cancelar</button>
                  <button type="button" className="btn btn-primary" onClick={handleSendCode} disabled={recovering || !recEmail.trim()}>
                    {recovering ? 'Enviando...' : 'Enviar código'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: 8 }}>Ingresá el código recibido y tu nueva contraseña.</p>
                <div className="form-group">
                  <label className="form-label">Código de 6 dígitos</label>
                  <input type="text" className="form-input" value={recCode} onChange={(e) => setRecCode(e.target.value)} placeholder="123456" maxLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <input type="password" className="form-input" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Mínimo 8 + 1 especial" />
                  {newPass.length > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: 2 }}>{validatePass(newPass) || '✅'}</span>}
                </div>
                {recMsg && <p className="form-error" style={{ color: recMsg.includes('✅') ? 'var(--color-success)' : recMsg.includes('📧') ? 'var(--color-text-light)' : 'var(--color-error)' }}>{recMsg}</p>}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setRecStep('email')}>← Volver</button>
                  <button type="button" className="btn btn-primary" onClick={handleReset} disabled={recovering}>
                    {recovering ? 'Procesando...' : 'Restablecer y entrar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>

      <Modal open={mustChange} onClose={() => {}} title="Cambiar contraseña obligatorio" large>
        <div className="form">
          <p style={{ fontSize: '0.85rem', color: 'var(--color-error)', fontWeight: 600, marginBottom: 8 }}>
            ⚠️ Es tu primer ingreso. Debes cambiar la contraseña antes de continuar.
          </p>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={changeEmail} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <input type="password" className="form-input" value={changeNewPass} onChange={(e) => setChangeNewPass(e.target.value)} placeholder="Mínimo 8 + 1 especial" />
            {changeNewPass.length > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: 2 }}>{validatePass(changeNewPass) || '✅'}</span>}
          </div>
          {changeMsg && <p className="form-error" style={{ color: changeMsg.includes('✅') ? 'var(--color-success)' : 'var(--color-error)' }}>{changeMsg}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={handleChangePassword} disabled={changing}>
              {changing ? 'Guardando...' : 'Establecer contraseña y entrar'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
