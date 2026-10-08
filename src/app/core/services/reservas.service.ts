import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { ReservaDetalle, ReservaResumen } from '../../shared/models/solicitud.model';

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly http = inject(HttpClient);

  consultarMias(): Observable<ReservaResumen[]> {
    return this.http.get<ReservaResumen[]>(`${API_BASE_URL}/reservas/mias`);
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
