import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api.config';
import { SancionesService } from './sanciones.service';

describe('SancionesService', () => {
  let service: SancionesService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SancionesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe consultar el estado de sanciones del usuario', () => {
    service.consultarMiEstado().subscribe(res => {
      expect(res.bloqueado).toBeFalse();
      expect(res.strikes_activos).toBe(0);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/sanciones/mi-estado`);
    expect(req.request.method).toBe('GET');
    req.flush({ bloqueado: false, strikes_activos: 0 });
  });

  it('debe pedir una reactivación con su justificación', () => {
    const datos = {
      justificacion: 'Tuve una emergencia',
      strikes: [{ strike_id: 4, justificacion: 'Cita médica' }]
    };
    service.pedirReactivacion(datos).subscribe();

    const req = httpTesting.expectOne(`${API_BASE_URL}/sanciones/reactivacion`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ id: 1 });
  });

  it('debe consultar el reporte con y sin filtro de bloqueados', () => {
    service.consultarReporte().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/sanciones/reporte`).flush({ usuarios: [] });

    service.consultarReporte(true).subscribe();
    const req = httpTesting.expectOne(`${API_BASE_URL}/sanciones/reporte?solo_bloqueados=true`);
    expect(req.request.method).toBe('GET');
    req.flush({ usuarios: [] });
  });

  it('debe listar las reactivaciones filtrando por estado', () => {
    service.listarReactivaciones().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/sanciones/reactivaciones`).flush([]);

    service.listarReactivaciones('PENDIENTE').subscribe();
    httpTesting
      .expectOne(`${API_BASE_URL}/sanciones/reactivaciones?estado=PENDIENTE`)
      .flush([]);
  });

  it('debe decidir una reactivación', () => {
    const datos = { aprobar: true, strikes_anular: [4, 5] };
    service.decidirReactivacion(3, datos).subscribe();

    const req = httpTesting.expectOne(`${API_BASE_URL}/sanciones/reactivaciones/3/decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ id: 3, estado: 'ACEPTADA' });
  });

  it('debe procesar las reservas vencidas', () => {
    service.procesarVencidas().subscribe(res => {
      expect(res).toEqual({ advertencias: 1, no_shows: 2 });
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/sanciones/procesar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ advertencias: 1, no_shows: 2 });
  });

  it('debe consultar y actualizar los parámetros de sanción', () => {
    service.consultarParametros().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/configuracion/sanciones`).flush({ max_strikes: 3 });

    const datos = {
      tolerancia_minutos: 10,
      aviso_minutos: 15,
      minutos_por_strike: 30,
      max_strikes: 3,
      acciones: [{ nivel: 1, accion: 'ADVERTENCIA' as const }]
    };
    service.actualizarParametros(datos).subscribe();
    const req = httpTesting.expectOne(`${API_BASE_URL}/configuracion/sanciones`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(datos);
    req.flush({ ...datos, actualizado_en: null });
  });
});
