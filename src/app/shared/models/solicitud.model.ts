export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA';

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