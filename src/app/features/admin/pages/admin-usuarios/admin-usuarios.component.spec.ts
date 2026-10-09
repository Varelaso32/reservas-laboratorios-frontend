import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { NgForm } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import type { ListaUsuariosResponse, UsuarioAdmin } from '../../../../core/models/usuarios.model';
import { AuthService } from '../../../../core/services/auth.service';
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

  it('covers user initials and name initials formatting edge cases', () => {
    const authService = TestBed.inject(AuthService);
    spyOn(authService, 'obtenerUsuarioActual').and.returnValue({ ...docente, nombre: 'Admin' });
    expect(fixture.componentInstance.inicialesUsuario).toBe('AD');
    (authService.obtenerUsuarioActual as jasmine.Spy).and.returnValue({ ...docente, nombre: '   ' });
    expect(fixture.componentInstance.inicialesUsuario).toBe('');

    expect(fixture.componentInstance.inicialesNombre('Carlos')).toBe('CA');
    expect(fixture.componentInstance.inicialesNombre('Carlos Gomez Perez')).toBe('CP');
    expect(fixture.componentInstance.inicialesNombre('')).toBe('');
  });

  it('covers pagination methods irPaginaAnterior and irPaginaSiguiente', () => {
    const comp = fixture.componentInstance;
    comp.totalUsuarios = 25;
    comp.paginaActual = 0;

    // Ir anterior when page 0 -> does nothing
    comp.irPaginaAnterior();
    expect(comp.paginaActual).toBe(0);

    // Ir siguiente when page 0 and total 25
    comp.irPaginaSiguiente();
    expect(comp.paginaActual).toBe(1);
    const reqNext = httpTestingController.expectOne(`${USUARIOS_URL}?skip=10&limit=10`);
    reqNext.flush(respuesta([docente], 25, 10, 10));

    // Ir siguiente when on last page -> does nothing
    comp.paginaActual = 2; // ultimaFila is 25, total is 25
    comp.irPaginaSiguiente();
    expect(comp.paginaActual).toBe(2);

    // Ir anterior from page 2
    comp.irPaginaAnterior();
    expect(comp.paginaActual).toBe(1);
    const reqPrev = httpTestingController.expectOne(`${USUARIOS_URL}?skip=10&limit=10`);
    reqPrev.flush(respuesta([docente], 25, 10, 10));

    // Test filtered pagination
    comp.seleccionarFiltro('docentes');
    const reqFiltro = httpTestingController.expectOne(`${USUARIOS_URL}?skip=0&limit=100&rol=SOLICITANTE`);
    reqFiltro.flush(respuesta(Array(15).fill(docente), 15, 0, 100));
    comp.irPaginaSiguiente();
    expect(comp.paginaActual).toBe(1);
    expect(comp.usuarios.length).toBe(5);
  });

  it('ignores duplicate filter selection and handles filtered load error', () => {
    const comp = fixture.componentInstance;
    comp.filtroActual = 'docentes';
    // Duplicate filter does not re-request
    comp.seleccionarFiltro('docentes');
    httpTestingController.expectNone(`${USUARIOS_URL}?skip=0&limit=100&rol=SOLICITANTE`);

    // Select filter that fails
    comp.seleccionarFiltro('operadores');
    const req = httpTestingController.expectOne(`${USUARIOS_URL}?skip=0&limit=100&rol=APROBADOR`);
    req.flush({ detail: 'Error operadores' }, { status: 500, statusText: 'Error' });
    expect(comp.errorCarga).toBe('Error operadores');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
  });

  it('handles error when loading user detail to edit', () => {
    const comp = fixture.componentInstance;
    comp.abrirEditar(docente);
    const req = httpTestingController.expectOne(`${USUARIOS_URL}11`);
    req.flush({ detail: 'Usuario no existe' }, { status: 404, statusText: 'Not Found' });

    expect(comp.cargandoDetalle).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'No se pudo cargar el usuario'
    }));
  });

  it('handles modal and menu actions, and updating profile selection', () => {
    const comp = fixture.componentInstance;
    comp.abrirCrear();
    expect(comp.modalAbierto).toBeTrue();
    expect(comp.formulario.nombre).toBe('');

    comp.actualizarPerfil('OPERADOR');
    expect(comp.formulario.perfil).toBe('OPERADOR');

    comp.cerrarModal();
    expect(comp.modalAbierto).toBeFalse();

    comp.alternarMenu(11);
    expect(comp.menuUsuarioAbiertoId).toBe(11);
    comp.alternarMenu(11);
    expect(comp.menuUsuarioAbiertoId).toBeNull();
    comp.alternarMenu(12);
    comp.cerrarMenu();
    expect(comp.menuUsuarioAbiertoId).toBeNull();
  });

  it('validates creation form when password is empty and handles creation failure', () => {
    const comp = fixture.componentInstance;
    comp.abrirCrear();
    comp.formulario = {
      nombre: 'Nuevo Sin Clave',
      email: 'sinclave@test.com',
      password: '   ',
      perfil: 'ESTUDIANTE'
    };

    const dummyForm = {
      valid: true,
      control: { markAllAsTouched: jasmine.createSpy('markAllAsTouched') }
    } as unknown as NgForm;

    comp.guardar(dummyForm);
    expect(comp.guardando).toBeFalse();
    expect(dummyForm.control.markAllAsTouched).toHaveBeenCalled();

    // Now with password but API failure
    comp.formulario.password = 'clave123';
    comp.guardar(dummyForm);
    const req = httpTestingController.expectOne(USUARIOS_URL);
    req.flush({ detail: 'Email ya registrado' }, { status: 409, statusText: 'Conflict' });

    expect(comp.guardando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      detail: 'Email ya registrado'
    }));
  });

  it('handles edit failure and status update failure inside edit', () => {
    const comp = fixture.componentInstance;
    comp.abrirEditar(docente);
    const reqDetalle = httpTestingController.expectOne(`${USUARIOS_URL}11`);
    reqDetalle.flush(docente);

    comp.estadoUsuarioVisual = 'Inactivo';
    comp.formulario = {
      nombre: 'Ana Editada',
      email: 'ana@test.com',
      password: '',
      perfil: 'DOCENTE'
    };

    const dummyForm = {
      valid: true,
      control: { markAllAsTouched: jasmine.createSpy('markAllAsTouched') }
    } as unknown as NgForm;

    // Failure on update
    comp.guardar(dummyForm);
    const reqUpdate = httpTestingController.expectOne(`${USUARIOS_URL}11`);
    reqUpdate.flush({ detail: 'Error al actualizar' }, { status: 500, statusText: 'Error' });
    expect(comp.guardando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      detail: 'Error al actualizar'
    }));

    // Success on update but status failure (still calls guardarFinalizado)
    comp.guardar(dummyForm);
    const reqUpdate2 = httpTestingController.expectOne(`${USUARIOS_URL}11`);
    reqUpdate2.flush({ ...docente, nombre: 'Ana Editada' });
    const reqStatus = httpTestingController.expectOne(`${USUARIOS_URL}11/estado`);
    reqStatus.flush({ detail: 'No se pudo cambiar estado' }, { status: 500, statusText: 'Error' });
    const reqReload = httpTestingController.expectOne(request => request.method === 'GET' && request.url === USUARIOS_URL);
    reqReload.flush(respuesta([docente], 1));
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'success'
    }));
  });

  it('cancels status change when user rejects confirm and handles API error on status change', () => {
    const comp = fixture.componentInstance;
    spyOn(window, 'confirm').and.returnValue(false);
    comp.cambiarEstado(docente);
    httpTestingController.expectNone(`${USUARIOS_URL}11/estado`);

    // When confirmed but API fails
    (window.confirm as jasmine.Spy).and.returnValue(true);
    comp.cambiarEstado(docente);
    const req = httpTestingController.expectOne(`${USUARIOS_URL}11/estado`);
    req.flush({ detail: 'Fallo de estado' }, { status: 500, statusText: 'Error' });
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      detail: 'Fallo de estado'
    }));
  });

  it('maps profile labels and classes for ADMIN and ADMINISTRATIVO cargo', () => {
    const comp = fixture.componentInstance;
    expect(comp.etiquetaPerfil('ADMIN', 'ADMINISTRADOR_SISTEMA')).toBe('Administrador');
    expect(comp.clasePerfil('ADMIN', 'ADMINISTRADOR_SISTEMA')).toBe('rol-administrador');
    expect(comp.etiquetaPerfil('SOLICITANTE', 'ADMINISTRATIVO')).toBe('Departamento');
    expect(comp.clasePerfil('SOLICITANTE', 'ADMINISTRATIVO')).toBe('rol-departamento');
    expect(comp.etiquetaPerfilDePresentacion('DEPARTAMENTO')).toBe('Departamento');
  });

  it('logs out and redirects to login on cerrarSesion', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    fixture.componentInstance.cerrarSesion();
    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
