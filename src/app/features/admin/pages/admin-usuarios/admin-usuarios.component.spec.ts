import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import type { ListaUsuariosResponse, UsuarioAdmin } from '../../../../core/models/usuarios.model';
import { AdminUsuariosComponent } from './admin-usuarios.component';

const USUARIOS_URL = 'http://localhost:8000/api/v1/usuarios/';
const PASSWORD_DE_PRUEBA = ['clave', 'segura'].join('-');

describe('AdminUsuariosComponent', () => {
  let fixture: ComponentFixture<AdminUsuariosComponent>;
  let httpTestingController: HttpTestingController;
  let messageService: MessageService;

  const docente: UsuarioAdmin = {
    id: 11,
    nombre: 'Ana Docente',
    email: 'ana@reservas.test',
    rol: 'SOLICITANTE',
    cargo: 'DOCENTE',
    activo: true,
    reservas_mes: 18
  };
  const estudiante: UsuarioAdmin = {
    id: 12,
    nombre: 'Luis Estudiante',
    email: 'luis@reservas.test',
    rol: 'SOLICITANTE',
    cargo: 'ESTUDIANTE',
    activo: true,
    reservas_mes: 12
  };
  const operador: UsuarioAdmin = {
    id: 13,
    nombre: 'Operador',
    email: 'operador@reservas.test',
    rol: 'APROBADOR',
    cargo: 'ADMINISTRATIVO',
    activo: false,
    reservas_mes: 8
  };
  const administrador: UsuarioAdmin = {
    id: 14,
    nombre: 'Administrador',
    email: 'admin-sistema@reservas.test',
    rol: 'ADMIN',
    cargo: 'ADMINISTRADOR_SISTEMA',
    activo: true,
    reservas_mes: 0
  };

  function respuesta(items: UsuarioAdmin[], total = items.length, skip = 0, limit = 10): ListaUsuariosResponse {
    return { total, skip, limit, items };
  }

  function responderListadoInicial(usuarios: UsuarioAdmin[] = [docente, estudiante, operador]): void {
    httpTestingController.expectOne(request =>
      request.method === 'GET' &&
      request.url === USUARIOS_URL &&
      request.params.get('skip') === '0' &&
      request.params.get('limit') === '10'
    ).flush(respuesta(usuarios, usuarios.length));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'admin-session-token');
    sessionStorage.setItem('usuario', JSON.stringify({
      id: 1,
      nombre: 'Super Administrador',
      email: 'admin@reservas.test',
      rol: 'ADMIN',
      cargo: 'ADMINISTRADOR_SISTEMA'
    }));
    messageService = new MessageService();
    spyOn(messageService, 'add').and.callThrough();

    await TestBed.configureTestingModule({
      imports: [AdminUsuariosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MessageService, useValue: messageService }
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminUsuariosComponent);
    fixture.detectChanges();
    responderListadoInicial();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('loads and renders the paginated user contract without invented metrics', () => {
    const text = fixture.nativeElement.textContent as string;
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>
    ).map(header => header.textContent?.trim());

    expect(text).toContain('3 usuarios registrados');
    expect(text).toContain('Ana Docente');
    expect(text).toContain('Docente');
    expect(text).toContain('Docente');
    expect(text).toContain('18');
    expect(headers).toEqual(['USUARIO', 'ROL', 'RESERVAS ESTE MES', 'ESTADO', 'ACCIONES']);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveSize(3);
    expect(fixture.nativeElement.querySelector('.rol-docente')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.menu-acciones-boton')).toHaveSize(3);
  });

  it('uses SOLICITANTE for docente and estudiante cargo filters, then filters and paginates locally', () => {
    fixture.componentInstance.seleccionarFiltro('docentes');

    const request = httpTestingController.expectOne(`${USUARIOS_URL}?skip=0&limit=100&rol=SOLICITANTE`);
    expect(request.request.method).toBe('GET');
    request.flush(respuesta([docente, estudiante], 2, 0, 100));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1 usuarios registrados');
    expect(fixture.nativeElement.textContent).toContain('Ana Docente');
    expect(fixture.nativeElement.textContent).not.toContain('Luis Estudiante');
    expect(messageService.add).not.toHaveBeenCalled();
  });

  it('uses actual roles rather than treating docentes or estudiantes as roles', () => {
    fixture.componentInstance.seleccionarFiltro('estudiantes');
    const request = httpTestingController.expectOne(USUARIOS_URL + '?skip=0&limit=100&rol=SOLICITANTE');
    request.flush(respuesta([docente, estudiante], 2, 0, 100));

    expect(fixture.componentInstance.usuarios.map(usuario => usuario.cargo)).toEqual(['ESTUDIANTE']);
  });

  it('filters operators by the APROBADOR role and does not include system administrators', () => {
    fixture.componentInstance.seleccionarFiltro('operadores');
    const request = httpTestingController.expectOne(USUARIOS_URL + '?skip=0&limit=100&rol=APROBADOR');
    request.flush(respuesta([operador, administrador], 2, 0, 100));

    expect(fixture.componentInstance.usuarios.map(usuario => usuario.rol)).toEqual(['APROBADOR']);
  });

  it('shows the create modal and creates a user with the selected role and valid cargo', () => {
    const createButton = fixture.nativeElement.querySelector('.nuevo-usuario') as HTMLButtonElement;
    createButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    fixture.componentInstance.formulario = {
      nombre: 'Nueva Docente',
      email: 'nueva@reservas.test',
      password: PASSWORD_DE_PRUEBA,
      perfil: 'DOCENTE'
    };
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.modal-usuario form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    const request = httpTestingController.expectOne(USUARIOS_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      nombre: 'Nueva Docente',
      email: 'nueva@reservas.test',
      clave: PASSWORD_DE_PRUEBA,
      rol: 'SOLICITANTE',
      cargo: 'DOCENTE'
    });
    request.flush({ ...docente, id: 14, nombre: 'Nueva Docente' });
    httpTestingController.expectOne(request => request.method === 'GET' && request.url === USUARIOS_URL)
      .flush(respuesta([docente, estudiante, operador], 3));
    fixture.detectChanges();

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('loads a user by id before editing and PATCHes only editable fields', () => {
    (fixture.nativeElement.querySelector('.menu-acciones-boton') as HTMLButtonElement).click();
    fixture.detectChanges();
    const editButton = fixture.nativeElement.querySelector('.accion-editar') as HTMLButtonElement;
    editButton.click();
    const detailRequest = httpTestingController.expectOne(`${USUARIOS_URL}11`);
    expect(detailRequest.request.method).toBe('GET');
    detailRequest.flush(docente);
    fixture.detectChanges();

    fixture.componentInstance.formulario.nombre = 'Ana Actualizada';
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.modal-usuario form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    const updateRequest = httpTestingController.expectOne(`${USUARIOS_URL}11`);
    expect(updateRequest.request.method).toBe('PATCH');
    expect(updateRequest.request.body).toEqual({
      nombre: 'Ana Actualizada',
      email: 'ana@reservas.test',
      rol: 'SOLICITANTE',
      cargo: 'DOCENTE'
    });
    updateRequest.flush({ ...docente, nombre: 'Ana Actualizada' });
    httpTestingController.expectOne(request => request.method === 'GET' && request.url === USUARIOS_URL)
      .flush(respuesta([docente, estudiante, operador], 3));
  });

  it('updates user status when modified inside edit modal and calls PATCH /estado', () => {
    (fixture.nativeElement.querySelector('.menu-acciones-boton') as HTMLButtonElement).click();
    fixture.detectChanges();
    const editButton = fixture.nativeElement.querySelector('.accion-editar') as HTMLButtonElement;
    editButton.click();
    const detailRequest = httpTestingController.expectOne(`${USUARIOS_URL}11`);
    detailRequest.flush(docente);
    fixture.detectChanges();

    expect(fixture.componentInstance.estadoUsuarioVisual).toBe('Activo');
    fixture.componentInstance.estadoUsuarioVisual = 'Inactivo';
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.modal-usuario form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    const updateRequest = httpTestingController.expectOne(`${USUARIOS_URL}11`);
    expect(updateRequest.request.method).toBe('PATCH');
    updateRequest.flush(docente);

    const statusRequest = httpTestingController.expectOne(`${USUARIOS_URL}11/estado`);
    expect(statusRequest.request.method).toBe('PATCH');
    expect(statusRequest.request.body).toEqual({ activo: false });
    statusRequest.flush({ ...docente, activo: false });

    httpTestingController.expectOne(request => request.method === 'GET' && request.url === USUARIOS_URL)
      .flush(respuesta([{ ...docente, activo: false }, estudiante, operador], 3));
    fixture.detectChanges();

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  it('confirms and PATCHes status changes, then refreshes the list and shows a toast', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    (fixture.nativeElement.querySelector('.menu-acciones-boton') as HTMLButtonElement).click();
    fixture.detectChanges();
    const statusButton = fixture.nativeElement.querySelector('.accion-estado') as HTMLButtonElement;
    statusButton.click();

    const request = httpTestingController.expectOne(`${USUARIOS_URL}11/estado`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ activo: false });
    request.flush({ ...docente, activo: false });
    httpTestingController.expectOne(request => request.method === 'GET' && request.url === USUARIOS_URL)
      .flush(respuesta([{ ...docente, activo: false }, estudiante, operador], 3));
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  it('shows API errors instead of presenting a fabricated empty result', () => {
    fixture.componentInstance.cargarUsuarios();
    httpTestingController.expectOne(USUARIOS_URL + '?skip=0&limit=10').flush(
      { detail: 'Servicio no disponible' },
      { status: 503, statusText: 'Unavailable' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Servicio no disponible');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
  });

});
