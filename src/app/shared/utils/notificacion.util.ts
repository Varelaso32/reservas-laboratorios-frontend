import { Notificacion } from '../models/notificacion.model';

/** Avisos que informan el resultado de una solicitud y muestran su estado. */
export const TIPOS_CON_ESTADO = new Set<string>([
  'SOLICITUD_RECIBIDA',
  'SOLICITUD_APROBADA',
  'SOLICITUD_RECHAZADA',
  'AUTORIZACION_CONCEDIDA',
  'AUTORIZACION_DENEGADA',
  'CESION_ACEPTADA',
  'CESION_RECHAZADA',
  'CESION_CONFIRMADA',
  'RECURSO_APROBADO',
  'RECURSO_RECHAZADO',
  'RECURSO_CANCELADO'
]);

/** Avisos sobre los que todavía hay una decisión pendiente. */
export const TIPOS_ACCIONABLES = new Set<string>([
  'CESION_SOLICITADA',
  'SOLICITUD_PENDIENTE',
  'SOLICITUD_POR_AUTORIZAR',
  'RECURSO_SOLICITADO'
]);

const NOMBRES_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PENDIENTE_AUTORIZACION: 'Por autorizar',
  EN_ESPERA_CESION: 'En espera de cesión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada'
};

const NOMBRES_ROL: Record<string, string> = {
  ESTUDIANTE: 'Estudiante',
  DOCENTE: 'Docente',
  COORDINADOR: 'Coordinador',
  DIRECTOR: 'Director'
};

/** ¿El aviso lleva a revisar una solicitud (bandeja de aprobación, autorización o recursos)? */
export function puedeRevisar(notificacion: Notificacion): boolean {
  return (
    notificacion.tipo === 'SOLICITUD_PENDIENTE' ||
    notificacion.tipo === 'SOLICITUD_POR_AUTORIZAR' ||
    notificacion.tipo === 'RECURSO_SOLICITADO'
  );
}

/** Los avisos de recursos se atienden en el panel de recursos (HU-44 a HU-46). */
export function esAvisoDeRecursos(notificacion: Notificacion): boolean {
  return notificacion.tipo.startsWith('RECURSO_');
}

/** Los avisos de resultado muestran una píldora con el estado de la solicitud. */
export function muestraEstado(notificacion: Notificacion): boolean {
  return TIPOS_CON_ESTADO.has(notificacion.tipo);
}

export function esRechazo(notificacion: Notificacion): boolean {
  return (
    notificacion.tipo === 'SOLICITUD_RECHAZADA' ||
    notificacion.tipo === 'AUTORIZACION_DENEGADA' ||
    notificacion.tipo === 'CESION_RECHAZADA' ||
    notificacion.tipo === 'RECURSO_RECHAZADO' ||
    notificacion.detalle?.estado === 'RECHAZADA'
  );
}

/** Quién pide solo se muestra al revisor y al titular del cupo, no al propio solicitante. */
export function muestraSolicitante(notificacion: Notificacion): boolean {
  return puedeRevisar(notificacion) || notificacion.tipo === 'CESION_SOLICITADA';
}

/** Una cesión pendiente se puede aceptar o rechazar desde la campana o el módulo. */
export function puedeDecidirCesion(notificacion: Notificacion): boolean {
  return (
    notificacion.tipo === 'CESION_SOLICITADA' &&
    notificacion.detalle?.estado === 'EN_ESPERA_CESION'
  );
}

export function estadoLegible(notificacion: Notificacion): string {
  const estado = notificacion.detalle?.estado;
  return estado ? NOMBRES_ESTADO[estado] ?? estado : '';
}

export function rolLegible(rol: string): string {
  return NOMBRES_ROL[rol] ?? rol;
}

export function fechaLegible(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(fecha);
}

export function horaNotificacionLegible(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(fecha);
}

export function horarioLegible(inicio: string, fin: string): string {
  return `${horaNotificacionLegible(inicio)} – ${horaNotificacionLegible(fin)}`;
}

/** Fecha y hora completas del aviso, para el historial del módulo. */
export function fechaHoraLegible(valor: string): string {
  return `${fechaLegible(valor)} · ${horaNotificacionLegible(valor)}`;
}
