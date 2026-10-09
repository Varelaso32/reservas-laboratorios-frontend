import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, expand, reduce } from 'rxjs';
import type { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type {
  ActualizarUsuarioRequest,
  CambiarEstadoUsuarioRequest,
  CrearUsuarioRequest,
  FiltrosUsuarios,
  ListaUsuariosResponse,
  UsuarioAdmin
} from '../models/usuarios.model';

const USUARIOS_URL = `${API_BASE_URL}/usuarios/`;
const TAMANO_PAGINA_COMPLETA = 100;

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  listar(filtros: FiltrosUsuarios): Observable<ListaUsuariosResponse> {
    let params = new HttpParams()
      .set('skip', filtros.skip)
      .set('limit', filtros.limit);

    if (filtros.rol) {
      params = params.set('rol', filtros.rol);
    }
    if (filtros.activo !== undefined) {
      params = params.set('activo', filtros.activo);
    }

    return this.http.get<ListaUsuariosResponse>(USUARIOS_URL, { params });
  }

  listarTodas(rol?: FiltrosUsuarios['rol']): Observable<UsuarioAdmin[]> {
    const filtros: FiltrosUsuarios = {
      skip: 0,
      limit: TAMANO_PAGINA_COMPLETA,
      ...(rol ? { rol } : {})
    };

    return this.listar(filtros).pipe(
      expand(respuesta => {
        const siguienteSkip = respuesta.skip + respuesta.items.length;
        return respuesta.items.length === 0 || siguienteSkip >= respuesta.total
          ? EMPTY
          : this.listar({ ...filtros, skip: siguienteSkip });
      }),
      reduce((usuarios, respuesta) => usuarios.concat(respuesta.items), [] as UsuarioAdmin[])
    );
  }

  obtenerPorId(id: number): Observable<UsuarioAdmin> {
    return this.http.get<UsuarioAdmin>(`${USUARIOS_URL}${id}`);
  }

  crear(request: CrearUsuarioRequest): Observable<UsuarioAdmin> {
    return this.http.post<UsuarioAdmin>(USUARIOS_URL, request);
  }

  actualizar(id: number, request: ActualizarUsuarioRequest): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${USUARIOS_URL}${id}`, request);
  }

  cambiarEstado(id: number, request: CambiarEstadoUsuarioRequest): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${USUARIOS_URL}${id}/estado`, request);
  }
}
