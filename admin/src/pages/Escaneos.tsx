import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useToast } from '../components/Toast';
import { getEscaneos, deleteEscaneo } from '../services/api';

interface Escaneo {
  id: number;
  espectadorId: number;
  espectadorNombre: string | null;
  scannerNombre: string;
  resultado: 'ok' | 'rechazado' | 'salida';
  creadoEn: string;
}

export default function Escaneos() {
  const { addToast } = useToast();
  const [escaneos, setEscaneos] = useState<Escaneo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEscaneos = async () => {
    try {
      setLoading(true);
      const data = await getEscaneos();
      setEscaneos(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al cargar escaneos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscaneos();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que querés eliminar este registro de escaneo?')) return;
    try {
      await deleteEscaneo(id);
      addToast('Escaneo eliminado', 'success');
      fetchEscaneos();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Lista de Escaneos (Últimos 100)</h1>
        <div className="actions">
          <button className="btn btn-outline" onClick={fetchEscaneos}>Actualizar</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center' }}>Cargando...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Espectador</th>
                  <th>Escáner</th>
                  <th>Resultado</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {escaneos.map((e) => (
                  <tr key={e.id}>
                    <td>{dayjs(e.creadoEn).format('DD/MM/YYYY HH:mm:ss')}</td>
                    <td>{e.espectadorNombre || `(ID: ${e.espectadorId})`}</td>
                    <td>{e.scannerNombre}</td>
                    <td>
                      <span className={`badge ${e.resultado === 'ok' ? 'badge-success' : e.resultado === 'rechazado' ? 'badge-error' : 'badge-warning'}`}>
                        {e.resultado.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-icon" 
                        title="Eliminar"
                        onClick={() => handleDelete(e.id)}
                        style={{ color: 'var(--color-error)' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {escaneos.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>No hay escaneos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
