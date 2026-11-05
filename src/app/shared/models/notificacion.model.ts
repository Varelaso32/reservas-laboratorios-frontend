import { EstadoSolicitud, SolicitudCreada } from './solicitud.model';
import { RolReserva } from '../../core/models/auth.models';
import { TipoEspacio } from './espacio.model';

export type TipoNotificacion =
  | 'CESION_SOLICITADA'
  | 'CESION_ACEPTADA'
  | 'CESION_RECHAZADA'
  | 'CESION_CONFIRMADA'
  | 'SOLICITUD_RECIBIDA'
  | 'SOLICITUD_PENDIENTE'
  | 'SOLICITUD_APROBADA'
  | 'SOLICITUD_RECHAZADA'
  | 'SOLICITUD_POR_AUTORIZAR'
  | 'AUTORIZACION_CONCEDIDA'
  | 'AUTORIZACION_DENEGADA'
  | 'RECURSO_SOLICITADO'
  | 'RECURSO_APROBADO'
  | 'RECURSO_RECHAZADO'
  | 'RECURSO_CANCELADO'
  | 'RECURSO_DEVOLUCION_TARDIA';

/** Datos de la solicitud que originó el aviso. */
export interface SolicitudDetalle {
  solicitud_id: number;
  estado: EstadoSolicitud;
  espacio_id: number;
  espacio: string;
  tipo_espacio: TipoEspacio;
  fecha: string;
  inicio: string;
  fin: string;
  motivo_urgencia: string | null;
  motivo_rechazo: string | null;
  solicitante: string;
  rol_solicitante: RolReserva;
}

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  solicitud_id: number | null;
  leida: boolean;
  creada_en: string;
  detalle: SolicitudDetalle | null;
}

export interface NotificacionesResumen {
  no_leidas: number;
}

export interface NotificacionesLeidas {
  actualizadas: number;
}

export interface DecisionCesion {
  aprobar: boolean;
  motivo?: string | null;
}

export interface RespuestaCesion {
  mensaje: string;
  solicitud: SolicitudCreada;
}
