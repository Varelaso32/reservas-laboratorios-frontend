/// <reference types="jasmine" />
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { AuthService } from '../../../../core/services/auth.service';
import { routes } from '../../../../app.routes';
import { AdminEspaciosComponent } from './admin-espacios.component';

describe('AdminEspaciosComponent', () => {
  let fixture: ComponentFixture<AdminEspaciosComponent>;
  let httpTestingController: HttpTestingController;
  let messageService: MessageService;
  let rolActual: 'APROBADOR' | 'ADMIN' = 'APROBADOR';

  const espacios = [
    {
      id: 42,
      nombre: 'Laboratorio de Redes',
      tipo: 'LABORATORIO' as const,
      capacidad: 25,
      ubicacion: 'Bloque A, piso 2'
    },
    {
      id: 77,
      nombre: 'Sala Norte',
      tipo: 'SALA' as const,
      capacidad: 18,
      ubicacion: null
    }
  ];
  const espaciosAdmin = [
    { ...espacios[0], activo: true },
    { ...espacios[1], activo: false }
  ];
  const metricas = [
    {
      ...espaciosAdmin[0],
      fecha: '2026-10-07',
      reservas_dia: 6,
      minutos_reservados: 360,
      minutos_disponibles: 540,
      porcentaje_ocupacion: 40
    },
    {
      ...espaciosAdmin[1],
      fecha: '2026-10-07',
      reservas_dia: 0,
      minutos_reservados: 0,
      minutos_disponibles: 900,
      porcentaje_ocupacion: null
    }
  ];

  const solicitudPendiente = {
    id: 51,
    estado: 'PENDIENTE' as const,
    solicitante: {
      id: 9,
      nombre: 'Estudiante de Prueba',
      email: 'estudiante@reservas.test',
      cargo: 'ESTUDIANTE' as const
    },
    espacio: {
      ...espacios[0]
    },
    inicio: '2026-10-05T11:00:00-05:00',
    fin: '2026-10-05T11:30:00-05:00',
    asistentes: 10,
    creada_en: '2026-10-02T08:00:00-05:00',
    vencida: true
  };

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminEspaciosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        MessageService
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    messageService = TestBed.inject(MessageService);
    spyOn(messageService, 'add');
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  function crearPagina(rol: 'APROBADOR' | 'ADMIN'): void {
    rolActual = rol;
    sessionStorage.setItem('access_token', 'spec-session-token');
    sessionStorage.setItem('usuario', JSON.stringify({
      id: 2,
      nombre: 'Coordinador de Laboratorios',
      email: 'coordinador@reservas.test',
      rol,
      cargo: rol === 'ADMIN' ? 'ADMINISTRADOR_SISTEMA' : 'COORDINADOR_LABORATORIOS'
    }));

    fixture = TestBed.createComponent(AdminEspaciosComponent);
    fixture.detectChanges();
  }

  function cargarEspacios(): void {
    if (rolActual === 'ADMIN' || rolActual === 'APROBADOR') {
      httpTestingController.expectOne(`${API_BASE_URL}/espacios/admin`).flush(espaciosAdmin);
      const metricRequest = httpTestingController.expectOne(request =>
        request.url === `${API_BASE_URL}/espacios/metricas` && request.params.has('fecha')
      );
      expect(metricRequest.request.method).toBe('GET');
      expect(metricRequest.request.params.get('fecha')).toBe(fixture.componentInstance.fechaMetricas);
      metricRequest.flush(metricas);
      if (rolActual === 'ADMIN') {
        const pendientes = httpTestingController.match(`${API_BASE_URL}/solicitudes/pendientes`);
        pendientes.forEach(r => r.flush([]));
      }
    } else {
      httpTestingController.expectOne(`${API_BASE_URL}/espacios/`).flush(espacios);
    }
    fixture.detectChanges();
  }

  function cargarHistorialVacio(): void {
    httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/resueltas` &&
      request.params.get('espacio_id') === '42'
    ).flush([]);
    fixture.detectChanges();
  }

  function respuestaDetalle() {
    return {
      ...solicitudPendiente,
      proposito: 'Práctica de redes inalámbricas',
      equipamiento: 'Proyector y computadores',
      motivo_rechazo: null,
      decidido_por: null,
      fecha_decision: null
    };
  }

  function respuestaAprobacion() {
    return {
      mensaje: 'Solicitud aprobada y reserva generada.',
      solicitud: { ...respuestaDetalle(), estado: 'APROBADA' as const },
      reserva: {
        id: 81,
        solicitud_id: 51,
        espacio_id: 42,
        espacio_nombre: 'Laboratorio de Redes',
        inicio: solicitudPendiente.inicio,
        fin: solicitudPendiente.fin,
        estado: 'ACTIVA' as const
      }
    };
  }

  function abrirModalConDetalle(): void {
    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();
    cargarHistorialVacio();
    httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      request.params.get('espacio_id') === '42'
    ).flush([solicitudPendiente]);
    fixture.detectChanges();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51`).flush(respuestaDetalle());
    fixture.detectChanges();
  }

  it('renders the admin table and obtains one global count for APROBADOR', () => {
    crearPagina('APROBADOR');
    cargarEspacios();

    const pendientes = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`);
    expect(pendientes.request.method).toBe('GET');
    expect(pendientes.request.params.has('espacio_id')).toBeFalse();
    pendientes.flush([
      solicitudPendiente,
      { ...solicitudPendiente, id: 52, vencida: false },
      { ...solicitudPendiente, id: 53, estado: 'APROBADA' }
    ]);
    fixture.detectChanges();

    const headerElements = fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>;
    const headers = Array.from(headerElements).map(header => header.textContent?.trim());
    expect(headers).toEqual([
      'ESPACIO', 'UBICACIÓN', 'CAPACIDAD', 'RESERVAS HOY', 'SOLICITUDES',
      'OCUPACIÓN', 'ESTADO', 'ACCIONES'
    ]);
    expect(fixture.nativeElement.textContent).toContain('2 espacios registrados');
    expect(fixture.nativeElement.textContent).toContain('Laboratorio de Redes');
    expect(fixture.nativeElement.textContent).toContain('Bloque A, piso 2');
    expect(fixture.nativeElement.textContent).toContain('25 pers.');
    expect(fixture.nativeElement.textContent).toContain('Ver solicitudes · 2');
    expect(getComputedStyle(fixture.nativeElement.querySelector('tbody td')).paddingTop)
      .toBe('8px');
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/espacios"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/admin/usuarios"]')).toBeNull();
    expect(Array.from(fixture.nativeElement.querySelectorAll('.menu .inactivo') as NodeListOf<HTMLElement>)
      .some(item => item.textContent?.includes('Usuarios'))).toBeFalse();
    expect(fixture.nativeElement.querySelector('.nuevo-espacio').disabled).toBeFalse();

    const solicitudes = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLElement[];
    expect(solicitudes[0].querySelectorAll('.sin-dato')).toHaveSize(0);
    expect(solicitudes[0].querySelector('td:nth-child(4)')?.textContent?.trim()).toBe('6');
    expect(solicitudes[0].querySelector('td:nth-child(6)')?.textContent?.trim()).toBe('40%');
    expect(solicitudes[0].querySelector('.ver-solicitudes.con-pendientes')?.textContent)
      .toContain('Ver solicitudes · 2');
    expect(solicitudes[1].querySelector('.ver-solicitudes.con-pendientes')).toBeNull();
    expect(solicitudes[1].querySelector('.ver-solicitudes')?.textContent?.trim())
      .toBe('Ver solicitudes');
    expect(solicitudes[0].querySelector('.badge-estado')?.textContent?.trim()).toBe('Activo');
    expect(solicitudes[0].querySelector('.identificador-color')?.getAttribute('style'))
      .toContain('background-color');
    expect(solicitudes[0].querySelector('.codigo-espacio')).toBeNull();
    expect(solicitudes[0].querySelectorAll('.accion-espacio')).toHaveSize(2);
    httpTestingController.expectNone(request =>
      request.url.startsWith(`${API_BASE_URL}/espacios/`) &&
      ['PUT', 'PATCH', 'DELETE'].includes(request.method)
    );
    httpTestingController.expectNone(request => request.url.includes('/reservas/'));
    expect(fixture.nativeElement.querySelector('.nuevo-espacio').classList.contains('nuevo-espacio')).toBeTrue();
  });

  it('refreshes real pending counts from the API when returning to the admin page', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ver-solicitudes')?.textContent)
      .toContain('Ver solicitudes');

    fixture.componentInstance.cargarConteosPendientes();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ver-solicitudes.con-pendientes')?.textContent)
      .toContain('Ver solicitudes · 1');
  });

  it('shows pending requests as inline cards and loads details only for the selected space', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([
      solicitudPendiente
    ]);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const urlBeforeClick = router.url;
    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();
    cargarHistorialVacio();

    const request = httpTestingController.expectOne(
      pending => pending.url === `${API_BASE_URL}/solicitudes/pendientes` &&
        pending.params.get('espacio_id') === '42'
    );
    request.flush([
      solicitudPendiente,
      { ...solicitudPendiente, id: 52, estado: 'APROBADA' },
      { ...solicitudPendiente, id: 53, espacio: { ...espacios[1] } }
    ]);
    fixture.detectChanges();

    const detailRequest = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51`);
    expect(detailRequest.request.method).toBe('GET');
    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/52`);
    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/53`);
    detailRequest.flush(respuestaDetalle());
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.modal-solicitudes') as HTMLElement;
    const card = fixture.nativeElement.querySelector('.card-solicitud') as HTMLElement;
    expect(getComputedStyle(card).padding).toBe('12px 13px 10px');
    expect(router.url).toBe(urlBeforeClick);
    expect(modal.textContent).toContain('Solicitudes · Laboratorio de Redes');
    expect(modal.textContent).toContain('1 pendiente');
    expect(modal.textContent).toContain('PENDIENTES DE REVISIÓN');
    expect(modal.textContent).toContain('Estudiante de Prueba');
    expect(modal.textContent).toContain('estudiante@reservas.test');
    expect(modal.textContent).toContain('Laboratorio de Redes');
    expect(modal.textContent).toContain('Pendiente');
    expect(modal.textContent).toContain('Vencida');
    expect(modal.textContent).toContain('Práctica de redes inalámbricas');
    expect(modal.textContent).toContain('Proyector y computadores');
    expect(modal.textContent).toContain('10');
    expect(modal.textContent).toContain('5/10/2026');
    expect(modal.textContent).toContain('2/10/2026');
    expect(modal.querySelectorAll('.card-solicitud').length).toBe(1);
    expect(modal.querySelector('.boton-detalle')).toBeNull();
    expect(modal.querySelector('.volver-solicitudes')).toBeNull();
    expect(modal.querySelector('.boton-aprobar')).toBeTruthy();
    expect(modal.textContent).not.toMatch(/tipo de actividad|REQ-\d+/i);
    expect(modal.querySelector('.boton-rechazar')?.textContent).toContain('Rechazar');
  });

  it('loads admin spaces and real occupancy metrics without requesting approval actions', () => {
    crearPagina('ADMIN');
    cargarEspacios();

    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/pendientes`);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Panel Admin');
    expect(fixture.nativeElement.querySelector('.ver-solicitudes')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.sin-dato').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.ver-solicitudes').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.accion-espacio').length).toBe(4);
    const filas = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>;
    expect(filas[0].querySelector('td:nth-child(4)')?.textContent?.trim()).toBe('6');
    expect(filas[0].querySelector('td:nth-child(6)')?.textContent).toContain('40%');
    expect(filas[1].querySelector('td:nth-child(6)')?.textContent?.trim()).toBe('—');
    expect(filas[0].querySelector('.badge-estado')?.textContent?.trim()).toBe('Activo');
    expect(filas[1].querySelector('.badge-estado')?.textContent?.trim()).toBe('Inactivo');
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/espacios"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/admin/usuarios"]')).toBeTruthy();
  });

  it('shows loading and loads one detail request for each pending card on modal open', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();
    cargarHistorialVacio();
    const pendingRequest = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      request.params.get('espacio_id') === '42'
    );
    pendingRequest.flush([
      solicitudPendiente,
      { ...solicitudPendiente, id: 52, inicio: '2026-10-06T12:00:00-05:00' }
    ]);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.card-solicitud') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('[role="status"]')?.textContent).toContain('Cargando información');
    const firstDetail = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51`);
    const secondDetail = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/52`);
    expect(firstDetail.request.method).toBe('GET');
    expect(secondDetail.request.method).toBe('GET');
    firstDetail.flush(respuestaDetalle());
    secondDetail.flush({ ...respuestaDetalle(), id: 52, proposito: 'Reunión de proyecto', equipamiento: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Práctica de redes inalámbricas');
    expect(fixture.nativeElement.textContent).toContain('Reunión de proyecto');
    expect(fixture.nativeElement.textContent).toContain('No especificado');
  });

  it('shows per-card detail errors and reports them through Toast', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();
    cargarHistorialVacio();
    httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      request.params.get('espacio_id') === '42'
    ).flush([solicitudPendiente]);
    fixture.detectChanges();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51`).flush(
      { detail: 'No tienes acceso a esta solicitud.' },
      { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-detalle[role="alert"]')?.textContent)
      .toContain('No tienes acceso a esta solicitud.');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Error al cargar una solicitud'
    }));
  });

  it('approves using the selected id without a payload, disables duplicate actions and refreshes real data', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();
    cargarHistorialVacio();
    httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      request.params.get('espacio_id') === '42'
    ).flush([solicitudPendiente]);
    fixture.detectChanges();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51`).flush(respuestaDetalle());
    fixture.detectChanges();

    const approveButton = fixture.nativeElement.querySelector('.boton-aprobar') as HTMLButtonElement;
    expect(approveButton.textContent).toContain('Aprobar reserva');
    approveButton.click();
    fixture.detectChanges();
    expect(approveButton.disabled).toBeTrue();
    expect(approveButton.getAttribute('aria-busy')).toBe('true');
    approveButton.click();
    fixture.detectChanges();

    const approval = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51/aprobar`);
    expect(approval.request.method).toBe('POST');
    expect(approval.request.body).toBeNull();
    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/51/aprobar`);
    approval.flush(respuestaAprobacion());

    const messageService = TestBed.inject(MessageService);
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'solicitudes-acciones',
      severity: 'success',
      summary: 'Reserva aprobada',
      detail: 'La solicitud fue aprobada correctamente.'
    }));
    const toast = fixture.nativeElement.querySelector('p-toast') as HTMLElement;
    expect(toast.getAttribute('position')).toBe('bottom-right');

    const globalRefresh = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      !request.params.has('espacio_id')
    );
    const spaceRefresh = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      request.params.get('espacio_id') === '42'
    );
    const historialRefresh = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/resueltas` &&
      request.params.get('espacio_id') === '42'
    );
    const metricRefresh = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/espacios/metricas` &&
      request.params.has('fecha')
    );
    globalRefresh.flush([]);
    spaceRefresh.flush([]);
    historialRefresh.flush([]);
    metricRefresh.flush(metricas);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('0 pendientes');
    expect(fixture.nativeElement.querySelector('.card-solicitud')).toBeNull();
    expect(fixture.nativeElement.querySelector('.badge-aprobada')).toBeNull();
  });

  it('keeps the request pending and shows the backend message when approval returns 409', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();
    cargarHistorialVacio();
    httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      request.params.get('espacio_id') === '42'
    ).flush([solicitudPendiente]);
    fixture.detectChanges();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51`).flush(respuestaDetalle());
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.boton-aprobar') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51/aprobar`).flush(
      { detail: 'La solicitud está vencida.' },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.card-solicitud').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('1 pendiente');
    expect((fixture.nativeElement.querySelector('.boton-aprobar') as HTMLButtonElement).disabled)
      .toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'solicitudes-acciones',
      severity: 'warn',
      detail: 'La solicitud está vencida.'
    }));
    httpTestingController.expectNone(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      !request.params.has('espacio_id')
    );
  });

  it('shows an error Toast and keeps pending requests when approval fails', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();
    cargarHistorialVacio();
    httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      request.params.get('espacio_id') === '42'
    ).flush([solicitudPendiente]);
    fixture.detectChanges();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51`).flush(respuestaDetalle());
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.boton-aprobar') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51/aprobar`).flush(
      { detail: 'Error al procesar la aprobación.' },
      { status: 500, statusText: 'Internal Server Error' }
    );

    expect(fixture.nativeElement.querySelectorAll('.card-solicitud').length).toBe(1);
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'solicitudes-acciones',
      severity: 'error',
      detail: 'Error al procesar la aprobación.'
    }));
  });

  it('opens the reject dialog without sending a request and validates the required reason', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    abrirModalConDetalle();

    (fixture.nativeElement.querySelector('.boton-rechazar') as HTMLButtonElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.dialogo-rechazo') as HTMLElement;
    const textarea = dialog.querySelector('textarea') as HTMLTextAreaElement;
    const confirmButton = dialog.querySelector('.boton-confirmar-rechazo') as HTMLButtonElement;
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(dialog.textContent).toContain('¿Confirmar rechazo de esta solicitud?');
    expect(dialog.textContent).toContain('Motivo del rechazo');
    expect(confirmButton.disabled).toBeTrue();
    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/51/rechazar`);

    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirmButton.disabled).toBeTrue();

    textarea.value = 'x'.repeat(501);
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirmButton.disabled).toBeTrue();

    textarea.value = '  Falta disponibilidad  ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirmButton.disabled).toBeFalse();
    expect(dialog.textContent).toContain('24 / 500');
    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/51/rechazar`);
  });

  it('cancels rejection without a request and clears the reason', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    abrirModalConDetalle();
    (fixture.nativeElement.querySelector('.boton-rechazar') as HTMLButtonElement).click();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('#motivo-rechazo') as HTMLTextAreaElement;
    textarea.value = 'Motivo que se debe limpiar';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.boton-cancelar-rechazo') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dialogo-rechazo')).toBeNull();
    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/51/rechazar`);
    (fixture.nativeElement.querySelector('.boton-rechazar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#motivo-rechazo') as HTMLTextAreaElement).value).toBe('');
  });

  it('rejects with the trimmed reason and real id, blocks duplicates, then refreshes pending data', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    abrirModalConDetalle();
    (fixture.nativeElement.querySelector('.boton-rechazar') as HTMLButtonElement).click();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('#motivo-rechazo') as HTMLTextAreaElement;
    textarea.value = '  Falta disponibilidad  ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const confirmButton = fixture.nativeElement.querySelector('.boton-confirmar-rechazo') as HTMLButtonElement;
    confirmButton.click();
    fixture.detectChanges();
    expect(confirmButton.disabled).toBeTrue();
    confirmButton.click();

    const rechazo = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51/rechazar`);
    expect(rechazo.request.method).toBe('POST');
    expect(rechazo.request.body).toEqual({ motivo: 'Falta disponibilidad' });
    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/51/rechazar`);
    rechazo.flush({ mensaje: 'Solicitud rechazada', solicitud: { ...respuestaDetalle(), estado: 'RECHAZADA' } });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dialogo-rechazo')).toBeNull();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'solicitudes-acciones',
      severity: 'success',
      summary: 'Solicitud rechazada',
      detail: 'La solicitud fue rechazada correctamente.'
    }));
    const globalRefresh = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      !request.params.has('espacio_id')
    );
    const spaceRefresh = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      request.params.get('espacio_id') === '42'
    );
    const historialRefresh = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/resueltas` &&
      request.params.get('espacio_id') === '42'
    );
    globalRefresh.flush([]);
    spaceRefresh.flush([]);
    historialRefresh.flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('0 pendientes');
    expect(fixture.nativeElement.querySelector('.card-solicitud')).toBeNull();
    expect(fixture.nativeElement.querySelector('.badge-rechazada')).toBeNull();
  });

  it('keeps the request and rejection dialog open after a 409 using backend detail', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    abrirModalConDetalle();
    (fixture.nativeElement.querySelector('.boton-rechazar') as HTMLButtonElement).click();
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('#motivo-rechazo') as HTMLTextAreaElement;
    textarea.value = 'No disponible';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.boton-confirmar-rechazo') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51/rechazar`).flush(
      { detail: 'La solicitud ya fue procesada.' },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dialogo-rechazo')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.card-solicitud').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('1 pendiente');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'solicitudes-acciones',
      severity: 'warn',
      detail: 'La solicitud ya fue procesada.'
    }));
    httpTestingController.expectNone(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes`
    );
  });

  it('keeps the request and open dialog after a rejection server error', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    abrirModalConDetalle();
    (fixture.nativeElement.querySelector('.boton-rechazar') as HTMLButtonElement).click();
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('#motivo-rechazo') as HTMLTextAreaElement;
    textarea.value = 'No disponible';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.boton-confirmar-rechazo') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51/rechazar`).flush(
      { detail: 'Error de servicio.' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dialogo-rechazo')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.card-solicitud').length).toBe(1);
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      detail: 'Error de servicio.'
    }));
  });

  it('edits only changed supported space fields and refreshes admin data', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    const editButton = fixture.nativeElement.querySelector(
      '[aria-label="Editar Laboratorio de Redes"]'
    ) as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    const nombre = fixture.nativeElement.querySelector('.overlay-admin input[type="text"]') as HTMLInputElement;
    nombre.value = 'Laboratorio Redes';
    nombre.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.boton-principal-admin') as HTMLButtonElement).click();

    const patch = httpTestingController.expectOne(`${API_BASE_URL}/espacios/42`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ nombre: 'Laboratorio Redes' });
    patch.flush({ ...espaciosAdmin[0], nombre: 'Laboratorio Redes' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.overlay-admin')).toBeNull();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'admin-espacios',
      severity: 'success',
      summary: 'Espacio actualizado'
    }));
    cargarEspacios();
  });

  it('updates space to Mantenimiento in edit modal, calling PATCH /estado with activo: false and displaying Mantenimiento badge', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    const editButton = fixture.nativeElement.querySelector(
      '[aria-label="Editar Laboratorio de Redes"]'
    ) as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    fixture.componentInstance.estadoEspacioVisual = 'Mantenimiento';
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.boton-guardar-figma') as HTMLButtonElement).click();

    const patch = httpTestingController.expectOne(`${API_BASE_URL}/espacios/42/estado`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ activo: false });
    patch.flush({ ...espaciosAdmin[0], activo: false });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.overlay-admin')).toBeNull();
    expect(fixture.componentInstance.etiquetaEstadoEspacio(42)).toBe('Mantenimiento');
    cargarEspacios();
  });

  it('opens and closes the Nuevo espacio modal for ADMIN', () => {
    crearPagina('ADMIN');
    cargarEspacios();

    const nuevoBoton = fixture.nativeElement.querySelector('.nuevo-espacio') as HTMLButtonElement;
    expect(nuevoBoton.disabled).toBeFalse();
    nuevoBoton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#titulo-crear-espacio')?.textContent).toContain('Nuevo espacio');
    expect(fixture.componentInstance.modalCrearEspacioAbierto).toBeTrue();

    const cancelarBoton = fixture.nativeElement.querySelector('.dialogo-crear-espacio-figma .boton-cancelar-figma') as HTMLButtonElement;
    cancelarBoton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.modalCrearEspacioAbierto).toBeFalse();
  });

  it('submits Nuevo espacio modal and calls POST /espacios/ successfully', () => {
    crearPagina('ADMIN');
    cargarEspacios();

    (fixture.nativeElement.querySelector('.nuevo-espacio') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.formularioNuevoEspacio = {
      codigo: 'L105',
      edificio: 'B',
      nombre: 'Laboratorio de Multimedia',
      piso: 'Piso 2',
      capacidad: 25,
      estado: 'Activo'
    };
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.dialogo-crear-espacio-figma .boton-guardar-figma') as HTMLButtonElement).click();
    fixture.detectChanges();

    const postReq = httpTestingController.expectOne(`${API_BASE_URL}/espacios/`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      nombre: 'Laboratorio de Multimedia',
      tipo: 'LABORATORIO',
      capacidad: 25,
      ubicacion: 'Edificio B, Piso 2'
    });
    postReq.flush({
      id: 99,
      nombre: 'Laboratorio de Multimedia',
      tipo: 'LABORATORIO',
      capacidad: 25,
      ubicacion: 'Edificio B, Piso 2',
      activo: true
    });
    fixture.detectChanges();

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'admin-espacios',
      severity: 'success',
      summary: 'Espacio creado'
    }));
    expect(fixture.componentInstance.modalCrearEspacioAbierto).toBeFalse();
    cargarEspacios();
  });

  it('confirms deactivation and uses the estado PATCH without deleting spaces', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    (fixture.nativeElement.querySelector('[aria-label="Desactivar Laboratorio de Redes"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')?.textContent)
      .toContain('no elimina el espacio');
    (fixture.nativeElement.querySelector('.boton-principal-admin') as HTMLButtonElement).click();

    const patch = httpTestingController.expectOne(`${API_BASE_URL}/espacios/42/estado`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ activo: false });
    patch.flush({ ...espaciosAdmin[0], activo: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
    httpTestingController.expectNone(request => request.method === 'DELETE');
    cargarEspacios();
  });

  it('loads real resolved request history with filters and shows decision details', () => {
    crearPagina('APROBADOR');
    cargarEspacios();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`).flush([solicitudPendiente]);
    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      request.params.get('espacio_id') === '42'
    ).flush([solicitudPendiente]);
    fixture.detectChanges();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51`).flush(respuestaDetalle());
    fixture.detectChanges();

    const historial = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/resueltas` &&
      request.params.get('espacio_id') === '42'
    );
    expect(historial.request.method).toBe('GET');
    const aprobada = {
      id: 61,
      estado: 'APROBADA',
      solicitante: solicitudPendiente.solicitante,
      espacio: espacios[0],
      inicio: '2026-10-08T11:00:00-05:00',
      fin: '2026-10-08T12:00:00-05:00',
      asistentes: 10,
      decidida_por: 'Coordinación',
      fecha_decision: '2026-10-07T10:00:00-05:00',
      motivo_rechazo: null
    };
    const rechazada = {
      ...aprobada,
      id: 62,
      estado: 'RECHAZADA',
      decidida_por: 'Coordinación Académica',
      motivo_rechazo: 'El espacio no está disponible.'
    };
    historial.flush([aprobada, rechazada]);
    fixture.detectChanges();

    const texto = fixture.nativeElement.querySelector('.historial-solicitudes')?.textContent as string;
    expect(texto).toContain('Estudiante de Prueba');
    expect(texto).toContain('Laboratorio de Redes');
    expect(texto).toContain('Coordinación');
    expect(texto).toContain('El espacio no está disponible.');
    expect(fixture.nativeElement.querySelector('.badge-aprobada')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.badge-rechazada')).toBeTruthy();

    const filtro = fixture.nativeElement.querySelector('.filtros-historial select') as HTMLSelectElement;
    filtro.value = 'RECHAZADA';
    filtro.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const filtrada = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/resueltas` &&
      request.params.get('espacio_id') === '42' &&
      request.params.get('estado') === 'RECHAZADA'
    );
    filtrada.flush([rechazada]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.card-historial').length).toBe(1);
  });

  it('allows ADMIN to manage requests and inspect history', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
      request.params.get('espacio_id') === '42'
    ).flush([solicitudPendiente]);
    fixture.detectChanges();
    httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51`).flush(respuestaDetalle());
    fixture.detectChanges();

    const historial = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/resueltas` &&
      request.params.get('espacio_id') === '42'
    );
    historial.flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.encabezado-historial')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.boton-aprobar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.boton-rechazar')).toBeTruthy();
  });

  it('keeps route access limited to the two existing admin roles', () => {
    const adminRoute = routes.find(route => route.path === 'admin/espacios');
    expect(adminRoute?.canActivate?.length).toBe(2);
    expect(adminRoute?.data?.['roles']).toEqual(['APROBADOR', 'ADMIN']);
    const usersRoute = routes.find(route => route.path === 'admin/usuarios');
    expect(usersRoute?.data?.['roles']).toEqual(['ADMIN']);
  });

  it('handles user initials formatting and empty name', () => {
    const authService = TestBed.inject(AuthService);
    spyOn(authService, 'obtenerUsuarioActual').and.returnValue({
      id: 2,
      nombre: 'Coordinador de Laboratorios',
      email: 'coordinador@reservas.test',
      rol: 'ADMIN',
      cargo: 'ADMINISTRADOR_SISTEMA'
    });
    crearPagina('ADMIN');
    cargarEspacios();
    expect(fixture.componentInstance.inicialesUsuario).toBe('CL');

    (authService.obtenerUsuarioActual as jasmine.Spy).and.returnValue({
      id: 2,
      nombre: 'Admin',
      email: 'admin@reservas.test',
      rol: 'ADMIN',
      cargo: 'ADMINISTRADOR_SISTEMA'
    });
    expect(fixture.componentInstance.inicialesUsuario).toBe('AD');

    (authService.obtenerUsuarioActual as jasmine.Spy).and.returnValue({
      id: 2,
      nombre: '   ',
      email: 'admin@reservas.test',
      rol: 'ADMIN',
      cargo: 'ADMINISTRADOR_SISTEMA'
    });
    expect(fixture.componentInstance.inicialesUsuario).toBe('');
  });

  it('handles errors when loading spaces and metrics', () => {
    crearPagina('ADMIN');
    httpTestingController.expectOne(`${API_BASE_URL}/espacios/admin`).flush(
      { detail: 'Fallo al cargar espacios' },
      { status: 500, statusText: 'Error' }
    );
    httpTestingController.expectOne(request => request.url === `${API_BASE_URL}/espacios/metricas`).flush(
      { detail: 'Fallo métricas' },
      { status: 500, statusText: 'Error' }
    );
    const pendientes = httpTestingController.match(`${API_BASE_URL}/solicitudes/pendientes`);
    pendientes.forEach(r => r.flush([]));
    fixture.detectChanges();

    expect(fixture.componentInstance.errorEspacios).toBe('Fallo al cargar espacios');
    expect(fixture.componentInstance.errorMetricas).toBe('Fallo métricas');
    expect(fixture.componentInstance.cargandoEspacios).toBeFalse();
    expect(fixture.componentInstance.cargandoMetricas).toBeFalse();
  });

  it('handles metrics loading state and occupancy display helpers', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    const comp = fixture.componentInstance;

    comp.cargandoMetricas = true;
    expect(comp.obtenerReservasHoy(42)).toBe('…');
    expect(comp.obtenerOcupacion(42)).toBe('…');

    comp.cargandoMetricas = false;
    expect(comp.obtenerReservasHoy(999)).toBe(0);

    // Inactive space returns '—' and null width
    comp.estadosEspacios.set(77, false);
    expect(comp.obtenerOcupacion(77)).toBe('—');
    expect(comp.obtenerAnchoOcupacion(77)).toBeNull();
    expect(comp.ocupacionNoDisponible(77)).toBeTrue();

    // Custom status label
    comp.estadosPersonalizadosEspacios.set(42, 'Mantenimiento');
    expect(comp.etiquetaEstadoEspacio(42)).toBe('Mantenimiento');
    expect(comp.etiquetaEstadoEspacio(77)).toBe('Inactivo');
  });

  it('handles error when loading pending counts', () => {
    crearPagina('ADMIN');
    httpTestingController.expectOne(`${API_BASE_URL}/espacios/admin`).flush(espaciosAdmin);
    httpTestingController.expectOne(request => request.url === `${API_BASE_URL}/espacios/metricas`).flush(metricas);
    const pendingReq = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`);
    pendingReq.flush({ detail: 'Error' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.errorConteos).toBeTrue();
    expect(fixture.componentInstance.obtenerConteoPendientes(42)).toBe(0);
  });

  it('handles errors when viewing requests and history (403 and 500)', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    const comp = fixture.componentInstance;

    // View requests with 403 error
    comp.verSolicitudes(espacios[0]);
    const reqPend403 = httpTestingController.expectOne(r => r.url === `${API_BASE_URL}/solicitudes/pendientes` && r.params.get('espacio_id') === '42');
    reqPend403.flush(null, { status: 403, statusText: 'Forbidden' });
    const reqRes403 = httpTestingController.expectOne(r => r.url === `${API_BASE_URL}/solicitudes/resueltas` && r.params.get('espacio_id') === '42');
    reqRes403.flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(comp.errorSolicitudes).toBe('No tienes permiso para consultar estas solicitudes.');
    expect(comp.errorResueltas).toBe('No tienes permiso para consultar el historial de este espacio.');

    // View requests with 500 error
    comp.verSolicitudes(espacios[0]);
    const reqPend500 = httpTestingController.expectOne(r => r.url === `${API_BASE_URL}/solicitudes/pendientes` && r.params.get('espacio_id') === '42');
    reqPend500.flush({ detail: 'Error interno' }, { status: 500, statusText: 'Internal Error' });
    const reqRes500 = httpTestingController.expectOne(r => r.url === `${API_BASE_URL}/solicitudes/resueltas` && r.params.get('espacio_id') === '42');
    reqRes500.flush({ detail: 'Error historial' }, { status: 500, statusText: 'Internal Error' });
    fixture.detectChanges();

    expect(comp.errorSolicitudes).toBe('Error interno');
    expect(comp.errorResueltas).toBe('Error historial');
  });

  it('covers edit form helpers: opening, location parsing, visual amenities, visual colors, and cancel', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    const comp = fixture.componentInstance;

    const espacioEd = { ...espacios[0], ubicacion: 'Edificio C, Piso 3' };
    comp.abrirEdicion(espacioEd);
    expect(comp.espacioEnEdicion).toEqual(espacioEd);
    expect(comp.edificioEspacioVisual).toBe('C');
    expect(comp.pisoEspacioVisual).toBe('Piso 3');

    // Toggle amenities
    expect(comp.amenidadesSeleccionadasVisual).toContain('Proyector');
    comp.alternarAmenidadVisual('Proyector');
    expect(comp.amenidadesSeleccionadasVisual).not.toContain('Proyector');
    comp.alternarAmenidadVisual('Proyector');
    expect(comp.amenidadesSeleccionadasVisual).toContain('Proyector');

    // Select color
    comp.seleccionarColorVisual('#ef4444');
    expect(comp.colorSeleccionadoVisual).toBe('#ef4444');

    // Cancel edit
    comp.cancelarEdicion();
    expect(comp.espacioEnEdicion).toBeNull();
  });

  it('covers create space modal helpers and validation', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    const comp = fixture.componentInstance;

    comp.abrirCrearEspacio();
    expect(comp.modalCrearEspacioAbierto).toBeTrue();

    comp.seleccionarColorNuevoEspacio('#10b981');
    expect(comp.colorNuevoEspacioVisual).toBe('#10b981');

    comp.alternarAmenidadNuevoEspacio('WiFi');
    expect(comp.amenidadesNuevoEspacioVisual).toContain('WiFi');
    comp.alternarAmenidadNuevoEspacio('WiFi');
    expect(comp.amenidadesNuevoEspacioVisual).not.toContain('WiFi');

    // Validation failure: invalid nombre or capacidad
    comp.formularioNuevoEspacio.nombre = '   ';
    comp.guardarNuevoEspacio();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'warn',
      summary: 'Revisa los datos'
    }));

    // Successful create with 'Mantenimiento' status and 'Sala' name
    comp.formularioNuevoEspacio = {
      codigo: 'S201',
      edificio: 'B',
      nombre: 'Sala Reuniones B',
      piso: 'Piso 2',
      capacidad: 15,
      estado: 'Mantenimiento'
    };
    comp.guardarNuevoEspacio();
    const reqCreate = httpTestingController.expectOne(`${API_BASE_URL}/espacios/`);
    expect(reqCreate.request.method).toBe('POST');
    expect(reqCreate.request.body.tipo).toBe('SALA');
    expect(reqCreate.request.body.ubicacion).toBe('Edificio B, Piso 2');
    reqCreate.flush({ id: 88, nombre: 'Sala Reuniones B', tipo: 'SALA', capacidad: 15, activo: true });

    // Updating state to inactivo for mantenimiento
    const reqEstado = httpTestingController.expectOne(`${API_BASE_URL}/espacios/88/estado`);
    expect(reqEstado.request.method).toBe('PATCH');
    reqEstado.flush({ id: 88, activo: false });

    // Recargar datos admin
    httpTestingController.expectOne(`${API_BASE_URL}/espacios/admin`).flush([]);
    httpTestingController.expectOne(r => r.url === `${API_BASE_URL}/espacios/metricas`).flush([]);
    const pends = httpTestingController.match(`${API_BASE_URL}/solicitudes/pendientes`);
    pends.forEach(r => r.flush([]));
    fixture.detectChanges();

    expect(comp.modalCrearEspacioAbierto).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));

    // Create space API error
    comp.abrirCrearEspacio();
    comp.formularioNuevoEspacio.nombre = 'Lab Error';
    comp.formularioNuevoEspacio.capacidad = 20;
    comp.guardarNuevoEspacio();
    const reqCreateFail = httpTestingController.expectOne(`${API_BASE_URL}/espacios/`);
    reqCreateFail.flush({ detail: 'Error al crear' }, { status: 500, statusText: 'Error' });
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Error al crear espacio'
    }));

    comp.cerrarCrearEspacio();
    expect(comp.modalCrearEspacioAbierto).toBeFalse();
  });

  it('covers guardarEdicion validation, no-change detection, field updates and status update errors', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    const comp = fixture.componentInstance;

    comp.abrirEdicion(espacios[0]);

    // Validation failure
    comp.formularioEspacio.nombre = '';
    comp.guardarEdicion();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'warn',
      summary: 'Revisa los datos'
    }));

    // No changes -> closes without request
    comp.formularioEspacio.nombre = espacios[0].nombre;
    comp.formularioEspacio.capacidad = espacios[0].capacidad;
    comp.formularioEspacio.tipo = espacios[0].tipo;
    comp.formularioEspacio.ubicacion = espacios[0].ubicacion!;
    comp.estadoEspacioVisual = 'Activo';
    comp.guardarEdicion();
    expect(comp.espacioEnEdicion).toBeNull();

    // Edit fields and status simultaneously
    comp.abrirEdicion(espacios[0]);
    comp.formularioEspacio.nombre = 'Laboratorio Renovado';
    comp.estadoEspacioVisual = 'Mantenimiento';
    comp.guardarEdicion();
    const reqUpdate = httpTestingController.expectOne(`${API_BASE_URL}/espacios/42`);
    reqUpdate.flush({ ...espacios[0], nombre: 'Laboratorio Renovado' });
    const reqStatus = httpTestingController.expectOne(`${API_BASE_URL}/espacios/42/estado`);
    reqStatus.flush({ ...espacios[0], activo: false });

    // Reload admin data
    httpTestingController.expectOne(`${API_BASE_URL}/espacios/admin`).flush([]);
    httpTestingController.expectOne(r => r.url === `${API_BASE_URL}/espacios/metricas`).flush([]);
    const pends = httpTestingController.match(`${API_BASE_URL}/solicitudes/pendientes`);
    pends.forEach(r => r.flush([]));
    fixture.detectChanges();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));

    // Edit fields error handling (409 conflict)
    comp.abrirEdicion(espacios[0]);
    comp.formularioEspacio.nombre = 'Nombre Conflicto';
    comp.guardarEdicion();
    const req409 = httpTestingController.expectOne(`${API_BASE_URL}/espacios/42`);
    req409.flush({ detail: 'Ya existe' }, { status: 409, statusText: 'Conflict' });
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'warn',
      summary: 'No se pueden guardar los cambios'
    }));

    // Edit status only with error
    comp.abrirEdicion(espacios[0]);
    comp.estadoEspacioVisual = 'Mantenimiento';
    comp.guardarEdicion();
    const reqStatusOnly = httpTestingController.expectOne(`${API_BASE_URL}/espacios/42/estado`);
    reqStatusOnly.flush({ detail: 'Error estado' }, { status: 500, statusText: 'Error' });
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Error al cambiar estado'
    }));
  });

  it('covers confirming and cancelling space status toggle with error handling', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    const comp = fixture.componentInstance;

    comp.abrirConfirmacionEstado(espacios[0]);
    expect(comp.espacioCambioEstado).toEqual(espacios[0]);
    comp.cerrarConfirmacionEstado();
    expect(comp.espacioCambioEstado).toBeNull();

    // Confirm status change error
    comp.abrirConfirmacionEstado(espacios[0]);
    comp.confirmarCambioEstado();
    const req = httpTestingController.expectOne(`${API_BASE_URL}/espacios/42/estado`);
    req.flush({ detail: 'No se pudo desactivar' }, { status: 500, statusText: 'Error' });
    expect(comp.actualizandoEstadoId).toBeNull();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Error al cambiar el estado'
    }));
  });

  it('covers closing requests modal, request rejection dialog and detail load errors', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    const comp = fixture.componentInstance;

    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpTestingController.expectOne(r => r.url === `${API_BASE_URL}/solicitudes/pendientes` && r.params.get('espacio_id') === '42').flush([solicitudPendiente]);
    // Detalle fails
    const reqDetalle = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51`);
    reqDetalle.flush({ detail: 'Error detalle' }, { status: 500, statusText: 'Error' });
    httpTestingController.expectOne(r => r.url === `${API_BASE_URL}/solicitudes/resueltas` && r.params.get('espacio_id') === '42').flush([]);
    fixture.detectChanges();

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Error al cargar una solicitud'
    }));

    // Rejection dialog
    comp.abrirDialogoRechazo(51);
    expect(comp.solicitudRechazoId).toBe(51);
    comp.cancelarRechazo();
    expect(comp.solicitudRechazoId).toBeNull();

    // Rejection error (500)
    comp.abrirDialogoRechazo(51);
    comp.rechazarSolicitud(51, 'Motivo de rechazo válido');
    const reqRechazo = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/51/rechazar`);
    reqRechazo.flush({ detail: 'Error al rechazar' }, { status: 500, statusText: 'Error' });
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Error al rechazar la solicitud'
    }));

    // Close requests modal
    comp.cerrarSolicitudes();
    expect(comp.espacioSeleccionado).toBeNull();
    expect(comp.solicitudes.length).toBe(0);
  });

  it('covers logout in cerrarSesion', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    fixture.componentInstance.cerrarSesion();
    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});