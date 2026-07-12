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

  const fetchStats = async () => {
    try {
      const data = await getEstadisticas()
      setStats(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
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

      <div className="card">
        <h3 className="card-title">Sillas reservadas</h3>
        <p className="empty-text">{stats?.sillas_otorgadas ?? 0} personas tienen silla reservada</p>
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
                    <td>{ing.nombre} {ing.apellido}</td>
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
