import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  Notificacion,
  NotificacionesLeidas,
  NotificacionesResumen
} from '../../shared/models/notificacion.model';

/** Notificaciones internas del usuario (HU-31). */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);

  listar(soloNoLeidas = false, limite = 50): Observable<Notificacion[]> {
    let params = new HttpParams().set('limite', limite);
    if (soloNoLeidas) {
      params = params.set('solo_no_leidas', true);
    }
    return this.http.get<Notificacion[]>(`${API_BASE_URL}/notificaciones/`, { params });
  }

  resumen(): Observable<NotificacionesResumen> {
    return this.http.get<NotificacionesResumen>(`${API_BASE_URL}/notificaciones/resumen`);
  }

  marcarTodasLeidas(): Observable<NotificacionesLeidas> {
    return this.http.post<NotificacionesLeidas>(`${API_BASE_URL}/notificaciones/leidas`, null);
  }

  marcarLeida(notificacionId: number): Observable<Notificacion> {
    return this.http.post<Notificacion>(
      `${API_BASE_URL}/notificaciones/${notificacionId}/leida`,
      null
    );
  }
}
