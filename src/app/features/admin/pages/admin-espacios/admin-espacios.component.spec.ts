/// <reference types="jasmine" />
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { API_BASE_URL } from '../../../../core/config/api.config';
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
    if (rolActual === 'ADMIN') {
      httpTestingController.expectOne(`${API_BASE_URL}/espacios/admin`).flush(espaciosAdmin);
      const metricRequest = httpTestingController.expectOne(request =>
        request.url === `${API_BASE_URL}/espacios/metricas` && request.params.has('fecha')
      );
      expect(metricRequest.request.method).toBe('GET');
      expect(metricRequest.request.params.get('fecha')).toBe(fixture.componentInstance.fechaMetricas);
      metricRequest.flush(metricas);
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
    expect(solicitudes[0].querySelector('td:nth-child(4)')?.textContent?.trim()).toBe('0');
    expect(solicitudes[0].querySelector('td:nth-child(6)')?.textContent?.trim()).toBe('0%');
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
    globalRefresh.flush([]);
    spaceRefresh.flush([]);
    historialRefresh.flush([]);
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

  it('submits Nuevo espacio modal and notifies that backend action is not supported', () => {
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

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'admin-espacios',
      severity: 'warn',
      summary: 'Acción no soportada en backend'
    }));
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

  it('allows ADMIN to inspect history without loading pending requests or approval controls', () => {
    crearPagina('ADMIN');
    cargarEspacios();
    (fixture.nativeElement.querySelector('.ver-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();

    const historial = httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/solicitudes/resueltas` &&
      request.params.get('espacio_id') === '42'
    );
    historial.flush([]);
    fixture.detectChanges();
    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/pendientes`);
    expect(fixture.nativeElement.querySelector('.encabezado-historial')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.boton-aprobar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.boton-rechazar')).toBeNull();

  });

  it('keeps route access limited to the two existing admin roles', () => {
    const adminRoute = routes.find(route => route.path === 'admin/espacios');
    expect(adminRoute?.canActivate?.length).toBe(2);
    expect(adminRoute?.data?.['roles']).toEqual(['APROBADOR', 'ADMIN']);
    const usersRoute = routes.find(route => route.path === 'admin/usuarios');
    expect(usersRoute?.data?.['roles']).toEqual(['ADMIN']);
  });
});