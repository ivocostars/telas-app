import { useState, useEffect, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import {
  getEspectadores,
  createEspectador,
  updateEspectador,
  deleteEspectador,
  deleteAllEspectadores,
  marcarSalida,
  bulkImport,
  getQrImageUrl,
  downloadPlantilla,
  sendEmail,
} from '../services/api'
import type { Espectador, EspectadorInput, BulkImportResult } from '../types'

export default function Espectadores() {
  const { addToast } = useToast()

  const [espectadores, setEspectadores] = useState<Espectador[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState<Espectador | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showQr, setShowQr] = useState<Espectador | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailResult, setEmailResult] = useState<'success' | 'error' | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Espectador | null>(null)
  const [showDeleteAll, setShowDeleteAll] = useState(false)

  const [formData, setFormData] = useState<EspectadorInput>({
    nombreCompleto: '',
    email: '',
    telefono: '',
    silla: false,
    alumnaInvitada: '',
  })

  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getEspectadores({ search, page, limit })
      setEspectadores(res.data)
      setTotal(res.total)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al cargar', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, page, limit, addToast])

  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchData()
    if (!autoRefresh) return
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData, autoRefresh])

  const handleSearch = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
    }, 300)
  }

  const openNew = () => {
    setEditing(null)
    setFormData({ nombreCompleto: '', email: '', telefono: '', silla: false, alumnaInvitada: '' })
    setShowForm(true)
  }

  const openEdit = (e: Espectador) => {
    setEditing(e)
    setFormData({
      nombreCompleto: e.nombreCompleto,
      email: e.email || '',
      telefono: e.telefono || '',
      silla: e.silla,
      alumnaInvitada: e.alumnaInvitada,
    })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await updateEspectador(editing.id, formData)
        addToast('Espectador actualizado', 'success')
      } else {
        await createEspectador(formData)
        addToast('Espectador creado', 'success')
      }
      setShowForm(false)
      fetchData()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteEspectador(deleteTarget.id)
      addToast('Espectador eliminado', 'success')
      setDeleteTarget(null)
      fetchData()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al eliminar', 'error')
    }
  }

  const handleDeleteAll = async () => {
    try {
      const res = await deleteAllEspectadores()
      addToast(`Se eliminaron ${res.deleted} espectadores`, 'success')
      setShowDeleteAll(false)
      fetchData()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al eliminar', 'error')
    }
  }

  const handleMarcarSalida = async (id: number) => {
    try {
      const res = await marcarSalida(id)
      if (res.valido) {
        addToast('Salida marcada correctamente', 'success')
        fetchData()
      } else {
        addToast(res.motivo || 'Error', 'error')
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error', 'error')
    }
  }

  const openQr = async (e: Espectador) => {
    setShowQr(e)
    setQrDataUrl('')
    try {
      const qrData = [e.qrHash, e.nombreCompleto, e.alumnaInvitada || ''].join('|')
      const url = await QRCode.toDataURL(qrData)
      setQrDataUrl(url)
    } catch {
      addToast('Error al generar QR', 'error')
    }
  }

  const downloadQr = () => {
    if (!qrDataUrl || !showQr) return
    const link = document.createElement('a')
    link.download = `qr-${showQr.id}.png`
    link.href = qrDataUrl
    link.click()
  }

  const exportPdf = async () => {
    try {
      const res = await getEspectadores({ search: '', page: 1, limit: 10000 })
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const rows = res.data.map((e, i) => [
        '',
        i + 1,
        e.nombreCompleto,
        e.alumnaInvitada || '',
        e.silla ? 'SÍ' : 'NO',
        e.email || '',
        e.telefono || '',
      ])
      autoTable(doc, {
        head: [['', '#', 'Nombre completo', 'Alumna', 'Silla', 'Email', 'Teléfono']],
        body: rows,
        styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
        },
        didDrawPage: (data) => {
          doc.setFontSize(10)
          doc.setTextColor(0)
          doc.text('Lista de Invitados - Acrobacia en Telas', data.settings.margin.left, 10)
        },
      })
      doc.save('lista-invitados.pdf')
    } catch (err) {
      addToast('Error al generar PDF', 'error')
    }
  }

  const handleSendEmail = async () => {
    if (!showQr) return
    setSendingEmail(true)
    setEmailResult(null)
    try {
      await sendEmail(showQr.id)
      setEmailResult('success')
    } catch {
      setEmailResult('error')
    } finally {
      setSendingEmail(false)
    }
  }

  const shareWhatsApp = () => {
    if (!showQr) return
    downloadQr()
    if (showQr.telefono) {
      const digits = showQr.telefono.replace(/\D/g, '')
      let phone = digits
      if (!digits.startsWith('54')) {
        if (digits.startsWith('15')) phone = '549' + digits.slice(2)
        else if (digits.startsWith('11')) phone = '549' + digits
        else if (digits.length >= 10) phone = '549' + digits
      }
      const msg = encodeURIComponent(
        `🎟️ *Entrada - Telas*\n\n*Nombre:* ${showQr.nombreCompleto}`
      )
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
    }
  }

  const handleImport = async (file: File) => {
    setImporting(true)
    setImportResult(null)
    try {
      const result = await bulkImport(file)
      setImportResult(result)
      if (result.created > 0) {
        addToast(`Se crearon ${result.created} espectadores`, 'success')
        fetchData()
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al importar', 'error')
    } finally {
      setImporting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Espectadores</h2>
      </div>

      <div className="toolbar">
        <div className="search-wrapper">
          <input
            type="text"
            className="form-input search-input"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo</button>
          <button className="btn btn-outline" onClick={() => { setImportResult(null); setShowImport(true) }}>Importar Excel</button>
          <button className="btn btn-outline" onClick={exportPdf}>📄 PDF</button>
          <button
            className={`btn ${autoRefresh ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Live refresh ON' : 'Live refresh OFF'}
          >
            {autoRefresh ? '🔴 EN VIVO' : '⏸ PAUSADO'}
          </button>
          <button className="btn btn-danger" onClick={() => setShowDeleteAll(true)}>🗑 Eliminar Todos</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Cargando espectadores...</p>
        </div>
      ) : espectadores.length === 0 ? (
        <div className="card">
          <p className="empty-text">
            {search ? 'No se encontraron espectadores con ese criterio de búsqueda' : 'No hay espectadores registrados'}
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre completo</th>
                  <th>Teléfono</th>
                  <th>Alumna</th>
                  <th>Silla</th>
                  <th>Ingresado</th>
                  <th>Email</th>
                  <th>QR</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {espectadores.map((esp) => (
                  <tr key={esp.id}>
                    <td>{esp.nombreCompleto}</td>
                    <td>{esp.telefono || '—'}</td>
                    <td>
                      {esp.alumnaInvitada ? (
                        <span className="badge badge-primary">{esp.alumnaInvitada}</span>
                      ) : (
                        <span className="badge badge-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${esp.silla ? 'badge-success' : 'badge-muted'}`}>
                        {esp.silla ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${esp.ingresado ? 'badge-success' : 'badge-warning'}`}>
                        {esp.ingresado ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td>{esp.email || '—'}</td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => openQr(esp)} title="Ver QR">🖼</button>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(esp)} title="Editar">✏️</button>
                        {esp.ingresado && <button className="btn btn-sm btn-outline" onClick={() => handleMarcarSalida(esp.id)} title="Marcar salida">🚪</button>}
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(esp)} title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
              <span className="pagination-info">Página {page} de {totalPages} ({total} registros)</span>
              <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
            </div>
          )}
        </>
      )}

      {/* Nuevo/Editar */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Espectador' : 'Nuevo Espectador'}>
        <form onSubmit={handleSave} className="form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="nombreCompleto">Nombre completo *</label>
              <input id="nombreCompleto" className="form-input" required value={formData.nombreCompleto} onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="form-input" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="telefono">Teléfono</label>
              <input id="telefono" className="form-input" value={formData.telefono || ''} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="form-label-checkbox">
                <input type="checkbox" checked={formData.silla || false} onChange={(e) => setFormData({ ...formData, silla: e.target.checked })} />
                Silla reservada
              </label>
              <label className="form-label-checkbox">
                <input type="text" className="form-input" placeholder="Alumna invitada" value={formData.alumnaInvitada || ''} onChange={(e) => setFormData({ ...formData, alumnaInvitada: e.target.value })} />
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* QR */}
      <Modal open={!!showQr} onClose={() => { if (!sendingEmail) setShowQr(null); setEmailResult(null) }} title="Código QR" large>
        {showQr && (
          <div className="qr-modal-content">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR ${showQr.nombreCompleto}`} className="qr-image" />
            ) : (
              <div className="loading-container"><div className="spinner" /><p>Generando QR...</p></div>
            )}
            <p className="qr-name">{showQr.nombreCompleto}</p>
            {showQr.alumnaInvitada && <p className="qr-badge">🎓 {showQr.alumnaInvitada}</p>}
            <div className="qr-actions">
              <button className="btn btn-primary" onClick={downloadQr}>Descargar QR</button>
              {showQr.email && <button className="btn btn-outline" onClick={handleSendEmail} disabled={sendingEmail}>Enviar por Email</button>}
              {showQr.telefono && <button className="btn btn-outline" onClick={shareWhatsApp}>Compartir WhatsApp</button>}
              {showQr.ingresado && <button className="btn btn-outline" onClick={() => { handleMarcarSalida(showQr.id); setShowQr(null) }}>🚪 Marcar salida</button>}
            </div>

            {sendingEmail && (
              <div className="qr-email-overlay">
                <div className="spinner" />
                <p>Enviando mail...</p>
              </div>
            )}

            {emailResult && (
              <div className={`qr-email-result qr-email-${emailResult}`}>
                <span className="qr-email-icon">{emailResult === 'success' ? '✓' : '✕'}</span>
                <p>{emailResult === 'success' ? 'Email enviado correctamente' : 'Error al enviar el email'}</p>
                <button className="btn btn-outline" onClick={() => setEmailResult(null)}>Cerrar</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Importar Excel */}
      <Modal open={showImport} onClose={() => { setShowImport(false); setImportResult(null) }} title="Importar Espectadores">
        {importResult ? (
          <div className="import-result">
            <div className="import-stats">
              <p className="import-success">✓ {importResult.created} espectadores creados</p>
              {importResult.errors.length > 0 && <p className="import-error">✕ {importResult.errors.length} errores</p>}
            </div>
            {importResult.errors.length > 0 && (
              <div className="import-details">
                <h4>Detalles de errores:</h4>
                <ul>{importResult.errors.map((e, i) => <li key={i}>Fila {e.row}: {e.reason}</li>)}</ul>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => { setShowImport(false); setImportResult(null) }}>Cerrar</button>
          </div>
        ) : (
          <div className="import-area">
            <div className="import-info">
              <p className="import-format">Columnas: <code>nombre</code> <code>email</code> <code>telefono</code> <code>silla</code> <code>alumna_invitada</code></p>
            </div>
            <div className="import-actions">
              <button className="btn btn-outline" onClick={downloadPlantilla}>📥 Descargar plantilla</button>
            </div>
            <label className="file-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImport(f) }}>
              <div className="file-drop-content">
                <span className="file-drop-icon">📁</span>
                <p>Arrastrá tu archivo Excel (.xlsx) aquí o</p>
                <span className="btn btn-outline btn-sm">Seleccionar archivo</span>
              </div>
              <input type="file" accept=".xlsx,.csv" className="file-input" disabled={importing} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f) }} />
            </label>
            {importing && (<div className="loading-container"><div className="spinner" /><p>Importando...</p></div>)}
          </div>
        )}
      </Modal>

      {/* Confirmar eliminar */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar eliminación">
        {deleteTarget && (
          <div className="confirm-content">
            <p>¿Estás seguro de que querés eliminar a <strong>{deleteTarget.nombreCompleto}</strong>?</p>
            <p className="confirm-warning">Esta acción no se puede deshacer.</p>
            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmar eliminar todos */}
      <Modal open={showDeleteAll} onClose={() => setShowDeleteAll(false)} title="Eliminar todos los espectadores">
        <div className="confirm-content">
          <p>¿Estás seguro de que querés eliminar <strong>TODOS</strong> los espectadores?</p>
          <p className="confirm-warning">Esta acción elimina todos los registros, incluyendo escaneos. No se puede deshacer.</p>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setShowDeleteAll(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDeleteAll}>Eliminar Todos</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
