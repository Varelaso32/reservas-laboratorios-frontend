import type { Cargo, Rol } from './auth.models';

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  cargo: Cargo | null;
  activo: boolean;
  reservas_mes: number;
}

export interface ListaUsuariosResponse {
  total: number;
  skip: number;
  limit: number;
  items: UsuarioAdmin[];
}

export interface FiltrosUsuarios {
  skip: number;
  limit: number;
  rol?: Rol;
  activo?: boolean;
}

export interface CrearUsuarioRequest {
  nombre: string;
  email: string;
  clave: string;
  rol: Rol;
  cargo?: Cargo | null;
}

export interface ActualizarUsuarioRequest {
  nombre?: string;
  email?: string;
  rol?: Rol;
  cargo?: Cargo | null;
}

export interface CambiarEstadoUsuarioRequest {
  activo: boolean;
}

/** Respuesta de PATCH /usuarios/mi-cuenta (UsuarioDetalleOut del backend). */
export interface UsuarioDetalle {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  cargo: Cargo | null;
  activo: boolean;
  puede_autorizar_especial: boolean;
  creado_en: string;
}

export interface ActualizarMiCuentaRequest {
  nombre?: string;
  email?: string;
}

export interface CambiarMiClaveRequest {
  clave_actual: string;
  clave_nueva: string;
}

export interface ResultadoCambio {
  mensaje: string;
}
