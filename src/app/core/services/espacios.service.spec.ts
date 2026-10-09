import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { EspaciosService } from './espacios.service';
import { API_BASE_URL } from '../config/api.config';
import {
  DisponibilidadEspacio,
  Espacio,
  EspacioActualizar,
  EspacioAdmin,
  EspacioCrear,
  EspacioEstadoActualizar,
  EspacioMetrica
} from '../../shared/models/espacio.model';

describe('EspaciosService', () => {
  let service: EspaciosService;
  let httpTesting: HttpTestingController;

  const mockEspacio: Espacio = {
    id: 1,
    nombre: 'Laboratorio de Redes',
    tipo: 'LABORATORIO',
    capacidad: 30,
    ubicacion: 'Bloque A - Piso 2'
  };

  const mockEspacioAdmin: EspacioAdmin = {
    ...mockEspacio,
    activo: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(EspaciosService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe crear un nuevo espacio con POST /espacios/', () => {
    const nuevoEspacio: EspacioCrear = {
      nombre: 'Laboratorio de Redes',
      tipo: 'LABORATORIO',
      capacidad: 30,
      ubicacion: 'Bloque A - Piso 2'
    };

    service.crear(nuevoEspacio).subscribe(res => {
      expect(res).toEqual(mockEspacioAdmin);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/espacios/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevoEspacio);
    req.flush(mockEspacioAdmin);
  });

  it('debe listar espacios con y sin filtro de tipo', () => {
    service.listar().subscribe();
    const req1 = httpTesting.expectOne(`${API_BASE_URL}/espacios/`);
    expect(req1.request.method).toBe('GET');
    req1.flush([mockEspacio]);

    service.listar('SALA').subscribe();
    const req2 = httpTesting.expectOne(`${API_BASE_URL}/espacios/?tipo=SALA`);
    expect(req2.request.method).toBe('GET');
    req2.flush([mockEspacio]);
  });

  it('debe listar espacios para administracion con GET /espacios/admin', () => {
    service.listarAdmin().subscribe(res => {
      expect(res).toEqual([mockEspacioAdmin]);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/espacios/admin`);
    expect(req.request.method).toBe('GET');
    req.flush([mockEspacioAdmin]);
  });

  it('debe consultar metricas por fecha con GET /espacios/metricas', () => {
    const mockMetricas: EspacioMetrica[] = [
      {
        ...mockEspacioAdmin,
        fecha: '2026-10-08',
        reservas_dia: 5,
        minutos_reservados: 600,
        minutos_disponibles: 720,
        porcentaje_ocupacion: 83.3
      }
    ];

    service.consultarMetricas('2026-10-08').subscribe(res => {
      expect(res).toEqual(mockMetricas);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/espacios/metricas?fecha=2026-10-08`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMetricas);
  });

  it('debe actualizar un espacio con PATCH /espacios/:id', () => {
    const cambios: EspacioActualizar = { capacidad: 35, ubicacion: 'Bloque B' };

    service.actualizar(1, cambios).subscribe(res => {
      expect(res).toEqual(mockEspacioAdmin);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/espacios/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(cambios);
    req.flush(mockEspacioAdmin);
  });

  it('debe actualizar el estado con PATCH /espacios/:id/estado', () => {
    const nuevoEstado: EspacioEstadoActualizar = { activo: false };

    service.actualizarEstado(1, nuevoEstado).subscribe(res => {
      expect(res).toEqual(mockEspacioAdmin);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/espacios/1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(nuevoEstado);
    req.flush(mockEspacioAdmin);
  });

  it('debe consultar espacios disponibles con y sin tipo', () => {
    service.consultarDisponibles('2026-10-08', '08:00', '10:00').subscribe();
    const req1 = httpTesting.expectOne(
      `${API_BASE_URL}/espacios/disponibles?fecha=2026-10-08&hora_inicio=08:00&hora_fin=10:00`
    );
    expect(req1.request.method).toBe('GET');
    req1.flush([mockEspacio]);

    service.consultarDisponibles('2026-10-08', '08:00', '10:00', 'SALA').subscribe();
    const req2 = httpTesting.expectOne(
      `${API_BASE_URL}/espacios/disponibles?fecha=2026-10-08&hora_inicio=08:00&hora_fin=10:00&tipo=SALA`
    );
    expect(req2.request.method).toBe('GET');
    req2.flush([mockEspacio]);
  });

  it('debe consultar disponibilidad de un espacio especifico', () => {
    const mockDisponibilidad: DisponibilidadEspacio = {
      espacio_id: 1,
      disponible: true,
      mensaje: 'Disponible'
    };

    service.consultarDisponibilidad(1, '2026-10-08', '08:00', '10:00').subscribe(res => {
      expect(res).toEqual(mockDisponibilidad);
    });

    const req = httpTesting.expectOne(
      `${API_BASE_URL}/espacios/1/disponibilidad?fecha=2026-10-08&hora_inicio=08:00&hora_fin=10:00`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockDisponibilidad);
  });
});
