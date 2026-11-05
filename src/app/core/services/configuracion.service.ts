import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  AnticipacionRol,
  ReglasEspacio,
  ReglasEspacioActualizar,
  ReglasPorTipoIn,
  RegistroConfiguracion,
  Responsable,
  TipoUso,
  TipoUsoActualizar,
  TipoUsoCrear
} from '../../shared/models/configuracion.model';
import { TipoEspacio } from '../../shared/models/espacio.model';

/** Configuración de reglas de reserva (HU-21, HU-22, HU-32, HU-36 y HU-37). */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly http = inject(HttpClient);

  listarTiposUso(incluirInactivos = false): Observable<TipoUso[]> {
    let params = new HttpParams();
    if (incluirInactivos) {
      params = params.set('incluir_inactivos', true);
    }
    return this.http.get<TipoUso[]>(`${API_BASE_URL}/configuracion/tipos-uso`, { params });
  }

  crearTipoUso(datos: TipoUsoCrear): Observable<TipoUso> {
    return this.http.post<TipoUso>(`${API_BASE_URL}/configuracion/tipos-uso`, datos);
  }

  actualizarTipoUso(tipoId: number, cambios: TipoUsoActualizar): Observable<TipoUso> {
    return this.http.patch<TipoUso>(
      `${API_BASE_URL}/configuracion/tipos-uso/${tipoId}`,
      cambios
    );
  }

  consultarReglas(espacioId: number): Observable<ReglasEspacio> {
    return this.http.get<ReglasEspacio>(
      `${API_BASE_URL}/configuracion/espacios/${espacioId}`
    );
  }

  actualizarReglas(
    espacioId: number,
    reglas: ReglasEspacioActualizar
  ): Observable<ReglasEspacio> {
    return this.http.put<ReglasEspacio>(
      `${API_BASE_URL}/configuracion/espacios/${espacioId}`,
      reglas
    );
  }

  aplicarPorTipo(tipo: TipoEspacio, reglas: ReglasEspacioActualizar): Observable<ReglasEspacio[]> {
    const cuerpo: ReglasPorTipoIn = { tipo, reglas };
    return this.http.put<ReglasEspacio[]>(
      `${API_BASE_URL}/configuracion/espacios/por-tipo`,
      cuerpo
    );
  }

  consultarHistorial(espacioId?: number, limite = 20): Observable<RegistroConfiguracion[]> {
    let params = new HttpParams().set('limite', limite);
    if (espacioId !== undefined) {
      params = params.set('espacio_id', espacioId);
    }
    return this.http.get<RegistroConfiguracion[]>(
      `${API_BASE_URL}/configuracion/historial`,
      { params }
    );
  }

  listarResponsables(): Observable<Responsable[]> {
    return this.http.get<Responsable[]>(`${API_BASE_URL}/configuracion/responsables`);
  }

  consultarAnticipacion(): Observable<AnticipacionRol[]> {
    return this.http.get<AnticipacionRol[]>(`${API_BASE_URL}/configuracion/anticipacion`);
  }

  actualizarAnticipacion(
    rol: string,
    diasMaximos: number | null
  ): Observable<AnticipacionRol> {
    return this.http.put<AnticipacionRol>(
      `${API_BASE_URL}/configuracion/anticipacion/${rol}`,
      { dias_maximos: diasMaximos }
    );
  }
}
