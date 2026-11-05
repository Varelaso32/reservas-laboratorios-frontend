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
  amenidades: AmenidadEspacio[];
}

/** Recurso instalado de forma fija en un espacio (HU-19 / HU-43). */
export interface AmenidadEspacio {
  tipo_recurso_id: number;
  nombre: string;
}

export interface EspacioMetrica extends EspacioAdmin {
  fecha: string;
  reservas_dia: number;
  minutos_reservados: number;
  minutos_disponibles: number;
  porcentaje_ocupacion: number | null;
}

export type EspacioActualizar = Partial<Pick<Espacio, 'nombre' | 'tipo' | 'capacidad' | 'ubicacion'>> & {
  amenidades?: number[];
};

export interface EspacioEstadoActualizar {
  activo: boolean;
}

export interface EspacioCrear {
  nombre: string;
  tipo: TipoEspacio;
  capacidad: number;
  ubicacion?: string | null;
  amenidades?: number[];
}

export interface DisponibilidadEspacio {
  espacio_id: number;
  disponible: boolean;
  mensaje: string;
}