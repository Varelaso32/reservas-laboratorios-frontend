import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { ListaUsuariosResponse, UsuarioAdmin } from '../models/usuarios.model';
import { UsuariosService } from './usuarios.service';

const USUARIOS_URL = 'http://localhost:8000/api/v1/usuarios/';
const PASSWORD_DE_PRUEBA = ['clave', 'segura'].join('-');

describe('UsuariosService', () => {
  let service: UsuariosService;
  let httpTestingController: HttpTestingController;

  const usuario: UsuarioAdmin = {
    id: 5,
    nombre: 'Usuario Demo',
    email: 'demo@reservas.test',
    rol: 'SOLICITANTE',
    cargo: 'DOCENTE',
    activo: true,
    reservas_mes: 0
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UsuariosService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('lists users using only the documented query parameters', () => {
    service.listar({ skip: 20, limit: 10, rol: 'SOLICITANTE', activo: false }).subscribe();

    const request = httpTestingController.expectOne(
      `${USUARIOS_URL}?skip=20&limit=10&rol=SOLICITANTE&activo=false`
    );
    expect(request.request.method).toBe('GET');
    request.flush({ total: 21, skip: 20, limit: 10, items: [usuario] } satisfies ListaUsuariosResponse);
  });

  it('recovers every page based on total for client-side cargo filters', () => {
    const resultados: UsuarioAdmin[][] = [];
    service.listarTodas('SOLICITANTE').subscribe(usuarios => resultados.push(usuarios));

    const primeraPagina = httpTestingController.expectOne(
      `${USUARIOS_URL}?skip=0&limit=100&rol=SOLICITANTE`
    );
    const primerLote = Array.from({ length: 100 }, (_, index) => ({ ...usuario, id: index + 1 }));
    primeraPagina.flush({
      total: 101,
      skip: 0,
      limit: 100,
      items: primerLote
    } satisfies ListaUsuariosResponse);

    const segundaPagina = httpTestingController.expectOne(
      `${USUARIOS_URL}?skip=100&limit=100&rol=SOLICITANTE`
    );
    segundaPagina.flush({
      total: 101,
      skip: 100,
      limit: 100,
      items: [{ ...usuario, id: 101 }]
    } satisfies ListaUsuariosResponse);

    expect(resultados).toHaveSize(1);
    expect(resultados[0]).toHaveSize(101);
  });

  it('uses the documented detail, create, edit, and status endpoints', () => {
    service.obtenerPorId(5).subscribe();
    const detailRequest = httpTestingController.expectOne(`${USUARIOS_URL}5`);
    expect(detailRequest.request.method).toBe('GET');
    detailRequest.flush(usuario);

    service.crear({
      nombre: 'Usuario Demo',
      email: 'demo@reservas.test',
      clave: PASSWORD_DE_PRUEBA,
      rol: 'SOLICITANTE',
      cargo: 'DOCENTE'
    }).subscribe();
    const createRequest = httpTestingController.expectOne(USUARIOS_URL);
    expect(createRequest.request.method).toBe('POST');
    createRequest.flush(usuario);

    service.actualizar(5, {
      nombre: 'Usuario Editado',
      email: 'editado@reservas.test',
      rol: 'SOLICITANTE',
      cargo: 'ESTUDIANTE'
    }).subscribe();
    const updateRequest = httpTestingController.expectOne(`${USUARIOS_URL}5`);
    expect(updateRequest.request.method).toBe('PATCH');
    updateRequest.flush(usuario);

    service.cambiarEstado(5, { activo: false }).subscribe();
    const stateRequest = httpTestingController.expectOne(`${USUARIOS_URL}5/estado`);
    expect(stateRequest.request.method).toBe('PATCH');
    expect(stateRequest.request.body).toEqual({ activo: false });
    stateRequest.flush({ ...usuario, activo: false });
  });
});
