import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { SolicitudCrear, SolicitudCreada } from '../../shared/models/solicitud.model';

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly http = inject(HttpClient);

  crearSolicitud(solicitud: SolicitudCrear): Observable<SolicitudCreada> {
    return this.http.post<SolicitudCreada>(`${API_BASE_URL}/solicitudes/`, solicitud);
  }
}