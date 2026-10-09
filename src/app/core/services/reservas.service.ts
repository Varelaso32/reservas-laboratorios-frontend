import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { ReservaDetalle, ReservaResumen } from '../../shared/models/solicitud.model';

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly http = inject(HttpClient);

  consultarMias(incluirCanceladas = false): Observable<ReservaResumen[]> {
    let params = new HttpParams();
    if (incluirCanceladas) {
      params = params.set('incluir_canceladas', true);
    }
    return this.http.get<ReservaResumen[]>(`${API_BASE_URL}/reservas/mias`, { params });
  }

  consultarAgenda(filtros: {
    fecha?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    espacio_id?: number;
  } = {}): Observable<ReservaResumen[]> {
    let params = new HttpParams();
    if (filtros.fecha) {
      params = params.set('fecha', filtros.fecha);
    }
    if (filtros.fecha_inicio) {
      params = params.set('fecha_inicio', filtros.fecha_inicio);
    }
    if (filtros.fecha_fin) {
      params = params.set('fecha_fin', filtros.fecha_fin);
    }
    if (filtros.espacio_id !== undefined) {
      params = params.set('espacio_id', filtros.espacio_id);
    }
    return this.http.get<ReservaResumen[]>(`${API_BASE_URL}/reservas/`, { params });
  }

  obtenerDetalle(reservaId: number): Observable<ReservaDetalle> {
    return this.http.get<ReservaDetalle>(`${API_BASE_URL}/reservas/${reservaId}`);
  }

  cancelarReserva(reservaId: number): Observable<ReservaResumen> {
    return this.http.post<ReservaResumen>(
      `${API_BASE_URL}/reservas/${reservaId}/cancelar`,
      null
    );
  }
}
