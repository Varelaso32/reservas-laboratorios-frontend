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

  it('loads the applicant’s actual agenda and availability, and does not invent the all-day total', () => {
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
    expect(fixture.nativeElement.querySelector('.tarjeta-resumen strong')?.textContent).toBe('—');
    expect(fixture.nativeElement.querySelector('.tarjeta-resumen:first-child small')).toBeNull();
    expect(texto).toContain('Validado');
    expect(fixture.nativeElement.querySelectorAll('.tarjeta-espacio').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.badge-disponible')?.textContent).toContain('Disponible');
    expect(fixture.nativeElement.querySelector('.boton-reservar')?.getAttribute('href')).toBe('/espacios');
    expect(fixture.nativeElement.querySelector('.tarjeta-espacio button[routerLink="/espacios"]')).toBeTruthy();
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
    expect(fixture.nativeElement.querySelector('.tarjeta-resumen strong')?.textContent).toBe('—');
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
});
