export type TipoEspacio = 'LABORATORIO' | 'SALA';

export interface Espacio {
  id: number;
  nombre: string;
  tipo: TipoEspacio;
  capacidad: number;
  ubicacion: string | null;
}

export interface DisponibilidadEspacio {
  espacio_id: number;
  disponible: boolean;
  mensaje: string;
}