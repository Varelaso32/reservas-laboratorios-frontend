import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { SolicitudesService } from '../services/solicitudes.service';
import { SolicitudCrear } from '../../shared/models/solicitud.model';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'non-secret-test-token');
    sessionStorage.setItem('usuario', JSON.stringify({
      id: 4,
      nombre: 'Usuario de prueba',
      email: 'test@example.test',
      rol: 'SOLICITANTE',
      cargo: null
    }));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('adds Bearer authorization to a protected solicitud POST without credentials', () => {
    const solicitud: SolicitudCrear = {
      espacio_id: 17,
      fecha: '2026-10-05',
      hora_inicio: '08:00',
      hora_fin: '10:00',
      proposito: 'Prueba interceptor',
      asistentes: 10
    };

    TestBed.inject(SolicitudesService).crearSolicitud(solicitud).subscribe();
    const request = httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/`);

    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')?.startsWith('Bearer ')).toBeTrue();
    expect(request.request.withCredentials).toBeFalse();
    request.flush({});
  });

  it('keeps login form-urlencoded and does not attach a Bearer header to login', () => {
    TestBed.inject(AuthService).login('test@example.test', 'not-a-real-password').subscribe();
    const request = httpTestingController.expectOne(`${API_BASE_URL}/auth/login`);

    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    expect(request.request.body).toBe('username=test%40example.test&password=not-a-real-password');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({
      access_token: 'non-secret-test-response',
      token_type: 'bearer',
      expira_en: 3600,
      usuario: {
        id: 4,
        nombre: 'Usuario de prueba',
        email: 'test@example.test',
        rol: 'SOLICITANTE',
        cargo: null
      }
    });
  });
});