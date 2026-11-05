/** Reportes y tablero administrativo (HU-15, HU-24, HU-36). */

export type TipoReporte =
  | 'resumen'
  | 'ocupacion'
  | 'actividad'
  | 'no-shows'
  | 'picos'
  | 'auditoria';

export type FormatoReporte = 'pdf' | 'csv';

export interface PeriodoReporte {
  desde?: string;
  hasta?: string;
}

export interface ResumenDia {
  fecha: string;
  dia: string;
  reservas: number;
  cancelaciones: number;
  no_shows: number;
  tasa_ocupacion: number;
}

export interface OcupacionEspacio {
  espacio_id: number;
  espacio: string;
  tipo: string;
  reservas: number;
  horas_reservadas: number;
  horas_disponibles: number;
  tasa_ocupacion: number;
}

export interface ActividadUsuario {
  usuario_id: number;
  nombre: string;
  email: string;
  rol: string;
  reservas: number;
  cancelaciones: number;
  no_shows: number;
}

export interface NoShow {
  reserva_id: number;
  fecha: string;
  inicio: string;
  fin: string;
  espacio: string;
  usuario: string;
  estado: string;
}

export interface FranjaDemanda {
  franja: string;
  reservas: number;
}

export interface DiaDemanda {
  dia: string;
  reservas: number;
}

export interface PicosDemanda {
  por_dia: DiaDemanda[];
  por_franja: FranjaDemanda[];
}

export interface Auditoria {
  fecha: string;
  usuario: string;
  origen: string;
  accion: string;
  entidad: string;
  detalle: string | null;
}

export interface ProximaReserva {
  id: number;
  espacio: string;
  usuario: string;
  inicio: string;
  fin: string;
  estado: string;
}

export interface TopEspacio {
  espacio: string;
  reservas: number;
}

export interface DashboardAdmin {
  reservas_hoy: number;
  pendientes: number;
  no_shows_mes: number;
  ocupacion_hoy: number;
  usuarios_activos: number;
  espacios_activos: number;
  recursos_pendientes: number;
  proximas_reservas: ProximaReserva[];
  serie_semanal: ResumenDia[];
  top_espacios: TopEspacio[];
}
