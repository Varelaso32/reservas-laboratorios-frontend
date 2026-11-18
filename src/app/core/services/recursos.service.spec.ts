import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api.config';
import { RecursosService } from './recursos.service';

describe('RecursosService', () => {
  let service: RecursosService;
  let httpTesting: HttpTestingController;

  const base = `${API_BASE_URL}/recursos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(RecursosService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe listar los tipos de recurso sin filtros por defecto', () => {
    service.listarTipos().subscribe(res => expect(res).toEqual([]));

    const req = httpTesting.expectOne(`${base}/tipos`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('debe pedir solo los tipos activos cuando se indica', () => {
    service.listarTipos(true).subscribe();

    const req = httpTesting.expectOne(`${base}/tipos?solo_activos=true`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('debe crear y actualizar tipos de recurso', () => {
    service.crearTipo({ nombre: 'Portátil', cantidad: 3 }).subscribe();
    const crear = httpTesting.expectOne(`${base}/tipos`);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual({ nombre: 'Portátil', cantidad: 3 });
    crear.flush({ id: 1, nombre: 'Portátil' });

    service.actualizarTipo(1, { activo: false }).subscribe();
    const actualizar = httpTesting.expectOne(`${base}/tipos/1`);
    expect(actualizar.request.method).toBe('PATCH');
    expect(actualizar.request.body).toEqual({ activo: false });
    actualizar.flush({ id: 1, activo: false });
  });

  it('debe consultar el stock global', () => {
    service.stock().subscribe();

    const req = httpTesting.expectOne(`${base}/stock`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('debe listar amenidades con y sin espacio', () => {
    service.listarAmenidades().subscribe();
    httpTesting.expectOne(`${base}/amenidades`).flush([]);

    service.listarAmenidades(4).subscribe();
    const req = httpTesting.expectOne(`${base}/amenidades?espacio_id=4`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('debe listar el inventario combinando los filtros opcionales', () => {
    service.listarInventario().subscribe();
    httpTesting.expectOne(`${base}/inventario`).flush([]);

    service.listarInventario(2).subscribe();
    httpTesting.expectOne(`${base}/inventario?tipo_recurso_id=2`).flush([]);

    service.listarInventario(2, true).subscribe();
    httpTesting
      .expectOne(`${base}/inventario?tipo_recurso_id=2&solo_activos=true`)
      .flush([]);
  });

  it('debe crear, actualizar y cambiar el estado de una unidad del inventario', () => {
    service.crearRecurso({ tipo_recurso_id: 1, codigo: 'PORT-01' }).subscribe();
    const crear = httpTesting.expectOne(`${base}/`);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual({ tipo_recurso_id: 1, codigo: 'PORT-01' });
    crear.flush({ id: 1 });

    service.actualizarRecurso(7, { codigo: 'PORT-02' }).subscribe();
    const actualizar = httpTesting.expectOne(`${base}/7`);
    expect(actualizar.request.method).toBe('PATCH');
    expect(actualizar.request.body).toEqual({ codigo: 'PORT-02' });
    actualizar.flush({ id: 7 });

    service.cambiarEstadoRecurso(7, { estado: 'FALLIDO', comentario: 'No enciende' }).subscribe();
    const estado = httpTesting.expectOne(`${base}/7/estado`);
    expect(estado.request.method).toBe('PATCH');
    expect(estado.request.body).toEqual({ estado: 'FALLIDO', comentario: 'No enciende' });
    estado.flush({ id: 7 });
  });

  it('debe consultar el historial de una unidad', () => {
    service.historialRecurso(7).subscribe();

    const req = httpTesting.expectOne(`${base}/7/historial`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('debe consultar la disponibilidad de una reserva y las reservas elegibles', () => {
    service.disponibilidad(9).subscribe();
    const disponibilidad = httpTesting.expectOne(`${base}/disponibilidad?reserva_id=9`);
    expect(disponibilidad.request.method).toBe('GET');
    disponibilidad.flush({ reserva_id: 9, tipos: [] });

    service.reservasElegibles().subscribe();
    const elegibles = httpTesting.expectOne(`${base}/reservas-elegibles`);
    expect(elegibles.request.method).toBe('GET');
    elegibles.flush([]);
  });

  it('debe registrar y listar solicitudes de recursos', () => {
    service.solicitar({ reserva_id: 9, detalle: [{ tipo_recurso_id: 1, cantidad: 2 }] }).subscribe();
    const crear = httpTesting.expectOne(`${base}/solicitudes`);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual({
      reserva_id: 9,
      detalle: [{ tipo_recurso_id: 1, cantidad: 2 }]
    });
    crear.flush({ id: 3 });

    service.misSolicitudes().subscribe();
    httpTesting.expectOne(`${base}/solicitudes/mias`).flush([]);

    service.listarSolicitudes().subscribe();
    httpTesting.expectOne(`${base}/solicitudes`).flush([]);

    service.listarSolicitudes('PENDIENTE').subscribe();
    httpTesting.expectOne(`${base}/solicitudes?estado=PENDIENTE`).flush([]);
  });

  it('debe decidir una solicitud de recursos', () => {
    service.decidirSolicitud(3, { aprobar: false, motivo: 'Sin stock' }).subscribe();

    const req = httpTesting.expectOne(`${base}/solicitudes/3/decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ aprobar: false, motivo: 'Sin stock' });
    req.flush({ id: 3, estado: 'RECHAZADA' });
  });

  it('debe listar los préstamos combinando los filtros', () => {
    service.listarPrestamos().subscribe();
    const sinFiltros = httpTesting.expectOne(`${base}/asignaciones`);
    expect(sinFiltros.request.method).toBe('GET');
    expect(sinFiltros.request.params.keys()).toEqual([]);
    sinFiltros.flush([]);

    service.listarPrestamos(true).subscribe();
    const vigentes = httpTesting.expectOne(`${base}/asignaciones?solo_vigentes=true`);
    expect(vigentes.request.params.get('solo_vigentes')).toBe('true');
    vigentes.flush([]);

    service.listarPrestamos(true, 'ENTREGADA').subscribe();
    const conEstado = httpTesting.expectOne(
      `${base}/asignaciones?solo_vigentes=true&estado=ENTREGADA`
    );
    expect(conEstado.request.params.get('estado')).toBe('ENTREGADA');
    conEstado.flush([]);
  });

  it('debe registrar la entrega y la devolución de un préstamo', () => {
    service.registrarEntrega(8).subscribe();
    const entrega = httpTesting.expectOne(`${base}/asignaciones/8/entrega`);
    expect(entrega.request.method).toBe('POST');
    expect(entrega.request.body).toBeNull();
    entrega.flush({ id: 3 });

    service.registrarDevolucion(8, { estado: 'FALLIDO', comentario: 'Pantalla rota' }).subscribe();
    const devolucion = httpTesting.expectOne(`${base}/asignaciones/8/devolucion`);
    expect(devolucion.request.method).toBe('POST');
    expect(devolucion.request.body).toEqual({ estado: 'FALLIDO', comentario: 'Pantalla rota' });
    devolucion.flush({ id: 3 });
  });

  it('debe lanzar el barrido de devoluciones vencidas', () => {
    service.procesarRetrasos().subscribe(res => {
      expect(res).toEqual({ notificados: 2, strikes: 1 });
    });

    const req = httpTesting.expectOne(`${base}/procesar-retrasos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ notificados: 2, strikes: 1 });
  });
});
