import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { routes } from '../../../../app.routes';
import { sumarDiasFecha } from '../../../../shared/utils/fecha-colombia.util';
import { CalendarioComponent } from './calendario.component';

describe('CalendarioComponent', () => {
  let fixture: ComponentFixture<CalendarioComponent>;
  let component: CalendarioComponent;
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
      imports: [CalendarioComponent],
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

  function crearCalendario(rol: 'SOLICITANTE' | 'APROBADOR' | 'ADMIN' = 'SOLICITANTE'): void {
    sessionStorage.setItem('access_token', 'spec-session-token');
    sessionStorage.setItem('usuario', JSON.stringify({ ...usuario, rol }));
    fixture = TestBed.createComponent(CalendarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('renders real active reservations in the correct week day and time, with frontend week navigation', () => {
    crearCalendario();
    const request = httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`);
    expect(request.request.method).toBe('GET');
    const fechaReserva = sumarDiasFecha(component.hoy, 1);
    request.flush([
      {
        id: 51,
        estado: 'ACTIVA',
        espacio,
        inicio: `${fechaReserva}T09:00:00-05:00`,
        fin: `${fechaReserva}T10:00:00-05:00`,
        solicitud_id: 15
      },
      {
        id: 52,
        estado: 'CANCELADA',
        espacio,
        inicio: `${fechaReserva}T11:00:00-05:00`,
        fin: `${fechaReserva}T12:00:00-05:00`,
        solicitud_id: 16
      }
    ]);
    fixture.detectChanges();

    const fechaSemanaReserva = component.diasSemana.some(dia => dia.fecha === fechaReserva);
    if (!fechaSemanaReserva) {
      (fixture.nativeElement.querySelector('[aria-label="Semana siguiente"]') as HTMLButtonElement).click();
      fixture.detectChanges();
    }
    const dia = component.diasSemana.find(item => item.fecha === fechaReserva)!;
    const columnas = fixture.nativeElement.querySelectorAll('.columna-dia') as NodeListOf<HTMLElement>;
    const columna = Array.from(columnas)
      .find(element => element.getAttribute('aria-label') === `${dia.nombre} ${dia.numero}`)!;
    const bloque = columna.querySelector('.bloque-reserva') as HTMLElement;
    expect(fixture.nativeElement.textContent).toContain('Calendario');
    expect(fixture.nativeElement.textContent).toContain('Semana');
    expect(bloque.textContent).toContain('Laboratorio de Redes');
    expect(bloque.getAttribute('aria-label')).toContain('09:00 a 10:00');
    expect(getComputedStyle(bloque.querySelector('strong') as HTMLElement).fontSize).toBe('9px');
    expect(getComputedStyle(bloque.querySelector('strong') as HTMLElement).webkitLineClamp).toBe('2');
    expect(Number.parseFloat(bloque.style.top)).toBeCloseTo((9 / 24) * 100, 1);
    expect(Number.parseFloat(bloque.style.height)).toBeCloseTo((1 / 24) * 100, 1);
    expect(columna.querySelectorAll('.bloque-reserva').length).toBe(1);

    (fixture.nativeElement.querySelector('[aria-label="Semana anterior"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.bloque-reserva').length).toBe(0);
    (fixture.nativeElement.querySelector('[aria-label="Semana siguiente"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.bloque-reserva').length).toBe(1);
  });

  it('keeps Colombia wall-clock times and renders a 20:28–22:28 reservation on the correct day', () => {
    crearCalendario();
    const fechaReserva = sumarDiasFecha(component.hoy, 1);
    const inicio = `${fechaReserva}T20:28:00`;
    const fin = `${fechaReserva}T22:28:00`;
    const inicioUtc = `${sumarDiasFecha(fechaReserva, 1)}T01:28:00Z`;
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`).flush([{
      id: 71,
      estado: 'ACTIVA',
      espacio: { ...espacio, nombre: 'Laboratorio de Electrónica' },
      inicio,
      fin,
      solicitud_id: 31
    }]);
    fixture.detectChanges();

    if (!component.diasSemana.some(dia => dia.fecha === fechaReserva)) {
      component.semanaSiguiente();
      fixture.detectChanges();
    }
    const dia = component.diasSemana.find(item => item.fecha === fechaReserva)!;
    const columna = Array.from(
      fixture.nativeElement.querySelectorAll('.columna-dia') as NodeListOf<HTMLElement>
    ).find(element => element.getAttribute('aria-label') === `${dia.nombre} ${dia.numero}`)!;
    const bloque = columna.querySelector('.bloque-reserva') as HTMLElement;
    const inicioEnMinutos = 20 * 60 + 28;
    const duracionEnMinutos = 2 * 60;

    expect(component.hora(inicio)).toBe('20:28');
    expect(component.hora(fin)).toBe('22:28');
    expect(component.hora(inicioUtc)).toBe('20:28');
    expect(component.reservasDelDia(fechaReserva)).toContain(jasmine.objectContaining({ id: 71 }));
    expect(bloque.textContent).toContain('Laboratorio de Electrónica');
    expect(bloque.getAttribute('aria-label')).toContain('20:28 a 22:28');
    expect(Number.parseFloat(bloque.style.top))
      .toBeCloseTo(inicioEnMinutos / (24 * 60) * 100, 2);
    expect(Number.parseFloat(bloque.style.height))
      .toBeCloseTo(duracionEnMinutos / (24 * 60) * 100, 2);
    expect(component.horas[0]).toBe(0);
    expect(component.horas[23]).toBe(23);
    expect(getComputedStyle(fixture.nativeElement.querySelector('.contenedor-calendario')).overflowY)
      .toBe('auto');
  });

  it('loads weekly reservations for APROBADOR using agenda endpoint and preserves navigation', () => {
    crearCalendario('APROBADOR');
    httpTestingController.expectNone(`${API_BASE_URL}/reservas/mias`);
    const reqAgenda = httpTestingController.expectOne(req =>
      req.url === `${API_BASE_URL}/reservas/` &&
      req.params.get('fecha_inicio') === component.semanaInicio &&
      req.params.get('fecha_fin') === sumarDiasFecha(component.semanaInicio, 6)
    );
    expect(reqAgenda.request.method).toBe('GET');
    const fechaReserva = component.diasSemana[1].fecha;
    reqAgenda.flush([
      {
        id: 75,
        estado: 'ACTIVA',
        espacio,
        inicio: `${fechaReserva}T09:00:00-05:00`,
        fin: `${fechaReserva}T10:00:00-05:00`,
        solicitud_id: 35
      }
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Calendario');
    expect(fixture.nativeElement.querySelectorAll('.bloque-reserva').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Laboratorio de Redes');
    expect(fixture.nativeElement.querySelector('.mensaje-no-disponible')).toBeNull();
    expect(getComputedStyle(fixture.nativeElement.querySelector('.contenedor-calendario')).overflowX)
      .toBe('auto');
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/dashboard"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/calendario"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/espacios"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/admin/espacios"]')).toBeTruthy();
  });

  it('loads weekly reservations for ADMIN using agenda endpoint and refreshes on week navigation', () => {
    crearCalendario('ADMIN');
    httpTestingController.expectNone(`${API_BASE_URL}/reservas/mias`);
    const reqAgenda = httpTestingController.expectOne(req =>
      req.url === `${API_BASE_URL}/reservas/` &&
      req.params.get('fecha_inicio') === component.semanaInicio &&
      req.params.get('fecha_fin') === sumarDiasFecha(component.semanaInicio, 6)
    );
    expect(reqAgenda.request.method).toBe('GET');
    reqAgenda.flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.bloque-reserva').length).toBe(0);

    // Navigating to next week queries the new week range
    component.semanaSiguiente();
    const reqSiguiente = httpTestingController.expectOne(req =>
      req.url === `${API_BASE_URL}/reservas/` &&
      req.params.get('fecha_inicio') === component.semanaInicio &&
      req.params.get('fecha_fin') === sumarDiasFecha(component.semanaInicio, 6)
    );
    const fechaReservaNext = component.diasSemana[2].fecha;
    reqSiguiente.flush([
      {
        id: 85,
        estado: 'ACTIVA',
        espacio,
        inicio: `${fechaReservaNext}T14:00:00-05:00`,
        fin: `${fechaReservaNext}T16:00:00-05:00`,
        solicitud_id: 45
      }
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.bloque-reserva').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Laboratorio de Redes');
  });

  it('shows an empty calendar with no fabricated events and reports API errors through Toast', () => {
    crearCalendario();
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rejilla-calendario')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.bloque-reserva').length).toBe(0);

    (fixture.nativeElement.querySelector('[aria-label="Semana siguiente"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.bloque-reserva').length).toBe(0);
  });

  it('shows a backend error message in a bottom-right Toast', () => {
    crearCalendario();
    httpTestingController.expectOne(`${API_BASE_URL}/reservas/mias`).flush(
      { detail: 'No se pudo consultar el listado.' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    fixture.detectChanges();

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'calendario',
      severity: 'error',
      summary: 'Error al cargar el calendario',
      detail: 'No se pudo consultar el listado.'
    }));
    expect(fixture.nativeElement.querySelector('p-toast')?.getAttribute('position')).toBe('bottom-right');
  });
});
