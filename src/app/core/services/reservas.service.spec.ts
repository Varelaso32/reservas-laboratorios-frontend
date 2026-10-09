import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ReservasService } from './reservas.service';
import { API_BASE_URL } from '../config/api.config';
import { ReservaDetalle, ReservaResumen } from '../../shared/models/solicitud.model';

describe('ReservasService', () => {
  let service: ReservasService;
  let httpTesting: HttpTestingController;

  const mockEspacioResumen = {
    id: 2,
    nombre: 'Laboratorio 101',
    tipo: 'LABORATORIO' as const,
    capacidad: 30,
    ubicacion: 'Bloque A'
  };

  const mockReservaResumen: ReservaResumen = {
    id: 1,
    estado: 'ACTIVA',
    espacio: mockEspacioResumen,
    inicio: '2026-10-10T10:00:00Z',
    fin: '2026-10-10T12:00:00Z',
    solicitud_id: 15
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ReservasService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe consultar mis reservas con GET /reservas/mias y soportar incluir_canceladas', () => {
    service.consultarMias().subscribe(res => {
      expect(res).toEqual([mockReservaResumen]);
    });

    const req1 = httpTesting.expectOne(`${API_BASE_URL}/reservas/mias`);
    expect(req1.request.method).toBe('GET');
    req1.flush([mockReservaResumen]);

    service.consultarMias(true).subscribe();
    const req2 = httpTesting.expectOne(`${API_BASE_URL}/reservas/mias?incluir_canceladas=true`);
    expect(req2.request.method).toBe('GET');
    req2.flush([mockReservaResumen]);
  });

  it('debe consultar agenda general con GET /reservas/ por fecha o rango', () => {
    service.consultarAgenda({ fecha: '2026-10-08' }).subscribe();
    const req1 = httpTesting.expectOne(`${API_BASE_URL}/reservas/?fecha=2026-10-08`);
    expect(req1.request.method).toBe('GET');
    req1.flush([mockReservaResumen]);

    service.consultarAgenda({
      fecha_inicio: '2026-10-05',
      fecha_fin: '2026-10-11',
      espacio_id: 2
    }).subscribe();
    const req2 = httpTesting.expectOne(
      `${API_BASE_URL}/reservas/?fecha_inicio=2026-10-05&fecha_fin=2026-10-11&espacio_id=2`
    );
    expect(req2.request.method).toBe('GET');
    req2.flush([mockReservaResumen]);

    service.consultarAgenda().subscribe();
    const req3 = httpTesting.expectOne(`${API_BASE_URL}/reservas/`);
    expect(req3.request.method).toBe('GET');
    req3.flush([]);
  });

  it('debe obtener detalle de reserva con GET /reservas/:id', () => {
    const mockDetalle: ReservaDetalle = {
      id: 5,
      estado: 'ACTIVA',
      espacio: mockEspacioResumen,
      inicio: '2026-10-10T10:00:00Z',
      fin: '2026-10-10T12:00:00Z',
      solicitud_id: 15,
      finalizada: false,
      titular: 'Julian Gonzalez',
      proposito: 'Practica',
      asistentes: 20,
      equipamiento: null,
      aprobada_por: 'Coordinador',
      fecha_aprobacion: '2026-10-08T10:00:00Z',
      creada_en: '2026-10-08T09:00:00Z'
    };

    service.obtenerDetalle(5).subscribe(res => {
      expect(res).toEqual(mockDetalle);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/reservas/5`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDetalle);
  });

  it('debe cancelar una reserva enviando POST /reservas/:id/cancelar con body null', () => {
    const mockCancelada: ReservaResumen = {
      ...mockReservaResumen,
      estado: 'CANCELADA'
    };

    service.cancelarReserva(5).subscribe(res => {
      expect(res).toEqual(mockCancelada);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/reservas/5/cancelar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(mockCancelada);
  });
});
