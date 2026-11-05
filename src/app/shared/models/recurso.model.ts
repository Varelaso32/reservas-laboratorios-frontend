/** Recursos tecnológicos asociados a una reserva (HU-43 a HU-46). */

export type EstadoRecurso = 'EN_FUNCIONAMIENTO' | 'FALLIDO';

export type EstadoSolicitudRecurso =
  | 'PENDIENTE'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'DEVUELTA';

export type EstadoAsignacion = 'ASIGNADA' | 'ENTREGADA' | 'DEVUELTA' | 'CANCELADA';

/** Tipo de recurso con su stock global (HU-43). */
export interface TipoRecurso {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  total: number;
  instalados: number;
  disponibles: number;
  prestados: number;
  reservados: number;
  fallidos: number;
}

export interface TipoRecursoCrear {
  nombre: string;
  descripcion?: string | null;
  /** Cuántas unidades se crean con etiqueta automática. */
  cantidad?: number;
}

export interface TipoRecursoActualizar {
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
  /** Total deseado: al subir crea unidades, al bajar retira solo las libres. */
  cantidad?: number;
}

/** Recurso del catálogo visto como amenidad de un espacio (HU-19 / HU-43). */
export interface Amenidad {
  tipo_recurso_id: number;
  nombre: string;
  descripcion: string | null;
  total: number;
  instalados: number;
  disponibles: number;
  instalado_aqui: boolean;
}

/** Stock por tipo en un contexto (global o el horario de una reserva). */
export interface StockTipo {
  tipo_recurso_id: number;
  tipo: string;
  total: number;
  instalados: number;
  disponibles: number;
  prestados: number;
  reservados: number;
  fallidos: number;
}

/** Unidad física del inventario (HU-43). */
export interface Recurso {
  id: number;
  tipo_recurso_id: number;
  tipo: string;
  codigo: string;
  descripcion: string | null;
  estado: EstadoRecurso;
  comentario_estado: string | null;
  espacio_id: number | null;
  espacio: string | null;
  activo: boolean;
  actualizado_en: string | null;
}

export interface RecursoCrear {
  tipo_recurso_id: number;
  codigo: string;
  descripcion?: string | null;
  espacio_id?: number | null;
}

export interface RecursoActualizar {
  tipo_recurso_id?: number;
  codigo?: string;
  descripcion?: string | null;
  espacio_id?: number | null;
  activo?: boolean;
}

export interface RecursoEstadoCambio {
  estado: EstadoRecurso;
  comentario: string;
}

/** Disponibilidad de recursos en el horario de una reserva (HU-44). */
export interface DisponibilidadRecursos {
  reserva_id: number;
  espacio: string;
  inicio: string;
  fin: string;
  tipos: StockTipo[];
}

/** Reserva propia a la que se pueden asociar recursos (HU-44). */
export interface ReservaElegibleRecursos {
  reserva_id: number;
  espacio_id: number;
  espacio: string;
  inicio: string;
  fin: string;
}

export interface DetalleSolicitudRecurso {
  tipo_recurso_id: number;
  tipo: string;
  cantidad: number;
  asignados: number;
}

export interface AsignacionRecurso {
  id: number;
  recurso_id: number;
  codigo: string;
  tipo: string;
  estado: EstadoAsignacion;
  entregada_en: string | null;
  devuelta_en: string | null;
  estado_devolucion: EstadoRecurso | null;
  comentario_devolucion: string | null;
  strikes_generados: number;
}

export interface SolicitudRecurso {
  id: number;
  reserva_id: number;
  espacio_id: number;
  espacio: string;
  inicio: string;
  fin: string;
  solicitante_id: number;
  solicitante: string;
  estado: EstadoSolicitudRecurso;
  observacion: string | null;
  motivo_rechazo: string | null;
  creada_en: string;
  decidida_por: string | null;
  fecha_decision: string | null;
  detalle: DetalleSolicitudRecurso[];
  asignaciones: AsignacionRecurso[];
}

export interface DetalleSolicitudRecursoCrear {
  tipo_recurso_id: number;
  cantidad: number;
}

export interface SolicitudRecursoCrear {
  reserva_id: number;
  detalle: DetalleSolicitudRecursoCrear[];
  observacion?: string | null;
}

export interface DecisionSolicitudRecurso {
  aprobar: boolean;
  motivo?: string | null;
}

export interface DevolucionRecurso {
  estado: EstadoRecurso;
  comentario?: string | null;
}

/** Préstamo de una unidad concreta (HU-46). */
export interface PrestamoRecurso {
  id: number;
  solicitud_recurso_id: number;
  reserva_id: number;
  recurso_id: number;
  codigo: string;
  tipo: string;
  solicitante: string;
  inicio: string;
  fin: string;
  estado: EstadoAsignacion;
  entregada_en: string | null;
  devuelta_en: string | null;
  estado_devolucion: EstadoRecurso | null;
  comentario_devolucion: string | null;
  strikes_generados: number;
}

export interface ProcesarRetrasos {
  notificados: number;
  strikes: number;
}
