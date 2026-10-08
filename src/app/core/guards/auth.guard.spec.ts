import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let sesionActiva = false;

  beforeEach(() => {
    sesionActiva = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            tieneSesionActiva: () => sesionActiva
          }
        }
      ]
    });
  });

  function evaluarGuard() {
    const dummyRoute = {} as ActivatedRouteSnapshot;
    const dummyState = {} as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));
  }

  it('debe permitir navegacion si tiene sesion activa', () => {
    sesionActiva = true;
    const resultado = evaluarGuard();
    expect(resultado).toBeTrue();
  });

  it('debe redirigir a /login mediante UrlTree si no tiene sesion activa', () => {
    sesionActiva = false;
    const resultado = evaluarGuard();
    expect(resultado instanceof UrlTree).toBeTrue();
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(resultado as UrlTree)).toBe('/login');
  });
});

