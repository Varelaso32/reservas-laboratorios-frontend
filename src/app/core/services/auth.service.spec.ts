import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';
import { RegistroCrear, RespuestaLogin, Usuario, UsuarioDetalleOut } from '../models/auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  const mockUsuario: Usuario = {
    id: 1,
    nombre: 'Julian Gonzalez',
    email: 'julian@ecci.edu.co',
    rol: 'APROBADOR',
    cargo: 'COORDINADOR_LABORATORIOS'
  };

  const mockLoginResponse: RespuestaLogin = {
    access_token: 'fake-jwt-token-123',
    token_type: 'bearer',
    expira_en: 3600,
    usuario: mockUsuario
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
  });

  it('debe registrar un nuevo usuario con POST /auth/registro', () => {
    const datosRegistro: RegistroCrear = {
      nombre: 'Nuevo Usuario',
      email: 'nuevo@ecci.edu.co',
      clave: 'password123'
    };

    const respuestaEsperada: UsuarioDetalleOut = {
      id: 2,
      nombre: datosRegistro.nombre,
      email: datosRegistro.email,
      rol: 'SOLICITANTE',
      cargo: null,
      activo: true,
      creado_en: '2026-10-08T10:00:00Z'
    };

    service.registro(datosRegistro).subscribe(res => {
      expect(res).toEqual(respuestaEsperada);
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/auth/registro`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datosRegistro);
    req.flush(respuestaEsperada);
  });

  it('debe iniciar sesion con formato urlencoded y guardar sesion', () => {
    service.login('julian@ecci.edu.co', 'clave123').subscribe(res => {
      expect(res).toEqual(mockLoginResponse);
      expect(service.obtenerTokenActual()).toBe('fake-jwt-token-123');
      expect(service.obtenerUsuarioActual()).toEqual(mockUsuario);
      expect(service.tieneSesionActiva()).toBeTrue();
      expect(sessionStorage.getItem('access_token')).toBe('fake-jwt-token-123');
      expect(sessionStorage.getItem('usuario')).toContain('julian@ecci.edu.co');
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    req.flush(mockLoginResponse);
  });

  it('debe cerrar sesion limpiando estado y sessionStorage', () => {
    service.login('julian@ecci.edu.co', 'clave123').subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/auth/login`).flush(mockLoginResponse);

    expect(service.tieneSesionActiva()).toBeTrue();

    service.logout();

    expect(service.tieneSesionActiva()).toBeFalse();
    expect(service.obtenerTokenActual()).toBeNull();
    expect(service.obtenerUsuarioActual()).toBeNull();
    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('usuario')).toBeNull();
  });

  it('debe consultar /auth/me y actualizar el usuario en sesion', () => {
    const usuarioActualizado: Usuario = {
      ...mockUsuario,
      nombre: 'Julian Gonzalez Modificado'
    };

    service.consultarUsuarioActual().subscribe(u => {
      expect(u).toEqual(usuarioActualizado);
      expect(service.obtenerUsuarioActual()?.nombre).toBe('Julian Gonzalez Modificado');
    });

    const req = httpTesting.expectOne(`${API_BASE_URL}/auth/me`);
    expect(req.request.method).toBe('GET');
    req.flush(usuarioActualizado);
  });

  it('debe restaurar sesion valida desde sessionStorage al inicializarse', () => {
    TestBed.resetTestingModule();
    sessionStorage.setItem('access_token', 'token-guardado');
    sessionStorage.setItem('usuario', JSON.stringify(mockUsuario));

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const nuevoServicio = TestBed.inject(AuthService);
    expect(nuevoServicio.tieneSesionActiva()).toBeTrue();
    expect(nuevoServicio.obtenerTokenActual()).toBe('token-guardado');
    expect(nuevoServicio.obtenerUsuarioActual()?.email).toBe('julian@ecci.edu.co');
  });

  it('debe ignorar datos corruptos o roles invalidos en sessionStorage', () => {
    TestBed.resetTestingModule();
    sessionStorage.setItem('access_token', 'token-valido');
    sessionStorage.setItem('usuario', JSON.stringify({ rol: 'SUPERADMIN_INVALIDO' }));

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const nuevoServicio = TestBed.inject(AuthService);
    expect(nuevoServicio.tieneSesionActiva()).toBeFalse();
  });
});
