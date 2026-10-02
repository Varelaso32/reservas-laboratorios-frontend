import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { routes } from '../../../../app.routes';
import { AdminEspaciosComponent } from './admin-espacios.component';

describe('AdminEspaciosComponent', () => {
  let fixture: ComponentFixture<AdminEspaciosComponent>;
  let httpTestingController: HttpTestingController;

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
        provideRouter(routes)
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  function crearPagina(rol: 'APROBADOR' | 'ADMIN'): void {
    sessionStorage.setItem('access_token', 'spec-session-token');
    sessionStorage.setItem('usuario', JSON.stringify({
      id: 2,
      nombre: 'Coordinador de Laboratorios',
      email: 'coordinador@reservas.test',
      rol,
      cargo: 'COORDINADOR_LABORATORIOS'
    }));

    fixture = TestBed.createComponent(AdminEspaciosComponent);
    fixture.detectChanges();
  }

  function cargarEspacios(): void {
    httpTestingController.expectOne(`${API_BASE_URL}/espacios/`).flush(espacios);
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
      { ...solicitudPendiente, id: 53, estado: 'APROBADA' },
      { ...solicitudPendiente, id: 54, espacio: { ...espacios[1] } }
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
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/espacios"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.nuevo-espacio').disabled).toBeTrue();

    const solicitudes = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLElement[];
    expect(solicitudes[0].querySelectorAll('.sin-dato').length).toBe(4);
    expect(solicitudes[1].textContent).toContain('—');
  });

  it('filters modal requests by selected space without navigating and shows real fields only', () => {
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

    const modal = fixture.nativeElement.querySelector('.modal-solicitudes') as HTMLElement;
    expect(router.url).toBe(urlBeforeClick);
    expect(modal.textContent).toContain('Estudiante de Prueba');
    expect(modal.textContent).toContain('estudiante@reservas.test');
    expect(modal.textContent).toContain('Laboratorio de Redes');
    expect(modal.textContent).toContain('Bloque A, piso 2');
    expect(modal.textContent).toContain('PENDIENTE');
    expect(modal.textContent).toContain('Vencida');
    expect(modal.querySelectorAll('tbody tr').length).toBe(1);
    expect(modal.textContent).not.toMatch(/aprobar|rechazar|tipo de actividad/i);
  });

  it('shows the admin table for ADMIN without calling pending requests or showing the action', () => {
    crearPagina('ADMIN');
    cargarEspacios();

    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/pendientes`);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Panel Admin');
    expect(fixture.nativeElement.querySelector('.ver-solicitudes')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.sin-dato').length).toBe(10);
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/espacios"]')).toBeTruthy();
  });

  it('keeps route access limited to the two existing admin roles', () => {
    const adminRoute = routes.find(route => route.path === 'admin/espacios');
    expect(adminRoute?.canActivate?.length).toBe(2);
    expect(adminRoute?.data?.['roles']).toEqual(['APROBADOR', 'ADMIN']);
  });
});