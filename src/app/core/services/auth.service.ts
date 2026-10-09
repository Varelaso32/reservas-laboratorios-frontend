import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { RegistroCrear, RespuestaLogin, Rol, Usuario, UsuarioDetalleOut } from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'access_token';
const AUTHENTICATED_USER_KEY = 'usuario';
const ROLES_VALIDOS: Rol[] = ['SOLICITANTE', 'APROBADOR', 'ADMIN'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private token: string | null = null;
  private usuario: Usuario | null = null;

  constructor() {
    this.restaurarSesion();
  }

  registro(datos: RegistroCrear): Observable<UsuarioDetalleOut> {
    return this.http.post<UsuarioDetalleOut>(`${API_BASE_URL}/auth/registro`, datos);
  }

  login(email: string, password: string): Observable<RespuestaLogin> {
    const body = new URLSearchParams({ username: email, password }).toString();
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http
      .post<RespuestaLogin>(`${API_BASE_URL}/auth/login`, body, { headers })
      .pipe(tap(respuesta => this.guardarSesion(respuesta)));
  }

  logout(): void {
    this.token = null;
    this.usuario = null;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(AUTHENTICATED_USER_KEY);
  }

  obtenerTokenActual(): string | null {
    return this.token;
  }

  obtenerUsuarioActual(): Usuario | null {
    return this.usuario;
  }

  tieneSesionActiva(): boolean {
    return this.token !== null && this.usuario !== null;
  }

  consultarUsuarioActual(): Observable<Usuario> {
    return this.http.get<Usuario>(`${API_BASE_URL}/auth/me`).pipe(
      tap(usuario => {
        this.usuario = usuario;
        sessionStorage.setItem(AUTHENTICATED_USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  private guardarSesion(respuesta: RespuestaLogin): void {
    this.token = respuesta.access_token;
    this.usuario = respuesta.usuario;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, respuesta.access_token);
    sessionStorage.setItem(AUTHENTICATED_USER_KEY, JSON.stringify(respuesta.usuario));
  }

  private restaurarSesion(): void {
    const tokenGuardado = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const usuarioGuardado = sessionStorage.getItem(AUTHENTICATED_USER_KEY);

    if (!tokenGuardado || !usuarioGuardado) {
      this.logout();
      return;
    }

    try {
      const usuario = JSON.parse(usuarioGuardado) as Usuario;
      if (!this.esUsuario(usuario)) {
        this.logout();
        return;
      }

      this.token = tokenGuardado;
      this.usuario = usuario;
    } catch {
      this.logout();
    }
  }

  private esUsuario(valor: unknown): valor is Usuario {
    if (typeof valor !== 'object' || valor === null) {
      return false;
    }

    const usuario = valor as Record<string, unknown>;
    return (
      typeof usuario['id'] === 'number' &&
      typeof usuario['nombre'] === 'string' &&
      typeof usuario['email'] === 'string' &&
      typeof usuario['rol'] === 'string' &&
      ROLES_VALIDOS.includes(usuario['rol'] as Rol) &&
      (typeof usuario['cargo'] === 'string' || usuario['cargo'] === null)
    );
  }
}