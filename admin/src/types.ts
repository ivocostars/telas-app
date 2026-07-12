export interface Espectador {
  id: number
  nombre: string
  apellido: string
  dni: string
  email: string | null
  telefono: string | null
  silla: boolean
  alumnaInvitada: string | null
  vendidoEnPuerta: boolean
  qrHash: string
  ingresado: boolean
  ingresadoEn: string | null
  creadoEn: string
}

export interface EspectadorInput {
  nombre: string
  apellido: string
  dni: string
  email?: string
  telefono?: string
  silla?: boolean
  alumnaInvitada?: string | null
  vendidoEnPuerta?: boolean
}

export interface UltimoIngreso {
  id: number
  nombre: string
  apellido: string
  dni: string
  silla: boolean
  scanner_nombre: string
  creado_en: string
}

export interface Estadisticas {
  total: number
  ingresados: number
  sillas_otorgadas: number
  faltantes: number
  ocupacion_pct: number
  ultimos_ingresos: UltimoIngreso[]
}

export interface EspectadoresResponse {
  data: Espectador[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BulkImportResult {
  created: number
  errors: { row: number; reason: string }[]
}
