import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  MiEstadoSancion,
  ParametroSancion,
  ParametroSancionActualizar,
  Reactivacion,
  ReactivacionCrear,
  ReactivacionDecision,
  ReporteSanciones
} from '../../shared/models/sancion.model';

/** Strikes, sanciones y reactivación (HU-40, HU-41 y HU-42). */
@Injectable({ providedIn: 'root' })
export class SancionesService {
  private readonly http = inject(HttpClient);

  consultarMiEstado(): Observable<MiEstadoSancion> {
    return this.http.get<MiEstadoSancion>(`${API_BASE_URL}/sanciones/mi-estado`);
  }

  pedirReactivacion(datos: ReactivacionCrear): Observable<Reactivacion> {
    return this.http.post<Reactivacion>(`${API_BASE_URL}/sanciones/reactivacion`, datos);
  }

  consultarReporte(soloBloqueados = false): Observable<ReporteSanciones> {
    let params = new HttpParams();
    if (soloBloqueados) {
      params = params.set('solo_bloqueados', true);
    }
    return this.http.get<ReporteSanciones>(`${API_BASE_URL}/sanciones/reporte`, { params });
  }

  listarReactivaciones(estado?: string): Observable<Reactivacion[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<Reactivacion[]>(`${API_BASE_URL}/sanciones/reactivaciones`, { params });
  }

  decidirReactivacion(
    reactivacionId: number,
    datos: ReactivacionDecision
  ): Observable<Reactivacion> {
    return this.http.post<Reactivacion>(
      `${API_BASE_URL}/sanciones/reactivaciones/${reactivacionId}/decision`,
      datos
    );
  }

  procesarVencidas(): Observable<{ advertencias: number; no_shows: number }> {
    return this.http.post<{ advertencias: number; no_shows: number }>(
      `${API_BASE_URL}/sanciones/procesar`,
      null
    );
  }

  consultarParametros(): Observable<ParametroSancion> {
    return this.http.get<ParametroSancion>(`${API_BASE_URL}/configuracion/sanciones`);
  }

  actualizarParametros(datos: ParametroSancionActualizar): Observable<ParametroSancion> {
    return this.http.patch<ParametroSancion>(`${API_BASE_URL}/configuracion/sanciones`, datos);
  }
}
