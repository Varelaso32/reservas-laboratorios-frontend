import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { authGuard } from '../../../../core/guards/auth.guard';
import { routes } from '../../../../app.routes';
import { fechaColombia, horaColombia } from '../../../../shared/utils/fecha-colombia.util';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let httpTestingController: HttpTestingController;
  let messageService: MessageService;
  let relojInstalado = false;

  const usuario = {
    id: 4,
    nombre: 'María González López',
    email: 'maria@example.test',
    rol: 'SOLICITANTE' as const,
    cargo: 'DOCENTE' as const
  };

  const espacio = {
    id: 42,
    nombre: 'Laboratorio de Redes',
    tipo: 'LABORATORIO' as const,
    capacidad: 25,
    ubicacion: 'Bloque A, piso 2'
  };

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
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
    if (relojInstalado) {
      jasmine.clock().uninstall();
      relojInstalado = false;
    }
    httpTestingController.verify();
    sessionStorage.clear();
  });

  function crearDashboard(rol: 'SOLICITANTE' | 'APROBADOR' | 'ADMIN' = 'SOLICITANTE'): void {
    sessionStorage.setItem('access_token', 'spec-session-token');
    sessionStorage.setItem('usuario', JSON.stringify({ ...usuario, rol }));
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
  }

  function obtenerDisponibilidad() {
    return httpTestingController.expectOne(request =>
      request.url === `${API_BASE_URL}/espacios/disponibles` &&
      request.params.has('fecha') &&
      request.params.has('hora_inicio') &&
      request.params.has('hora_fin')
    );
  }

  it('loads the applicant’s actual agenda, counts active reservations today, and validates availability', () => {
    crearDashboard();
    const reservas = httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`);
    expect(reservas.request.method).toBe('GET');
    const disponibilidad = obtenerDisponibilidad();
    expect(disponibilidad.request.method).toBe('GET');
    expect(disponibilidad.request.params.get('fecha')).toBe(fechaColombia(new Date()));
    const horaInicio = disponibilidad.request.params.get('hora_inicio')!;
    const horaFin = disponibilidad.request.params.get('hora_fin')!;
    expect(horaFin).not.toBe(horaInicio);
    disponibilidad.flush([espacio]);

    const inicio = new Date(Date.now() + 10 * 60_000).toISOString();
    const fin = new Date(Date.now() + 40 * 60_000).toISOString();
    reservas.flush([
      {
        id: 51,
        estado: 'ACTIVA',
        espacio,
        inicio,
        fin,
        solicitud_id: 15
      },
      {
        id: 52,
        estado: 'CANCELADA',
        espacio,
        inicio,
        fin,
        solicitud_id: 16
      }
    ]);
    const detalle = httpTestingController.expectOne(`${API_BASE_URL}/reservas/51`);
    expect(detalle.request.method).toBe('GET');
    detalle.flush({
      id: 51,
      estado: 'ACTIVA',
      espacio,
      inicio,
      fin,
      solicitud_id: 15,
      finalizada: false,
      titular: usuario.nombre,
      proposito: 'Clase de redes',
      asistentes: 12,
      equipamiento: null,
      aprobada_por: 'Coordinación',
      fecha_aprobacion: null,
      creada_en: inicio
    });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Dashboard');
    expect(texto).toContain('Agenda de hoy');
    expect(texto).toContain('Laboratorio de Redes');
    expect(texto).toContain('Clase de redes');
    expect(texto).toContain('Próxima');
    expect(fixture.nativeElement.querySelectorAll('.fila-agenda').length).toBe(1);
    expect(texto).toContain('Total reservas hoy');
    expect(fixture.nativeElement.querySelector('.tarjeta-resumen strong')?.textContent?.trim()).toBe('1');
    expect(fixture.nativeElement.querySelector('.tarjeta-resumen:first-child small')?.textContent)
      .toContain('Reservas activas de tu cuenta');
    expect(texto).toContain('Validado');
    expect(fixture.nativeElement.querySelectorAll('.tarjeta-espacio').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.badge-disponible')?.textContent).toContain('Disponible');
    expect(fixture.nativeElement.querySelector('.boton-reservar')?.getAttribute('href')).toBe('/espacios');
    expect(fixture.nativeElement.querySelector('.tarjeta-espacio button[routerLink="/espacios"]')).toBeTruthy();
  });

  it('formats a backend reservation with Colombia offset as 20:28–22:28', () => {
    const fechaReserva = fechaColombia(new Date());
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(`${fechaReserva}T12:00:00-05:00`));
    relojInstalado = true;
    crearDashboard();
    const inicio = `${fechaReserva}T20:28:00`;
    const fin = `${fechaReserva}T22:28:00`;
    obtenerDisponibilidad().flush([]);
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`).flush([{
      id: 71,
      estado: 'ACTIVA',
      espacio,
      inicio,
      fin,
      solicitud_id: 31
    }]);
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/71`).flush({
      id: 71,
      estado: 'ACTIVA',
      espacio,
      inicio,
      fin,
      solicitud_id: 31,
      finalizada: false,
      titular: usuario.nombre,
      proposito: 'Prueba de horario',
      asistentes: 10,
      equipamiento: null,
      aprobada_por: 'Coordinación',
      fecha_aprobacion: null,
      creada_en: inicio
    });
    fixture.detectChanges();

    const horario = fixture.nativeElement.querySelector('.horario-agenda strong')?.textContent;
    expect(horario).toContain('20:28 – 22:28');
    expect(fixture.componentInstance.formatearHora(inicio)).toBe('20:28');
    expect(fixture.componentInstance.formatearHora(fin)).toBe('22:28');
    expect(fixture.nativeElement.querySelector('.tarjeta-resumen strong')?.textContent?.trim()).toBe('1');
  });

  it('confirms cancellation, posts without a body and refreshes the agenda and counter', () => {
    crearDashboard();
    const inicio = new Date(Date.now() + 60 * 60_000).toISOString();
    const fin = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
    obtenerDisponibilidad().flush([]);
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`).flush([{
      id: 81,
      estado: 'ACTIVA',
      espacio,
      inicio,
      fin,
      solicitud_id: 41
    }]);
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/81`).flush({
      id: 81,
      estado: 'ACTIVA',
      espacio,
      inicio,
      fin,
      solicitud_id: 41,
      finalizada: false,
      titular: usuario.nombre,
      proposito: 'Reserva próxima',
      asistentes: 10,
      equipamiento: null,
      aprobada_por: 'Coordinación',
      fecha_aprobacion: null,
      creada_en: inicio
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fila-agenda')).toBeTruthy();
    const cancelar = fixture.nativeElement.querySelector('.cancelar-reserva') as HTMLButtonElement;
    expect(cancelar).toBeTruthy();
    cancelar.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeTruthy();

    (fixture.nativeElement.querySelector('.boton-confirmar') as HTMLButtonElement).click();
    fixture.detectChanges();
    const request = httpTestingController.expectOne(`${API_BASE_URL}/reservas/81/cancelar`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect((fixture.nativeElement.querySelector('.boton-confirmar') as HTMLButtonElement).disabled).toBeTrue();
    request.flush({
      id: 81,
      estado: 'CANCELADA',
      espacio,
      inicio,
      fin,
      solicitud_id: 41
    });
    const refresh = httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`);
    expect(refresh.request.method).toBe('GET');
    refresh.flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.fila-agenda')).toBeNull();
    expect(fixture.nativeElement.querySelector('.tarjeta-resumen strong')?.textContent?.trim()).toBe('0');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'dashboard',
      severity: 'success',
      summary: 'Reserva cancelada'
    }));
  });

  it('does not offer cancellation for a reservation that has already started', () => {
    crearDashboard();
    const inicio = new Date(Date.now() - 10 * 60_000).toISOString();
    const fin = new Date(Date.now() + 20 * 60_000).toISOString();
    obtenerDisponibilidad().flush([]);
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`).flush([{
      id: 82,
      estado: 'ACTIVA',
      espacio,
      inicio,
      fin,
      solicitud_id: 42
    }]);
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/82`).flush({
      id: 82,
      estado: 'ACTIVA',
      espacio,
      inicio,
      fin,
      solicitud_id: 42,
      finalizada: false,
      titular: usuario.nombre,
      proposito: 'Reserva en curso',
      asistentes: 10,
      equipamiento: null,
      aprobada_por: 'Coordinación',
      fecha_aprobacion: null,
      creada_en: inicio
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cancelar-reserva')).toBeNull();
    expect(fixture.nativeElement.querySelector('.fila-agenda').textContent).not.toContain('Cancelar');
  });

  it('shows the HTTP 409 cancellation conflict without changing the reservation locally', () => {
    crearDashboard();
    const inicio = new Date(Date.now() + 30 * 60_000).toISOString();
    const fin = new Date(Date.now() + 60 * 60_000).toISOString();
    obtenerDisponibilidad().flush([]);
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`).flush([{
      id: 83,
      estado: 'ACTIVA',
      espacio,
      inicio,
      fin,
      solicitud_id: 43
    }]);
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/83`).flush({
      id: 83,
      estado: 'ACTIVA',
      espacio,
      inicio,
      fin,
      solicitud_id: 43,
      finalizada: false,
      titular: usuario.nombre,
      proposito: 'Reserva próxima',
      asistentes: 10,
      equipamiento: null,
      aprobada_por: 'Coordinación',
      fecha_aprobacion: null,
      creada_en: inicio
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.cancelar-reserva') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.boton-confirmar') as HTMLButtonElement).click();

    httpTestingController.expectOne(`${API_BASE_URL}/reservas/83/cancelar`).flush(
      { detail: 'La reserva ya inició.' },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.fila-agenda')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.cancelar-reserva')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.dialogo-confirmacion')).toBeTruthy();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'dashboard',
      severity: 'warn',
      summary: 'No se puede cancelar la reserva',
      detail: 'La reserva ya inició y no se puede cancelar.'
    }));
    httpTestingController.expectNone(`${API_BASE_URL}/reservas/mias`);
  });

  it('keeps Dashboard, Calendar, Spaces and Admin navigation for APROBADOR without requesting a forbidden list', () => {
    crearDashboard('APROBADOR');
    httpTestingController.expectNone(`${API_BASE_URL}/reservas/mias`);
    obtenerDisponibilidad().flush([]);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.menu a') as NodeListOf<HTMLAnchorElement>;
    const routesByText = Array.from(links).map(link => ({
      text: link.textContent?.trim(),
      href: link.getAttribute('href')
    }));
    expect(routesByText).toContain(jasmine.objectContaining({ text: 'Dashboard', href: '/dashboard' }));
    expect(routesByText).toContain(jasmine.objectContaining({ text: 'Calendario', href: '/calendario' }));
    expect(routesByText).toContain(jasmine.objectContaining({ text: 'Espacios', href: '/espacios' }));
    expect(routesByText).toContain(jasmine.objectContaining({ text: 'Panel Admin', href: '/admin/espacios' }));
    expect(fixture.nativeElement.querySelector('.menu').textContent).toContain('Configuración');
    expect(fixture.nativeElement.textContent).toContain('No hay reservas disponibles para mostrar.');
    expect(fixture.nativeElement.querySelector('.panel-agenda').textContent)
      .not.toMatch(/backend|endpoint|api|openapi|aprobador/i);
    expect(fixture.nativeElement.querySelector('.tarjeta-resumen:first-child').textContent)
      .not.toMatch(/backend|endpoint|api|openapi|aprobador/i);
    expect(fixture.nativeElement.textContent).not.toContain('No tienes reservas activas para hoy.');
    expect(TestBed.inject(Router).url).not.toBe('/reservas-activas');
  });

  it('does not request the applicant reservation list or invent a total for ADMIN', () => {
    crearDashboard('ADMIN');
    httpTestingController.expectNone(`${API_BASE_URL}/reservas/mias`);
    obtenerDisponibilidad().flush([]);
    fixture.detectChanges();

    const resumenReservas = fixture.nativeElement.querySelector('.tarjeta-resumen:first-child') as HTMLElement;
    expect(resumenReservas.querySelector('strong')?.textContent?.trim()).toBe('—');
    expect(resumenReservas.textContent).not.toMatch(/backend|endpoint|api|openapi|admin/i);
  });

  it('protects Dashboard with authentication without adding role restrictions', () => {
    for (const path of ['dashboard', 'calendario']) {
      const route = routes.find(item => item.path === path);
      expect(route?.canActivate).toContain(authGuard);
      expect(route?.data?.['roles']).toBeUndefined();
    }
  });

  it('shows an empty real agenda when there are no reservations', () => {
    crearDashboard();
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`).flush([]);
    obtenerDisponibilidad().flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No tienes reservas activas para hoy.');
    expect(fixture.nativeElement.querySelectorAll('.fila-agenda').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.tarjeta-resumen strong')?.textContent?.trim()).toBe('0');
  });

  it('shows a real empty agenda for SOLICITANTE and an error Toast on API failure', () => {
    crearDashboard();
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`).flush(
      { detail: 'Servicio temporalmente no disponible.' },
      { status: 503, statusText: 'Service Unavailable' }
    );
    obtenerDisponibilidad().flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar la agenda.');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'dashboard',
      severity: 'error',
      summary: 'Error al cargar la agenda',
      detail: 'Servicio temporalmente no disponible.'
    }));
    expect(fixture.nativeElement.querySelector('p-toast')?.getAttribute('position')).toBe('bottom-right');
  });

  it('keeps availability errors out of the product summary while reporting the real detail in Toast', () => {
    crearDashboard();
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`).flush([]);
    obtenerDisponibilidad().flush(
      { detail: 'Internal endpoint failure' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    fixture.detectChanges();

    const resumen = fixture.nativeElement.querySelector('.tarjeta-resumen:nth-child(2)') as HTMLElement;
    expect(resumen.textContent).toContain('Sin información disponible');
    expect(resumen.textContent).not.toContain('Internal endpoint failure');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'dashboard',
      severity: 'error',
      detail: 'Internal endpoint failure'
    }));
  });
});
