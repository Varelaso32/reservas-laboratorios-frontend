import { Cargo } from '../../core/models/auth.models';
import { TipoEspacio } from './espacio.model';

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA';
export type EstadoReserva = 'ACTIVA' | 'CANCELADA';

export interface SolicitanteResumen {
  id: number;
  nombre: string;
  email: string;
  cargo: Cargo | null;
}

export interface EspacioResumen {
  id: number;
  nombre: string;
  tipo: TipoEspacio;
  capacidad: number;
  ubicacion: string | null;
}

export interface SolicitudPendiente {
  id: number;
  estado: EstadoSolicitud;
  solicitante: SolicitanteResumen;
  espacio: EspacioResumen;
  inicio: string;
  fin: string;
  asistentes: number;
  creada_en: string;
  vencida: boolean;
}

export interface SolicitudDetalle {
  id: number;
  estado: EstadoSolicitud;
  solicitante: SolicitanteResumen;
  espacio: EspacioResumen;
  inicio: string;
  fin: string;
  asistentes: number;
  creada_en: string;
  vencida: boolean;
  proposito: string;
  equipamiento: string | null;
  motivo_rechazo: string | null;
  decidido_por: string | null;
  fecha_decision: string | null;
}

export interface EstadoDetalleSolicitud {
  detalle: SolicitudDetalle | null;
  cargando: boolean;
  error: string | null;
}

export interface ReservaGenerada {
  id: number;
  solicitud_id: number;
  espacio_id: number;
  espacio_nombre: string;
  inicio: string;
  fin: string;
  estado: EstadoReserva;
}

export interface AprobacionSolicitud {
  mensaje: string;
  solicitud: SolicitudDetalle;
  reserva: ReservaGenerada;
}

export interface SolicitudCrear {
  espacio_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  proposito: string;
  asistentes: number;
  equipamiento?: string | null;
}

export interface SolicitudCreada {
  id: number;
  espacio_id: number;
  espacio_nombre: string;
  inicio: string;
  fin: string;
  proposito: string;
  asistentes: number;
  equipamiento: string | null;
  estado: EstadoSolicitud;
  motivo_rechazo: string | null;
  fecha_decision: string | null;
  creada_en: string;
  mensaje: string;
}