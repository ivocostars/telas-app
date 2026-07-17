import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { getEstadisticas } from '../services/api'
import type { Estadisticas } from '../types'

dayjs.locale('es')

export default function Dashboard() {
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchStats = async () => {
    try {
      const data = await getEstadisticas()
      setStats(data)
      setError('')
      setLastUpdate(dayjs().format('HH:mm:ss'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <div className="spinner" />
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="page">
        <div className="error-container">
          <p className="form-error">{error}</p>
          <button className="btn btn-primary" onClick={fetchStats}>Reintentar</button>
        </div>
      </div>
    )
  }

  const now = dayjs().format('dddd, D [de] MMMM [de] YYYY')
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
        <p className="page-date">{capitalize(now)}</p>
        <p className="page-date" style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>
          🔴 EN VIVO · Actualizado {lastUpdate || '...'}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-purple">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.total ?? 0}</span>
            <span className="stat-label">Total Espectadores</span>
          </div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.ingresados ?? 0}</span>
            <span className="stat-label">Ingresados</span>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.faltantes ?? 0}</span>
            <span className="stat-label">Faltan</span>
          </div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.ocupacion_pct ?? 0}%</span>
            <span className="stat-label">Ocupación</span>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: 'var(--color-primary)' }}>
          <div className="stat-icon">💺</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.sillas_otorgadas ?? 0}</span>
            <span className="stat-label">Sillas Totales</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--color-accent, #D4A847)' }}>
          <div className="stat-icon">💺</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.sillas_ocupadas ?? 0}</span>
            <span className="stat-label">Sillas Ocupadas</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--color-text-light)' }}>
          <div className="stat-icon">💺</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.sillas_restantes ?? 0}</span>
            <span className="stat-label">Sillas Restantes</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#F59E0B' }}>
          <div className="stat-icon">🎟️</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.vendidos_en_puerta ?? 0}</span>
            <span className="stat-label">Vendidas en Puerta</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Últimos Ingresos</h3>
        {stats?.ultimos_ingresos && stats.ultimos_ingresos.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Espectador</th>
                  <th>DNI</th>
                  <th>Silla</th>
                  <th>Scanner</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {stats.ultimos_ingresos.map((ing) => (
                  <tr key={ing.id}>
                    <td>{ing.nombreCompleto}</td>
                    <td>{ing.dni}</td>
                    <td>
                      <span className={`badge ${ing.silla ? 'badge-success' : 'badge-muted'}`}>
                        {ing.silla ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td>{ing.scanner_nombre}</td>
                    <td>{dayjs(ing.creado_en).format('HH:mm:ss')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-text">No hay ingresos recientes</p>
        )}
      </div>
    </div>
  )
}
