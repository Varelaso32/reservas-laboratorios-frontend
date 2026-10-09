export type TipoEspacio = 'LABORATORIO' | 'SALA';

export interface Espacio {
  id: number;
  nombre: string;
  tipo: TipoEspacio;
  capacidad: number;
  ubicacion: string | null;
}

export interface EspacioAdmin extends Espacio {
  activo: boolean;
}

export interface EspacioMetrica extends EspacioAdmin {
  fecha: string;
  reservas_dia: number;
  minutos_reservados: number;
  minutos_disponibles: number;
  porcentaje_ocupacion: number | null;
}

export type EspacioActualizar = Partial<Pick<Espacio, 'nombre' | 'tipo' | 'capacidad' | 'ubicacion'>>;

export interface EspacioEstadoActualizar {
  activo: boolean;
}

export interface EspacioCrear {
  nombre: string;
  tipo: TipoEspacio;
  capacidad: number;
  ubicacion?: string | null;
}

export interface DisponibilidadEspacio {
  espacio_id: number;
  disponible: boolean;
  mensaje: string;
}