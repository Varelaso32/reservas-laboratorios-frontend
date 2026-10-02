import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { authGuard } from '../../../../core/guards/auth.guard';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { SolicitudReservaComponent } from '../../../reservas/pages/solicitud-reserva/solicitud-reserva.component';
import { SolicitudPendiente } from '../../../../shared/models/solicitud.model';
import { EspaciosComponent } from './espacios.component';

const solicitudPendientePrueba: SolicitudPendiente = {
  id: 51,
  estado: 'PENDIENTE',
  solicitante: {
    id: 9,
    nombre: 'Estudiante de Prueba',
    email: 'estudiante@reservas.test',
    cargo: 'ESTUDIANTE'
  },
  espacio: {
    id: 42,
    nombre: 'Laboratorio de Redes',
    tipo: 'LABORATORIO',
    capacidad: 25,
    ubicacion: 'Bloque A, piso 2'
  },
  inicio: '2026-10-05T11:00:00-05:00',
  fin: '2026-10-05T11:30:00-05:00',
  asistentes: 10,
  creada_en: '2026-10-02T08:00:00-05:00',
  vencida: true
};

describe('EspaciosComponent', () => {
  let component: EspaciosComponent;
  let fixture: ComponentFixture<EspaciosComponent>;
  let httpTestingController: HttpTestingController;
  const usuarioPrueba = {
    id: 4,
    nombre: 'María González López',
    email: 'maria@example.test',
    rol: 'SOLICITANTE' as const,
    cargo: 'DOCENTE' as const
  };

  beforeEach(async () => {
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'spec-session-token');
    sessionStorage.setItem('usuario', JSON.stringify(usuarioPrueba));

    await TestBed.configureTestingModule({
      imports: [EspaciosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EspaciosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpTestingController.expectOne(`${API_BASE_URL}/espacios/`).flush([
      {
        id: 42,
        nombre: 'Laboratorio de Redes',
        tipo: 'LABORATORIO',
        capacidad: 25,
        ubicacion: 'Bloque A, piso 2'
      }
    ]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads real fields and passes the selected space id to the modal', () => {
    expect(fixture.nativeElement.textContent).toContain('LABORATORIO');
    expect(fixture.nativeElement.textContent).toContain('Bloque A, piso 2');
    expect(fixture.nativeElement.textContent).toContain('25 personas');

    const botonReservar = fixture.nativeElement.querySelector(
      '.tarjeta button'
    ) as HTMLButtonElement;
    botonReservar.click();
    fixture.detectChanges();

    const modal = fixture.debugElement.query(By.directive(SolicitudReservaComponent))
      .componentInstance as SolicitudReservaComponent;
    expect(component.modalReservaAbierto).toBeTrue();
    expect(modal.espacio?.id).toBe(42);
    expect(modal.espacio?.capacidad).toBe(25);
  });

  it('renders the authenticated name, initials, role and cargo without a hardcoded profile', () => {
    const sidebar = fixture.nativeElement.querySelector('.usuario') as HTMLElement;
    const avatar = sidebar.querySelector('.avatar') as HTMLElement;
    const profile = fixture.nativeElement.querySelector('.perfil') as HTMLElement;

    expect(sidebar.textContent).toContain(usuarioPrueba.nombre);
    expect(sidebar.textContent).toContain('SOLICITANTE · DOCENTE');
    expect(avatar.textContent?.trim()).toBe('ML');
    expect(profile.textContent?.trim()).toBe('ML');
    expect(sidebar.textContent).not.toContain(['Juan', 'Rodríguez'].join(' '));
  });

  it('hides Panel Admin and Pendientes from SOLICITANTE', () => {
    const menuText = (fixture.nativeElement.querySelector('.menu') as HTMLElement).textContent ?? '';
    expect(menuText).not.toContain('Panel Admin');
    expect(menuText).not.toContain('Pendientes');
    expect(fixture.nativeElement.querySelector('.accion-solicitudes')).toBeNull();
  });

  it('shows Panel Admin and the pending-request action to APROBADOR', () => {
    const authService = TestBed.inject(AuthService);
    authService.obtenerUsuarioActual()!.rol = 'APROBADOR';
    fixture.detectChanges();

    const menuText = (fixture.nativeElement.querySelector('.menu') as HTMLElement).textContent ?? '';
    expect(menuText).toContain('Panel Admin');
    expect(menuText).not.toContain('Pendientes');
    expect(fixture.nativeElement.querySelector('.accion-solicitudes')).toBeTruthy();
  });

  it('shows Panel Admin but not Pendientes to ADMIN', () => {
    const authService = TestBed.inject(AuthService);
    authService.obtenerUsuarioActual()!.rol = 'ADMIN';
    fixture.detectChanges();

    const menuText = (fixture.nativeElement.querySelector('.menu') as HTMLElement).textContent ?? '';
    expect(menuText).toContain('Panel Admin');
    expect(menuText).not.toContain('Pendientes');
    expect(fixture.nativeElement.querySelector('.accion-solicitudes')).toBeNull();
  });

  it('loads one unfiltered pending list and counts only PENDIENTE by space, including expired requests', () => {
    const authService = TestBed.inject(AuthService);
    authService.obtenerUsuarioActual()!.rol = 'APROBADOR';
    component.cargarConteosPendientes();

    const request = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('espacio_id')).toBeFalse();
    request.flush([
      solicitudPendientePrueba,
      { ...solicitudPendientePrueba, id: 52, vencida: false },
      { ...solicitudPendientePrueba, id: 53, estado: 'APROBADA' },
      {
        ...solicitudPendientePrueba,
        id: 54,
        espacio: { ...solicitudPendientePrueba.espacio, id: 77, nombre: 'Sala Norte' }
      }
    ]);
    fixture.detectChanges();

    expect(component.obtenerConteoPendientes(42)).toBe(2);
    expect(component.obtenerConteoPendientes(77)).toBe(1);
    expect(fixture.nativeElement.querySelector('.accion-solicitudes').textContent).toContain(
      'Ver solicitudes · 2'
    );
  });

  it('loads only the selected space in an in-place modal and renders real request fields', () => {
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    authService.obtenerUsuarioActual()!.rol = 'APROBADOR';
    fixture.detectChanges();
    const routeBeforeClick = router.url;

    (fixture.nativeElement.querySelector('.accion-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();

    const request = httpTestingController.expectOne(
      request => request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
        request.params.get('espacio_id') === '42'
    );
    expect(request.request.method).toBe('GET');
    request.flush([
      solicitudPendientePrueba,
      {
        ...solicitudPendientePrueba,
        id: 55,
        espacio: { ...solicitudPendientePrueba.espacio, id: 77, nombre: 'Sala Norte' }
      }
    ]);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.modal-solicitudes') as HTMLElement;
    expect(component.modalSolicitudesAbierto).toBeTrue();
    expect(router.url).toBe(routeBeforeClick);
    expect(modal.textContent).toContain('Estudiante de Prueba');
    expect(modal.textContent).toContain('estudiante@reservas.test');
    expect(modal.textContent).toContain('Laboratorio de Redes');
    expect(modal.textContent).toContain('Bloque A, piso 2');
    expect(modal.textContent).toContain('10');
    expect(modal.textContent).toContain('PENDIENTE');
    expect(modal.textContent).toContain('Vencida');
    expect(modal.textContent).not.toContain('Sala Norte');
    expect(modal.textContent).not.toContain('LABORATORIO');
    expect(modal.textContent).not.toContain('ESTUDIANTE');
    expect(modal.querySelector('.estado-vencida')).toBeTruthy();
    expect(modal.querySelectorAll('tbody tr').length).toBe(1);
    expect(modal.textContent).not.toMatch(/aprobar|rechazar/i);
  });

  it('shows empty and error states in the modal and allows retry', () => {
    const authService = TestBed.inject(AuthService);
    authService.obtenerUsuarioActual()!.rol = 'APROBADOR';
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.accion-solicitudes') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpTestingController.expectOne(
      request => request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
        request.params.get('espacio_id') === '42'
    ).flush([], { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('No tienes permiso para consultar estas solicitudes.');

    (fixture.nativeElement.querySelector('.error-solicitudes button') as HTMLButtonElement).click();
    const retry = httpTestingController.expectOne(
      request => request.url === `${API_BASE_URL}/solicitudes/pendientes` &&
        request.params.get('espacio_id') === '42'
    );
    retry.flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay solicitudes pendientes para este espacio.'
    );
  });

  it('shows only the role when cargo is null, without null or dangling separators', () => {
    const authService = TestBed.inject(AuthService);
    authService.obtenerUsuarioActual()!.cargo = null;
    fixture.detectChanges();

    const sidebar = fixture.nativeElement.querySelector('.usuario') as HTMLElement;
    const subtitle = sidebar.querySelector('small')?.textContent?.trim();
    expect(subtitle).toBe('SOLICITANTE');
    expect(subtitle).not.toContain('null');
    expect(subtitle).not.toContain('undefined');
    expect(subtitle).not.toContain('·');
  });

  it('shows a discreet sign-out icon and clears session before navigating to login', () => {
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const logoutSpy = spyOn(authService, 'logout').and.callThrough();
    const navigationSpy = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    const logoutButton = fixture.nativeElement.querySelector('.logout') as HTMLButtonElement;

    expect(logoutButton.getAttribute('aria-label')).toBe('Cerrar sesión');
    expect(logoutButton.getAttribute('title')).toBe('Cerrar sesión');
    expect(logoutButton.querySelector('.pi-sign-out')).toBeTruthy();

    logoutButton.click();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('usuario')).toBeNull();
    expect(authService.tieneSesionActiva()).toBeFalse();
    expect(navigationSpy).toHaveBeenCalledOnceWith('/login');
  });

  it('redirects protected navigation to login after logout', () => {
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    authService.logout();

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });
});
