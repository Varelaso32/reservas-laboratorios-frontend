import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  AprobacionSolicitud,
  RechazoIn,
  RechazoSolicitud,
  SolicitudCrear,
  SolicitudCreada,
  SolicitudDetalle,
  SolicitudPendiente,
  SolicitudResuelta
} from '../../shared/models/solicitud.model';

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly http = inject(HttpClient);

  crearSolicitud(solicitud: SolicitudCrear): Observable<SolicitudCreada> {
    return this.http.post<SolicitudCreada>(`${API_BASE_URL}/solicitudes/`, solicitud);
  }

  consultarPendientes(espacioId?: number): Observable<SolicitudPendiente[]> {
    let params = new HttpParams();
    if (espacioId !== undefined) {
      params = params.set('espacio_id', espacioId);
    }
    return this.http.get<SolicitudPendiente[]>(`${API_BASE_URL}/solicitudes/pendientes`, {
      params
    });
  }

  consultarResueltas(
    espacioId: number,
    filtros: { estado?: 'APROBADA' | 'RECHAZADA'; fecha_desde?: string; fecha_hasta?: string } = {}
  ): Observable<SolicitudResuelta[]> {
    let params = new HttpParams().set('espacio_id', espacioId);
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros.fecha_desde) {
      params = params.set('fecha_desde', filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      params = params.set('fecha_hasta', filtros.fecha_hasta);
    }

    return this.http.get<SolicitudResuelta[]>(`${API_BASE_URL}/solicitudes/resueltas`, { params });
  }

  obtenerDetalle(solicitudId: number): Observable<SolicitudDetalle> {
    return this.http.get<SolicitudDetalle>(`${API_BASE_URL}/solicitudes/${solicitudId}`);
  }

  aprobarSolicitud(solicitudId: number): Observable<AprobacionSolicitud> {
    return this.http.post<AprobacionSolicitud>(
      `${API_BASE_URL}/solicitudes/${solicitudId}/aprobar`,
      null
    );
  }

  rechazarSolicitud(solicitudId: number, motivo: string): Observable<RechazoSolicitud> {
    const body: RechazoIn = { motivo };
    return this.http.post<RechazoSolicitud>(
      `${API_BASE_URL}/solicitudes/${solicitudId}/rechazar`,
      body
    );
  }
}