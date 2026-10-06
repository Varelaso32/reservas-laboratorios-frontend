import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter
} from '@angular/router';

import { routes } from '../../app.routes';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let rol: 'APROBADOR' | 'SOLICITANTE' | 'ADMIN';
  let sesionActiva: boolean;

  beforeEach(() => {
    rol = 'APROBADOR';
    sesionActiva = true;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            tieneSesionActiva: () => sesionActiva,
            obtenerUsuarioActual: () => ({ rol })
          }
        }
      ]
    });
  });

  function evaluarGuard(roles: string[] = ['APROBADOR']) {
    const snapshot = { data: { roles } } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() =>
      roleGuard(snapshot, {} as RouterStateSnapshot)
    );
  }

  it('allows APROBADOR and blocks SOLICITANTE and ADMIN for this role-only route', () => {
    expect(evaluarGuard()).toBeTrue();

    rol = 'SOLICITANTE';
    let result = evaluarGuard();
    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/espacios');

    rol = 'ADMIN';
    result = evaluarGuard();
    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/espacios');
  });

  it('redirects missing sessions to login', () => {
    sesionActiva = false;
    const result = evaluarGuard();
    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('protects the admin spaces route for APROBADOR and ADMIN and omits the standalone route', () => {
    const adminRoute = routes.find(item => item.path === 'admin/espacios');
    expect(adminRoute?.canActivate).toEqual([authGuard, roleGuard]);
    expect(adminRoute?.data?.['roles']).toEqual(['APROBADOR', 'ADMIN']);
    expect(routes.some(item => item.path === 'solicitudes-pendientes')).toBeFalse();
  });

  it('allows only ADMIN to access user management', () => {
    const usersRoute = routes.find(item => item.path === 'admin/usuarios');
    expect(usersRoute?.canActivate).toEqual([authGuard, roleGuard]);
    expect(usersRoute?.data?.['roles']).toEqual(['ADMIN']);

    rol = 'ADMIN';
    let result = evaluarGuard(['ADMIN']);
    expect(result).toBeTrue();

    rol = 'APROBADOR';
    result = evaluarGuard(['ADMIN']);
    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/espacios');

    rol = 'SOLICITANTE';
    result = evaluarGuard(['ADMIN']);
    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/espacios');
  });
});