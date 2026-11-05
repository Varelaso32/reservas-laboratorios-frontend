import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  ActividadUsuario,
  Auditoria,
  DashboardAdmin,
  FormatoReporte,
  NoShow,
  OcupacionEspacio,
  PeriodoReporte,
  PicosDemanda,
  ResumenDia,
  TipoReporte
} from '../../shared/models/reporte.model';

/** Reportes analíticos y tablero del administrador (HU-15, HU-24, HU-36). */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/reportes`;

  private params(periodo: PeriodoReporte): HttpParams {
    let params = new HttpParams();
    if (periodo.desde) {
      params = params.set('desde', periodo.desde);
    }
    if (periodo.hasta) {
      params = params.set('hasta', periodo.hasta);
    }
    return params;
  }

  dashboard(): Observable<DashboardAdmin> {
    return this.http.get<DashboardAdmin>(`${this.base}/dashboard`);
  }

  resumen(periodo: PeriodoReporte = {}): Observable<ResumenDia[]> {
    return this.http.get<ResumenDia[]>(`${this.base}/resumen`, { params: this.params(periodo) });
  }

  ocupacion(periodo: PeriodoReporte = {}): Observable<OcupacionEspacio[]> {
    return this.http.get<OcupacionEspacio[]>(`${this.base}/ocupacion`, {
      params: this.params(periodo)
    });
  }

  actividad(periodo: PeriodoReporte = {}): Observable<ActividadUsuario[]> {
    return this.http.get<ActividadUsuario[]>(`${this.base}/actividad`, {
      params: this.params(periodo)
    });
  }

  noShows(periodo: PeriodoReporte = {}): Observable<NoShow[]> {
    return this.http.get<NoShow[]>(`${this.base}/no-shows`, { params: this.params(periodo) });
  }

  picos(periodo: PeriodoReporte = {}): Observable<PicosDemanda> {
    return this.http.get<PicosDemanda>(`${this.base}/picos`, { params: this.params(periodo) });
  }

  auditoria(periodo: PeriodoReporte = {}): Observable<Auditoria[]> {
    return this.http.get<Auditoria[]>(`${this.base}/auditoria`, { params: this.params(periodo) });
  }

  /** Descarga el reporte con el formato pedido. */
  exportar(
    tipo: TipoReporte,
    formato: FormatoReporte,
    periodo: PeriodoReporte = {}
  ): Observable<Blob> {
    const params = this.params(periodo).set('formato', formato);
    return this.http.get(`${this.base}/${tipo}/export`, {
      params,
      responseType: 'blob'
    });
  }

  /** Nombre del archivo con la misma convención que usa el backend. */
  nombreArchivo(tipo: TipoReporte, formato: FormatoReporte, generado = new Date()): string {
    const dos = (valor: number) => String(valor).padStart(2, '0');
    const marca = `${generado.getFullYear()}${dos(generado.getMonth() + 1)}${dos(generado.getDate())}-${dos(generado.getHours())}${dos(generado.getMinutes())}`;
    return `reporte-${tipo}-${marca}.${formato}`;
  }
}
