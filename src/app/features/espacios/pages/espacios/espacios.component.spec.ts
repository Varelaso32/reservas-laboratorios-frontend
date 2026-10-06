import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/services/auth.service';
import { authGuard } from '../../../../core/guards/auth.guard';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { SolicitudReservaComponent } from '../../../reservas/pages/solicitud-reserva/solicitud-reserva.component';
import { EspaciosComponent } from './espacios.component';

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
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['add']) }
      ]
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
    expect(fixture.nativeElement.textContent).toContain('Reservar ahora');
    expect(fixture.nativeElement.querySelector('.boton-aprobar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.boton-rechazar')).toBeNull();
    const puntoEspacio = fixture.nativeElement.querySelector('.tarjeta .punto') as HTMLElement;
    expect(puntoEspacio.style.backgroundColor).toBe('rgb(216, 137, 69)');
    expect(fixture.nativeElement.querySelector('.estado-disponible')).toBeNull();
    expect(fixture.nativeElement.querySelector('.estado-ocupado')).toBeNull();
    expect(fixture.nativeElement.querySelector('.estado-reservado')).toBeNull();
    expect(fixture.nativeElement.querySelector('.amenities')).toBeNull();
    expect(fixture.nativeElement.querySelector('.tarjeta')?.textContent).not.toMatch(
      /solicitudes|pendientes/i
    );

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
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/dashboard"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/calendario"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/espacios"]')).toBeTruthy();
    expect(menuText).toContain('Configuración');
    expect(menuText).not.toContain('Panel Admin');
    expect(menuText).not.toContain('Pendientes');
    expect(fixture.nativeElement.querySelector('.accion-solicitudes')).toBeNull();
  });

  it('shows a real Panel Admin link but no admin requests action to APROBADOR', () => {
    const authService = TestBed.inject(AuthService);
    authService.obtenerUsuarioActual()!.rol = 'APROBADOR';
    fixture.detectChanges();

    const menuText = (fixture.nativeElement.querySelector('.menu') as HTMLElement).textContent ?? '';
    expect(menuText).toContain('Panel Admin');
    expect(menuText).not.toContain('Pendientes');
    const adminLink = fixture.nativeElement.querySelector(
      '.menu a[routerLink="/admin/espacios"]'
    ) as HTMLAnchorElement;
    expect(adminLink).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/dashboard"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/calendario"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/espacios"]')).toBeTruthy();
    expect(menuText).toContain('Configuración');
    expect(getComputedStyle(adminLink).textDecorationLine).toBe('none');
    expect(fixture.nativeElement.querySelector('.accion-solicitudes')).toBeNull();
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
