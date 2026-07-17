import { API_URL } from '../config';
import { getToken } from './storage';

class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiRequestError';
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    throw new ApiRequestError('Sesión expirada', 401);
  }

  if (!response.ok) {
    let message = 'Error en la solicitud';
    try {
      const errorData = await response.json();
      message = errorData.error || errorData.message || message;
    } catch {}
    throw new ApiRequestError(message, response.status);
  }

  return response.json();
}

export interface LoginResponse {
  token: string;
  user: { id: number; email: string; rol: string };
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export interface UltimoIngreso {
  id: number;
  nombreCompleto: string;
  silla: boolean;
  scanner_nombre: string;
  creado_en: string;
}

export interface EstadisticasResponse {
  total: number;
  ingresados: number;
  sillas_otorgadas: number;
  sillas_ocupadas: number;
  sillas_restantes: number;
  vendidos_en_puerta: number;
  faltantes: number;
  ocupacion_pct: number;
  ultimos_ingresos: UltimoIngreso[];
}

export function getEstadisticas(): Promise<EstadisticasResponse> {
  return apiFetch<EstadisticasResponse>('/estadisticas');
}

export interface CreateEspectadorData {
  nombreCompleto: string;
  email?: string;
  telefono?: string;
  silla: boolean;
  alumnaInvitada?: string | null;
  vendidoEnPuerta?: boolean;
}

export interface CreateEspectadorResponse {
  id: number;
  nombreCompleto: string;
  qrHash: string;
}

export function createEspectador(
  data: CreateEspectadorData
): Promise<CreateEspectadorResponse> {
  return apiFetch<CreateEspectadorResponse>('/espectadores', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface EspectadorData {
  nombreCompleto: string;
  silla: boolean;
  alumnaInvitada?: string | null;
}

export interface PrimerIngreso {
  scanner: string;
  timestamp: string;
}

export interface ValidarQrResponse {
  valido: boolean;
  motivo?: string;
  espectador?: EspectadorData;
  primer_ingreso?: PrimerIngreso;
}

export function validarQr(
  qrHash: string,
  scannerNombre: string
): Promise<ValidarQrResponse> {
  return apiFetch<ValidarQrResponse>('/validar', {
    method: 'POST',
    body: JSON.stringify({
      qr_hash: qrHash,
      scanner_nombre: scannerNombre,
    }),
  });
}

export interface SalidaResponse {
  valido: boolean;
  motivo?: string;
  espectador?: EspectadorData;
}

export function marcarSalida(
  qrHash: string,
  scannerNombre: string
): Promise<SalidaResponse> {
  return apiFetch<SalidaResponse>('/salida', {
    method: 'POST',
    body: JSON.stringify({
      qr_hash: qrHash,
      scanner_nombre: scannerNombre,
    }),
  });
}

export interface EspectadorListado {
  id: number;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  silla: boolean;
  alumnaInvitada: string | null;
  ingresado: boolean;
  qrHash: string;
}

export interface EspectadoresResponse {
  data: EspectadorListado[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getEspectadores(params: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<EspectadoresResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  return apiFetch<EspectadoresResponse>(`/espectadores?${query}`);
}

export interface SendEmailResponse {
  sent: boolean;
}

export function sendEmail(id: number): Promise<SendEmailResponse> {
  return apiFetch<SendEmailResponse>(`/espectadores/${id}/email`, {
    method: 'POST',
  });
}

export function getQrImageUrl(id: number): string {
  return ''; // Dynamic, use testConnection for full URL
}

export { ApiRequestError };
