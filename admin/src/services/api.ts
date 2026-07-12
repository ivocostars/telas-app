import type { Espectador, EspectadorInput, EspectadoresResponse, Estadisticas, BulkImportResult } from '../types'

const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function clearSession(): void {
  localStorage.removeItem('token')
  window.location.href = '/login'
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    clearSession()
    throw new Error('Sesión expirada')
  }

  if (!res.ok) {
    const body = await res.text()
    let message = 'Error de servidor'
    try {
      const parsed = JSON.parse(body)
      message = parsed.error || parsed.message || message
    } catch {
      message = body || message
    }
    throw new Error(message)
  }

  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return res.json()
  }

  return undefined as unknown as T
}

export function login(email: string, password: string): Promise<{ token: string }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getEspectadores(params?: {
  search?: string
  page?: number
  limit?: number
}): Promise<EspectadoresResponse> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  const qs = searchParams.toString()
  return request(`/espectadores${qs ? `?${qs}` : ''}`)
}

export function getEspectador(id: number): Promise<Espectador> {
  return request(`/espectadores/${id}`)
}

export function createEspectador(data: EspectadorInput): Promise<Espectador> {
  return request('/espectadores', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateEspectador(id: number, data: Partial<EspectadorInput>): Promise<Espectador> {
  return request(`/espectadores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteEspectador(id: number): Promise<void> {
  return request(`/espectadores/${id}`, {
    method: 'DELETE',
  })
}

export function bulkImport(file: File): Promise<BulkImportResult> {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)

  return fetch(`${API_BASE}/espectadores/bulk`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }).then(async (res) => {
    if (res.status === 401) {
      clearSession()
      throw new Error('Sesión expirada')
    }
    if (!res.ok) {
      const body = await res.text()
      let message = 'Error al importar'
      try {
        const parsed = JSON.parse(body)
        message = parsed.error || parsed.message || message
      } catch {
        message = body || message
      }
      throw new Error(message)
    }
    return res.json()
  })
}

export function getEstadisticas(): Promise<Estadisticas> {
  return request('/estadisticas')
}

export function validateQr(qrHash: string, scannerNombre: string): Promise<{ valido: boolean; motivo?: string; espectador?: Espectador; primer_ingreso?: { scanner: string; timestamp: string } }> {
  return request('/validar', {
    method: 'POST',
    body: JSON.stringify({ qr_hash: qrHash, scanner_nombre: scannerNombre }),
  })
}

export function getQrImageUrl(id: number): string {
  return `${API_BASE}/espectadores/${id}/qr`
}

export function downloadPlantilla(): void {
  const token = getToken()
  if (!token) return
  fetch(`${API_BASE}/espectadores/plantilla`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla-espectadores.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    })
}

export function deleteAllEspectadores(): Promise<{ deleted: number }> {
  return request('/espectadores', {
    method: 'DELETE',
  })
}

export function changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  return request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function getUsuarios(): Promise<{ id: number; email: string; rol: string }[]> {
  return request('/auth/usuarios')
}

export function createUsuario(email: string, password: string, rol: string): Promise<{ id: number; email: string; rol: string }> {
  return request('/auth/usuarios', {
    method: 'POST',
    body: JSON.stringify({ email, password, rol }),
  })
}

export function deleteUsuario(id: number): Promise<{ deleted: boolean }> {
  return request(`/auth/usuarios/${id}`, {
    method: 'DELETE',
  })
}

export function sendEmail(id: number): Promise<{ sent: boolean }> {
  return request(`/espectadores/${id}/email`, {
    method: 'POST',
  })
}
