import { Cargo } from '../../core/models/auth.models';
import { TipoEspacio } from './espacio.model';

/** Nivel de reserva del usuario (HU-30, HU-32, HU-37). Se deriva del cargo. */
export type RolReserva = 'ESTUDIANTE' | 'DOCENTE' | 'COORDINADOR' | 'DIRECTOR';

export interface TipoUso {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface TipoUsoCrear {
  nombre: string;
}

export interface TipoUsoActualizar {
  nombre?: string;
  activo?: boolean;
}

export interface ReglasEspacio {
  espacio_id: number;
  nombre: string;
  tipo: TipoEspacio;
  capacidad: number;
  activo: boolean;
  hora_apertura: string | null;
  hora_cierre: string | null;
  dias_operacion: number[];
  max_usos_dia: number | null;
  duracion_maxima_min: number | null;
  separacion_min: number;
  ocupacion_minima: number | null;
  requiere_responsable: boolean;
  admite_autorizacion_especial: boolean;
  tipos_uso: TipoUso[];
}

export interface ReglasEspacioActualizar {
  hora_apertura?: string | null;
  hora_cierre?: string | null;
  dias_operacion?: number[];
  max_usos_dia?: number | null;
  duracion_maxima_min?: number | null;
  separacion_min?: number;
  ocupacion_minima?: number | null;
  requiere_responsable?: boolean;
  admite_autorizacion_especial?: boolean;
  tipos_uso_ids?: number[];
}

export interface ReglasPorTipoIn {
  tipo: TipoEspacio;
  reglas: ReglasEspacioActualizar;
}

export interface AnticipacionRol {
  rol: RolReserva;
  dias_maximos: number | null;
}

export interface Responsable {
  id: number;
  nombre: string;
  cargo: Cargo | null;
  rol_reserva: RolReserva;
}

export interface RegistroConfiguracion {
  id: number;
  entidad: string;
  espacio_id: number | null;
  usuario: string;
  detalle: string;
  fecha: string;
}

export interface SolicitanteAutorizacion {
  id: number;
  nombre: string;
  email: string;
  cargo: Cargo | null;
  rol_reserva: RolReserva;
}

export interface EspacioAutorizacion {
  id: number;
  nombre: string;
  tipo: TipoEspacio;
  capacidad: number;
  ubicacion: string | null;
}

/** Solicitud fuera de la franja de operación que espera autorización especial (HU-35). */
export interface SolicitudAutorizacion {
  id: number;
  estado: string;
  solicitante: SolicitanteAutorizacion;
  espacio: EspacioAutorizacion;
  fecha: string;
  inicio: string;
  fin: string;
  asistentes: number;
  proposito: string;
  motivo_urgencia: string | null;
  creada_en: string;
}

export interface DecisionAutorizacion {
  aprobar: boolean;
  motivo?: string | null;
}

export interface RespuestaAutorizacion {
  mensaje: string;
  solicitud: SolicitudAutorizacion;
}
