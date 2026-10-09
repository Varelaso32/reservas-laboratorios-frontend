export type Rol = 'SOLICITANTE' | 'APROBADOR' | 'ADMIN';

export type Cargo =
  | 'ESTUDIANTE'
  | 'DOCENTE'
  | 'ADMINISTRATIVO'
  | 'COORDINADOR_LABORATORIOS'
  | 'ADMINISTRADOR_SALA'
  | 'ADMINISTRADOR_SISTEMA';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  cargo: Cargo | null;
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
