import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../../core/services/auth.service';
import { RespuestaLogin, UsuarioDetalleOut } from '../../../../core/models/auth.models';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  const mockLoginResponse: RespuestaLogin = {
    access_token: 'fake-token',
    token_type: 'bearer',
    expira_en: 3600,
    usuario: {
      id: 1,
      nombre: 'Julian Gonzalez',
      email: 'julian@ecci.edu.co',
      rol: 'APROBADOR',
      cargo: 'COORDINADOR_LABORATORIOS'
    }
  };

  const mockRegistroResponse: UsuarioDetalleOut = {
    id: 2,
    nombre: 'Nuevo Usuario',
    email: 'nuevo@ecci.edu.co',
    rol: 'SOLICITANTE',
    cargo: null,
    activo: true,
    creado_en: '2026-10-08T10:00:00Z'
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'registro']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('debe crearse correctamente en vista login', () => {
    expect(component).toBeTruthy();
    expect(component.vista).toBe('login');
  });

  it('debe cambiar de vista y limpiar mensajes', () => {
    component.mensajeError = 'Error previo';
    component.cambiarVista('registro');
    expect(component.vista).toBe('registro');
    expect(component.mensajeError).toBeNull();
  });

  it('no debe llamar al login si el formulario es invalido', () => {
    component.iniciarSesion();
    expect(component.formLogin.invalid).toBeTrue();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('debe iniciar sesion correctamente y navegar a /espacios', () => {
    authServiceSpy.login.and.returnValue(of(mockLoginResponse));
    component.formLogin.setValue({
      email: 'julian@ecci.edu.co',
      password: 'password123'
    });

    component.iniciarSesion();

    expect(authServiceSpy.login).toHaveBeenCalledWith('julian@ecci.edu.co', 'password123');
    expect(component.cargando).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/espacios');
  });

  it('debe manejar error de inicio de sesion', () => {
    const error = new HttpErrorResponse({
      error: { detail: 'Credenciales invalidas' },
      status: 401
    });
    authServiceSpy.login.and.returnValue(throwError(() => error));

    component.formLogin.setValue({
      email: 'julian@ecci.edu.co',
      password: 'wrong'
    });

    component.iniciarSesion();

    expect(component.cargando).toBeFalse();
    expect(component.mensajeError).toBe('Credenciales invalidas');
  });

  it('no debe registrar si el formulario de registro es invalido', () => {
    component.cambiarVista('registro');
    component.solicitarAcceso();
    expect(component.formRegistro.invalid).toBeTrue();
    expect(authServiceSpy.registro).not.toHaveBeenCalled();
  });

  it('debe registrar y autologuear al usuario', () => {
    authServiceSpy.registro.and.returnValue(of(mockRegistroResponse));
    authServiceSpy.login.and.returnValue(of(mockLoginResponse));

    component.cambiarVista('registro');
    component.formRegistro.setValue({
      nombre: 'Nuevo Usuario',
      email: 'nuevo@ecci.edu.co',
      password: 'Password123!',
      confirmarPassword: 'Password123!'
    });

    component.solicitarAcceso();

    expect(authServiceSpy.registro).toHaveBeenCalled();
    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/espacios');
  });

  it('debe manejar error de registro mostrando el detalle', () => {
    const error = new HttpErrorResponse({
      error: { detail: 'El correo ya existe' },
      status: 400
    });
    authServiceSpy.registro.and.returnValue(throwError(() => error));

    component.cambiarVista('registro');
    component.formRegistro.setValue({
      nombre: 'Nuevo Usuario',
      email: 'nuevo@ecci.edu.co',
      password: 'Password123!',
      confirmarPassword: 'Password123!'
    });

    component.solicitarAcceso();

    expect(component.cargandoRegistro).toBeFalse();
    expect(component.errorRegistro).toBe('El correo ya existe');
  });
});

