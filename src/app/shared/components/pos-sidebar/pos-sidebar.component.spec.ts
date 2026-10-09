import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { PosSidebarComponent } from './pos-sidebar.component';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../core/models/auth.models';

describe('PosSidebarComponent', () => {
  let component: PosSidebarComponent;
  let fixture: ComponentFixture<PosSidebarComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  const mockUsuario: Usuario = {
    id: 1,
    nombre: 'Julian Gonzalez',
    email: 'julian@ecci.edu.co',
    rol: 'APROBADOR',
    cargo: 'COORDINADOR_LABORATORIOS'
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'tieneSesionActiva',
      'obtenerUsuarioActual',
      'logout'
    ]);

    authServiceSpy.tieneSesionActiva.and.returnValue(true);
    authServiceSpy.obtenerUsuarioActual.and.returnValue(mockUsuario);

    await TestBed.configureTestingModule({
      imports: [PosSidebarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PosSidebarComponent);
    component = fixture.componentInstance;
    component.seccionActiva = 'dashboard';
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe calcular iniciales con dos nombres/apellidos', () => {
    expect(component.inicialesUsuario).toBe('JG');
  });

  it('debe calcular iniciales con un solo nombre', () => {
    authServiceSpy.obtenerUsuarioActual.and.returnValue({
      ...mockUsuario,
      nombre: 'Administrador'
    });
    expect(component.inicialesUsuario).toBe('AD');
  });

  it('debe retornar cadena vacia si no hay usuario o nombre', () => {
    authServiceSpy.tieneSesionActiva.and.returnValue(false);
    authServiceSpy.obtenerUsuarioActual.and.returnValue(null);
    expect(component.inicialesUsuario).toBe('');
    expect(component.rolCargoUsuario).toBe('');
  });

  it('debe mostrar rol y cargo formateados', () => {
    expect(component.rolCargoUsuario).toBe('APROBADOR · COORDINADOR_LABORATORIOS');
  });

  it('debe mostrar solo rol si cargo no esta presente', () => {
    authServiceSpy.obtenerUsuarioActual.and.returnValue({
      ...mockUsuario,
      cargo: null
    });
    expect(component.rolCargoUsuario).toBe('APROBADOR');
  });

  it('debe cerrar sesion y navegar a /login', () => {
    component.cerrarSesion();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
