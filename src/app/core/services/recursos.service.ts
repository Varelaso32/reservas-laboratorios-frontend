import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  Amenidad,
  DecisionSolicitudRecurso,
  DevolucionRecurso,
  DisponibilidadRecursos,
  PrestamoRecurso,
  ProcesarRetrasos,
  Recurso,
  RecursoActualizar,
  RecursoCrear,
  RecursoEstadoCambio,
  ReservaElegibleRecursos,
  SolicitudRecurso,
  SolicitudRecursoCrear,
  StockTipo,
  TipoRecurso,
  TipoRecursoActualizar,
  TipoRecursoCrear
} from '../../shared/models/recurso.model';

/** Inventario, solicitudes, préstamos y devoluciones de recursos (HU-43 a HU-46). */
@Injectable({ providedIn: 'root' })
export class RecursosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/recursos`;

  listarTipos(soloActivos = false): Observable<TipoRecurso[]> {
    let params = new HttpParams();
    if (soloActivos) {
      params = params.set('solo_activos', true);
    }
    return this.http.get<TipoRecurso[]>(`${this.base}/tipos`, { params });
  }

  crearTipo(datos: TipoRecursoCrear): Observable<TipoRecurso> {
    return this.http.post<TipoRecurso>(`${this.base}/tipos`, datos);
  }

  actualizarTipo(tipoId: number, datos: TipoRecursoActualizar): Observable<TipoRecurso> {
    return this.http.patch<TipoRecurso>(`${this.base}/tipos/${tipoId}`, datos);
  }

  stock(): Observable<StockTipo[]> {
    return this.http.get<StockTipo[]>(`${this.base}/stock`);
  }

  /** Catálogo de recursos como amenidades, con las unidades que quedan libres. */
  listarAmenidades(espacioId?: number): Observable<Amenidad[]> {
    let params = new HttpParams();
    if (espacioId) {
      params = params.set('espacio_id', espacioId);
    }
    return this.http.get<Amenidad[]>(`${this.base}/amenidades`, { params });
  }

  listarInventario(tipoId?: number, soloActivos = false): Observable<Recurso[]> {
    let params = new HttpParams();
    if (tipoId) {
      params = params.set('tipo_recurso_id', tipoId);
    }
    if (soloActivos) {
      params = params.set('solo_activos', true);
    }
    return this.http.get<Recurso[]>(`${this.base}/inventario`, { params });
  }

  crearRecurso(datos: RecursoCrear): Observable<Recurso> {
    return this.http.post<Recurso>(`${this.base}/`, datos);
  }

  actualizarRecurso(recursoId: number, datos: RecursoActualizar): Observable<Recurso> {
    return this.http.patch<Recurso>(`${this.base}/${recursoId}`, datos);
  }

  cambiarEstadoRecurso(recursoId: number, datos: RecursoEstadoCambio): Observable<Recurso> {
    return this.http.patch<Recurso>(`${this.base}/${recursoId}/estado`, datos);
  }

  historialRecurso(recursoId: number): Observable<PrestamoRecurso[]> {
    return this.http.get<PrestamoRecurso[]>(`${this.base}/${recursoId}/historial`);
  }

  disponibilidad(reservaId: number): Observable<DisponibilidadRecursos> {
    const params = new HttpParams().set('reserva_id', reservaId);
    return this.http.get<DisponibilidadRecursos>(`${this.base}/disponibilidad`, { params });
  }

  reservasElegibles(): Observable<ReservaElegibleRecursos[]> {
    return this.http.get<ReservaElegibleRecursos[]>(`${this.base}/reservas-elegibles`);
  }

  solicitar(datos: SolicitudRecursoCrear): Observable<SolicitudRecurso> {
    return this.http.post<SolicitudRecurso>(`${this.base}/solicitudes`, datos);
  }

  misSolicitudes(): Observable<SolicitudRecurso[]> {
    return this.http.get<SolicitudRecurso[]>(`${this.base}/solicitudes/mias`);
  }

  listarSolicitudes(estado?: string): Observable<SolicitudRecurso[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<SolicitudRecurso[]>(`${this.base}/solicitudes`, { params });
  }

  decidirSolicitud(
    solicitudId: number,
    datos: DecisionSolicitudRecurso
  ): Observable<SolicitudRecurso> {
    return this.http.post<SolicitudRecurso>(
      `${this.base}/solicitudes/${solicitudId}/decision`,
      datos
    );
  }

  listarPrestamos(soloVigentes = false, estado?: string): Observable<PrestamoRecurso[]> {
    let params = new HttpParams();
    if (soloVigentes) {
      params = params.set('solo_vigentes', true);
    }
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<PrestamoRecurso[]>(`${this.base}/asignaciones`, { params });
  }

  registrarEntrega(asignacionId: number): Observable<SolicitudRecurso> {
    return this.http.post<SolicitudRecurso>(
      `${this.base}/asignaciones/${asignacionId}/entrega`,
      null
    );
  }

  registrarDevolucion(
    asignacionId: number,
    datos: DevolucionRecurso
  ): Observable<SolicitudRecurso> {
    return this.http.post<SolicitudRecurso>(
      `${this.base}/asignaciones/${asignacionId}/devolucion`,
      datos
    );
  }

  procesarRetrasos(): Observable<ProcesarRetrasos> {
    return this.http.post<ProcesarRetrasos>(`${this.base}/procesar-retrasos`, null);
  }
}
