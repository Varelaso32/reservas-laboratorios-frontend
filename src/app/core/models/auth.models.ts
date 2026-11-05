export type Rol = 'SOLICITANTE' | 'APROBADOR' | 'ADMIN';

export type Cargo =
  | 'ESTUDIANTE'
  | 'DOCENTE'
  | 'ADMINISTRATIVO'
  | 'COORDINADOR_LABORATORIOS'
  | 'ADMINISTRADOR_SALA'
  | 'ADMINISTRADOR_SISTEMA';

/**
 * HU-30: jerarquía de reserva, de menor a mayor. Es distinta de `Rol`, que es el
 * permiso dentro de la plataforma.
 */
export type RolReserva = 'ESTUDIANTE' | 'DOCENTE' | 'COORDINADOR' | 'DIRECTOR';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  cargo: Cargo | null;
  /** HU-35: puede decidir solicitudes fuera de la franja de operación. */
  puede_autorizar_especial?: boolean;
}

export interface RespuestaLogin {
  access_token: string;
  token_type: 'bearer';
  expira_en: number;
  usuario: Usuario;
}

export interface RegistroCrear {
  nombre: string;
  email: string;
  clave: string;
}

export interface UsuarioDetalleOut {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  cargo: Cargo | null;
  activo: boolean;
  creado_en: string;
}
