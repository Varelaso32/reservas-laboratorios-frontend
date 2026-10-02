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

  function evaluarGuard() {
    const snapshot = { data: { roles: ['APROBADOR'] } } as unknown as ActivatedRouteSnapshot;
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

  it('does not register a standalone pending-requests route', () => {
    expect(routes.some(item => item.path === 'solicitudes-pendientes')).toBeFalse();
  });
});