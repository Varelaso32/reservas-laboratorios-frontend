import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { routes } from '../../../../app.routes';
import { AdminUsuariosComponent } from './admin-usuarios.component';

describe('AdminUsuariosComponent', () => {
  let fixture: ComponentFixture<AdminUsuariosComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'admin-session-token');
    sessionStorage.setItem('usuario', JSON.stringify({
      id: 1,
      nombre: 'Super Administrador',
      email: 'admin@reservas.test',
      rol: 'ADMIN',
      cargo: 'ADMINISTRADOR_SISTEMA'
    }));

    await TestBed.configureTestingModule({
      imports: [AdminUsuariosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes)
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminUsuariosComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('renders the users admin page without fabricating a listing or metrics', () => {
    const text = fixture.nativeElement.textContent as string;
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>
    ).map(header => header.textContent?.trim());

    expect(text).toContain('Usuarios');
    expect(text).toContain('— usuarios registrados');
    expect(text).toContain('La información de usuarios no está disponible.');
    expect(headers).toEqual([
      'USUARIO', 'ROL', 'RESERVAS ESTE MES', 'ESTADO', 'ACCIONES'
    ]);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('tbody .avatar').length).toBe(0);
    httpTestingController.expectNone(() => true);
  });

  it('keeps the Figma filter chips and disables unsupported user actions', () => {
    const filters = Array.from(
      fixture.nativeElement.querySelectorAll('.filtro') as NodeListOf<HTMLButtonElement>
    );
    expect(filters.map(filter => filter.textContent?.trim()))
      .toEqual(['Todos', 'Docentes', 'Estudiantes', 'Operadores']);
    expect(filters.every(filter => filter.disabled && filter.getAttribute('aria-disabled') === 'true'))
      .toBeTrue();

    const createButton = fixture.nativeElement.querySelector('.nuevo-usuario') as HTMLButtonElement;
    expect(createButton.textContent).toContain('Nuevo usuario');
    expect(createButton.disabled).toBeTrue();
    expect(createButton.getAttribute('aria-disabled')).toBe('true');
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/admin/espacios"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu a[routerLink="/admin/usuarios"]')).toBeTruthy();
  });

  it('restricts user management to ADMIN', () => {
    const route = routes.find(item => item.path === 'admin/usuarios');
    expect(route?.canActivate?.length).toBe(2);
    expect(route?.data?.['roles']).toEqual(['ADMIN']);
  });
});
