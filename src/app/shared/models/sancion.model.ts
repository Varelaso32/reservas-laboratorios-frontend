/** Contratos de asistencia, strikes y reactivación (HU-38 a HU-42). */

export type EstadoReactivacion = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';
export type AccionNivelSancion = 'ADVERTENCIA' | 'BLOQUEO';

export interface AccionNivel {
  nivel: number;
  accion: AccionNivelSancion;
}

export interface ParametroSancion {
  tolerancia_minutos: number;
  aviso_minutos: number;
  minutos_por_strike: number;
  max_strikes: number;
  acciones: AccionNivel[];
  actualizado_en: string | null;
}

export interface ParametroSancionActualizar {
  tolerancia_minutos: number;
  aviso_minutos: number;
  minutos_por_strike: number;
  max_strikes: number;
  acciones: AccionNivel[];
}

export interface Strike {
  id: number;
  reserva_id: number;
  espacio: string;
  inicio: string | null;
  minutos_retraso: number;
  anulado: boolean;
  motivo_anulacion: string | null;
  creada_en: string;
}

export interface Reactivacion {
  id: number;
  usuario_id: number;
  usuario: string;
  estado: EstadoReactivacion;
  justificacion: string;
  detalle: { strike_id: number; justificacion: string }[];
  strikes_anulados: number;
  creada_en: string;
  decidida_por: string | null;
  fecha_decision: string | null;
  motivo_rechazo: string | null;
}

export interface JustificacionStrike {
  strike_id: number;
  justificacion: string;
}

export interface ReactivacionCrear {
  justificacion: string;
  strikes: JustificacionStrike[];
}

export interface ReactivacionDecision {
  aprobar: boolean;
  strikes_anular?: number[];
  motivo?: string | null;
}

export interface MiEstadoSancion {
  bloqueado: boolean;
  strikes_activos: number;
  max_strikes: number;
  tolerancia_minutos: number;
  aviso_minutos: number;
  strikes: Strike[];
  reactivacion: Reactivacion | null;
}

export interface UsuarioSancionado {
  usuario_id: number;
  nombre: string;
  email: string;
  rol: string;
  cargo: string | null;
  strikes_activos: number;
  bloqueado: boolean;
  strikes: Strike[];
  reactivacion: Reactivacion | null;
}

export interface ReporteSanciones {
  total_usuarios: number;
  total_bloqueados: number;
  usuarios: UsuarioSancionado[];
  reactivaciones_pendientes: Reactivacion[];
}

export interface Asistencia {
  reserva_id: number;
  estado: string;
  estado_asistencia: string;
  inicio_efectivo: string | null;
  mensaje: string;
}
