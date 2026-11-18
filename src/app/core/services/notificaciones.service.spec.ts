import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api.config';
import { Notificacion } from '../../shared/models/notificacion.model';
import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let httpTesting: HttpTestingController;

  const aviso: Notificacion = {
    id: 7,
    tipo: 'CESION_SOLICITADA',
    titulo: 'Solicitud de cesión de cupo',
    mensaje: 'Usuario docente@reservas.test (Docente) solicita tu cupo',
    solicitud_id: 31,
    leida: false,
    creada_en: '2026-11-01T10:00:00-05:00',
    detalle: {
      solicitud_id: 31,
      estado: 'EN_ESPERA_CESION',
      espacio: 'Laboratorio de Redes',
      tipo_espacio: 'LABORATORIO',
      fecha: '2026-11-05',
      inicio: '2026-11-05T08:00:00-05:00',
      fin: '2026-11-05T10:00:00-05:00',
      motivo_urgencia: 'Sustentación',
      solicitante: 'Usuario docente@reservas.test',
      motivo_rechazo: null,
      espacio_id: 1,
      rol_solicitante: 'DOCENTE'
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(NotificacionesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('lista las notificaciones con GET /notificaciones/', () => {
    service.listar().subscribe(notificaciones => expect(notificaciones).toEqual([aviso]));

    const request = httpTesting.expectOne(
      req => req.url === `${API_BASE_URL}/notificaciones/`
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('limite')).toBe('50');
    request.flush([aviso]);
  });

  it('pide solo las no leídas cuando se solicita', () => {
    service.listar(true, 10).subscribe();

    const request = httpTesting.expectOne(
      req => req.url === `${API_BASE_URL}/notificaciones/`
    );
    expect(request.request.params.get('solo_no_leidas')).toBe('true');
    expect(request.request.params.get('limite')).toBe('10');
    request.flush([]);
  });

  it('consulta el contador de no leídas', () => {
    service.resumen().subscribe(resumen => expect(resumen.no_leidas).toBe(3));

    httpTesting
      .expectOne(`${API_BASE_URL}/notificaciones/resumen`)
      .flush({ no_leidas: 3 });
  });

  it('marca todas como leídas', () => {
    service.marcarTodasLeidas().subscribe(respuesta => expect(respuesta.actualizadas).toBe(2));

    const request = httpTesting.expectOne(`${API_BASE_URL}/notificaciones/leidas`);
    expect(request.request.method).toBe('POST');
    request.flush({ actualizadas: 2 });
  });

  it('marca una notificación como leída', () => {
    service.marcarLeida(7).subscribe(notificacion => expect(notificacion.leida).toBeTrue());

    const request = httpTesting.expectOne(`${API_BASE_URL}/notificaciones/7/leida`);
    expect(request.request.method).toBe('POST');
    request.flush({ ...aviso, leida: true });
  });
});
