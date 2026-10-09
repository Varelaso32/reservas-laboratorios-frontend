import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SolicitudesService } from './solicitudes.service';
import { API_BASE_URL } from '../config/api.config';
import {
  AprobacionSolicitud,
  RechazoSolicitud,
  SolicitudCrear,
  SolicitudCreada,
  SolicitudDetalle
} from '../../shared/models/solicitud.model';

describe('SolicitudesService', () => {
  let service: SolicitudesService;
  let httpTesting: HttpTestingController;

  const mockDetalle: SolicitudDetalle = {
    id: 10,
    estado: 'PENDIENTE',
    solicitante: { id: 1, nombre: 'Julian', email: 'j@ecci.edu.co', cargo: null },
    espacio: { id: 1, nombre: 'Lab', tipo: 'LABORATORIO', capacidad: 30, ubicacion: null },
    inicio: '2026-10-10T08:00:00Z',
    fin: '2026-10-10T10:00:00Z',
    asistentes: 20,
    creada_en: '2026-10-08T08:00:00Z',
    vencida: false,
    proposito: 'Prueba',
    equipamiento: null,
    motivo_rechazo: null,
    decidido_por: null,
    fecha_decision: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SolicitudesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe enviar POST /solicitudes/ al crear una solicitud', () => {
    const solicitud: SolicitudCrear = {
      espacio_id: 1,
      fecha: '2026-10-10',
      hora_inicio: '08:00',
      hora_fin: '10:00',
      proposito: 'Clase de Redes',
      asistentes: 25
    };

    const creada: SolicitudCreada = {
      id: 1,
      espacio_id: 1,
      espacio_nombre: 'Lab Redes',
      inicio: '2026-10-10T08:00:00Z',
      fin: '2026-10-10T10:00:00Z',
      proposito: 'Clase de Redes',
      asistentes: 25,
      equipamiento: null,
      estado: 'PENDIENTE',
      motivo_rechazo: null,
      fecha_decision: null,
      creada_en: '2026-10-08T10:00:00Z',
      mensaje: 'Solicitud creada con éxito'
    };

    service.crearSolicitud(solicitud).subscribe(res => {
      expect(res).toEqual(creada);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/solicitudes/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(solicitud);
    req.flush(creada);
  });

  it('debe consultar pendientes con y sin espacioId', () => {
    service.consultarPendientes().subscribe();
    const req1 = httpTesting.expectOne(`${API_BASE_URL}/solicitudes/pendientes`);
    expect(req1.request.method).toBe('GET');
    req1.flush([]);

    service.consultarPendientes(42).subscribe();
    const req2 = httpTesting.expectOne(`${API_BASE_URL}/solicitudes/pendientes?espacio_id=42`);
    expect(req2.request.method).toBe('GET');
    req2.flush([]);
  });

  it('debe consultar solicitudes resueltas con filtros opcionales', () => {
    service.consultarResueltas(5, {
      estado: 'APROBADA',
      fecha_desde: '2026-10-01',
      fecha_hasta: '2026-10-15'
    }).subscribe();

    const req = httpTesting.expectOne(
      `${API_BASE_URL}/solicitudes/resueltas?espacio_id=5&estado=APROBADA&fecha_desde=2026-10-01&fecha_hasta=2026-10-15`
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('debe obtener el detalle de una solicitud', () => {
    service.obtenerDetalle(10).subscribe(res => {
      expect(res).toEqual(mockDetalle);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/solicitudes/10`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDetalle);
  });

  it('debe aprobar una solicitud enviando POST sin body', () => {
    const aprobacion: AprobacionSolicitud = {
      mensaje: 'Aprobada',
      solicitud: { ...mockDetalle, estado: 'APROBADA' },
      reserva: {
        id: 1,
        solicitud_id: 10,
        espacio_id: 1,
        espacio_nombre: 'Lab',
        inicio: '2026-10-10T08:00:00Z',
        fin: '2026-10-10T10:00:00Z',
        estado: 'ACTIVA'
      }
    };

    service.aprobarSolicitud(12).subscribe(res => {
      expect(res).toEqual(aprobacion);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/solicitudes/12/aprobar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(aprobacion);
  });

  it('debe rechazar una solicitud enviando motivo', () => {
    const rechazo: RechazoSolicitud = {
      mensaje: 'Rechazada',
      solicitud: { ...mockDetalle, estado: 'RECHAZADA', motivo_rechazo: 'Espacio en mantenimiento' }
    };

    service.rechazarSolicitud(15, 'Espacio en mantenimiento').subscribe(res => {
      expect(res).toEqual(rechazo);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/solicitudes/15/rechazar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motivo: 'Espacio en mantenimiento' });
    req.flush(rechazo);
  });
});
