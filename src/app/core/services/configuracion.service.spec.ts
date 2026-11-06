import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api.config';
import { ConfiguracionService } from './configuracion.service';

describe('ConfiguracionService', () => {
  let service: ConfiguracionService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ConfiguracionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe listar los tipos de uso con y sin inactivos', () => {
    service.listarTiposUso().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/configuracion/tipos-uso`).flush([]);

    service.listarTiposUso(true).subscribe();
    const req = httpTesting.expectOne(
      `${API_BASE_URL}/configuracion/tipos-uso?incluir_inactivos=true`
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('debe crear y actualizar tipos de uso', () => {
    service.crearTipoUso({ nombre: 'Clase' }).subscribe();
    const crear = httpTesting.expectOne(`${API_BASE_URL}/configuracion/tipos-uso`);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual({ nombre: 'Clase' });
    crear.flush({ id: 1, nombre: 'Clase', activo: true });

    service.actualizarTipoUso(1, { activo: false }).subscribe();
    const actualizar = httpTesting.expectOne(`${API_BASE_URL}/configuracion/tipos-uso/1`);
    expect(actualizar.request.method).toBe('PATCH');
    expect(actualizar.request.body).toEqual({ activo: false });
    actualizar.flush({ id: 1, activo: false });
  });

  it('debe consultar y actualizar las reglas de un espacio', () => {
    service.consultarReglas(5).subscribe();
    const consultar = httpTesting.expectOne(`${API_BASE_URL}/configuracion/espacios/5`);
    expect(consultar.request.method).toBe('GET');
    consultar.flush({ espacio_id: 5 });

    service.actualizarReglas(5, { hora_apertura: '07:00' }).subscribe();
    const actualizar = httpTesting.expectOne(`${API_BASE_URL}/configuracion/espacios/5`);
    expect(actualizar.request.method).toBe('PUT');
    expect(actualizar.request.body).toEqual({ hora_apertura: '07:00' });
    actualizar.flush({ espacio_id: 5 });
  });

  it('debe aplicar reglas por tipo de espacio', () => {
    service.aplicarPorTipo('LABORATORIO', { separacion_min: 15 }).subscribe();

    const req = httpTesting.expectOne(`${API_BASE_URL}/configuracion/espacios/por-tipo`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      tipo: 'LABORATORIO',
      reglas: { separacion_min: 15 }
    });
    req.flush([]);
  });

  it('debe consultar el historial con el límite por defecto y el espacio opcional', () => {
    service.consultarHistorial().subscribe();
    httpTesting
      .expectOne(`${API_BASE_URL}/configuracion/historial?limite=20`)
      .flush([]);

    service.consultarHistorial(5, 10).subscribe();
    const req = httpTesting.expectOne(
      `${API_BASE_URL}/configuracion/historial?limite=10&espacio_id=5`
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('debe listar los responsables de espacio', () => {
    service.listarResponsables().subscribe();

    const req = httpTesting.expectOne(`${API_BASE_URL}/configuracion/responsables`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('debe consultar y actualizar la anticipación por rol', () => {
    service.consultarAnticipacion().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/configuracion/anticipacion`).flush([]);

    service.actualizarAnticipacion('DOCENTE', 15).subscribe();
    const actualizar = httpTesting.expectOne(
      `${API_BASE_URL}/configuracion/anticipacion/DOCENTE`
    );
    expect(actualizar.request.method).toBe('PUT');
    expect(actualizar.request.body).toEqual({ dias_maximos: 15 });
    actualizar.flush({ rol: 'DOCENTE', dias_maximos: 15 });

    service.actualizarAnticipacion('ESTUDIANTE', null).subscribe();
    const sinLimite = httpTesting.expectOne(
      `${API_BASE_URL}/configuracion/anticipacion/ESTUDIANTE`
    );
    expect(sinLimite.request.body).toEqual({ dias_maximos: null });
    sinLimite.flush({ rol: 'ESTUDIANTE', dias_maximos: null });
  });
});
