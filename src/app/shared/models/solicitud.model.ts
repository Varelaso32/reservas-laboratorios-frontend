import { Cargo } from '../../core/models/auth.models';
import { TipoEspacio } from './espacio.model';

export type EstadoSolicitud =
  | 'PENDIENTE'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'PENDIENTE_AUTORIZACION'
  | 'EN_ESPERA_CESION';
export type EstadoReserva = 'ACTIVA' | 'CANCELADA' | 'NO_ASISTIO';
export type EstadoAsistencia = 'PENDIENTE' | 'ASISTIO' | 'NO_ASISTIO';

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
  tipo_uso?: string | null;
  responsable?: string | null;
  fuera_de_franja?: boolean;
  creada_en: string;
  vencida: boolean;
  /** HU-12: nivel de prioridad (0 a 3) y su etiqueta ALTA/MEDIA/BAJA. */
  prioridad?: number;
  prioridad_etiqueta?: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface SolicitudDetalle {
  id: number;
  estado: EstadoSolicitud;
  solicitante: SolicitanteResumen;
  espacio: EspacioResumen;
  inicio: string;
  fin: string;
  asistentes: number;
  tipo_uso?: string | null;
  responsable?: string | null;
  fuera_de_franja?: boolean;
  creada_en: string;
  vencida: boolean;
  proposito: string;
  equipamiento: string | null;
  motivo_rechazo: string | null;
  decidido_por: string | null;
  fecha_decision: string | null;
  /** HU-12: prioridad de la solicitud. */
  prioridad?: number;
  prioridad_etiqueta?: 'ALTA' | 'MEDIA' | 'BAJA';
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

export interface ReservaResumen {
  id: number;
  estado: EstadoReserva;
  espacio: EspacioResumen;
  inicio: string;
  fin: string;
  solicitud_id: number;
  titular?: string;
  proposito?: string;
  asistentes?: number;
  /** HU-38 / HU-39: estado de asistencia y ventana de registro. */
  estado_asistencia?: EstadoAsistencia;
  inicio_efectivo?: string | null;
  tolerancia_hasta?: string | null;
  puede_registrar_asistencia?: boolean;
  /** HU-17: motivo registrado al cancelar. */
  motivo_cancelacion?: string | null;
}

export interface SolicitudResuelta {
  id: number;
  estado: 'APROBADA' | 'RECHAZADA';
  solicitante: SolicitanteResumen;
  espacio: EspacioResumen;
  inicio: string;
  fin: string;
  asistentes: number;
  decidida_por: string | null;
  fecha_decision: string | null;
  motivo_rechazo: string | null;
}

export interface ReservaDetalle {
  id: number;
  estado: EstadoReserva;
  espacio: EspacioResumen;
  inicio: string;
  fin: string;
  solicitud_id: number;
  finalizada: boolean;
  titular: string;
  proposito: string;
  asistentes: number;
  equipamiento: string | null;
  aprobada_por: string | null;
  fecha_aprobacion: string | null;
  creada_en: string;
  estado_asistencia?: EstadoAsistencia;
  inicio_efectivo?: string | null;
  tolerancia_hasta?: string | null;
  puede_registrar_asistencia?: boolean;
  motivo_cancelacion?: string | null;
}

export interface AprobacionSolicitud {
  mensaje: string;
  solicitud: SolicitudDetalle;
  reserva: ReservaGenerada;
}

export interface RechazoIn {
  motivo: string;
}

export interface RechazoSolicitud {
  mensaje: string;
  solicitud: SolicitudDetalle;
}

export interface SolicitudCrear {
  espacio_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  proposito: string;
  asistentes: number;
  equipamiento?: string | null;
  tipo_uso_id?: number | null;
  responsable_id?: number | null;
  /** HU-30: motivo obligatorio para pedir el cupo de alguien de menor jerarquía. */
  motivo_urgencia?: string | null;
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
  tipo_uso?: string | null;
  responsable?: string | null;
  fuera_de_franja?: boolean;
  motivo_urgencia?: string | null;
  /** HU-30: titular del cupo cuando hubo conflicto de jerarquía. */
  titular?: string | null;
  motivo_rechazo: string | null;
  fecha_decision: string | null;
  creada_en: string;
  mensaje: string;
  avisos?: string[];
}