import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  DisponibilidadEspacio,
  Espacio,
  TipoEspacio
} from '../../shared/models/espacio.model';

@Injectable({ providedIn: 'root' })
export class EspaciosService {
  private readonly http = inject(HttpClient);

  listar(tipo?: TipoEspacio): Observable<Espacio[]> {
    let params = new HttpParams();
    if (tipo) {
      params = params.set('tipo', tipo);
    }

    return this.http.get<Espacio[]>(`${API_BASE_URL}/espacios/`, { params });
  }

  consultarDisponibilidad(
    espacioId: number,
    fecha: string,
    horaInicio: string,
    horaFin: string
  ): Observable<DisponibilidadEspacio> {
    const params = new HttpParams()
      .set('fecha', fecha)
      .set('hora_inicio', horaInicio)
      .set('hora_fin', horaFin);

    return this.http.get<DisponibilidadEspacio>(
      `${API_BASE_URL}/espacios/${espacioId}/disponibilidad`,
      { params }
    );
  }
}