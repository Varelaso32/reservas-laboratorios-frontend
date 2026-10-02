import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { authInterceptor } from '../../../../core/interceptors/auth.interceptor';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { SolicitudPendiente } from '../../../../shared/models/solicitud.model';
import { SolicitudesPendientesComponent } from './solicitudes-pendientes.component';

describe('SolicitudesPendientesComponent', () => {
  let fixture: ComponentFixture<SolicitudesPendientesComponent>;
  let httpTestingController: HttpTestingController;

  const solicitudes: SolicitudPendiente[] = [
    {
      id: 51,
      estado: 'PENDIENTE',
      solicitante: {
        id: 9,
        nombre: 'Estudiante de Prueba',
        email: 'estudiante@reservas.test',
        cargo: 'ESTUDIANTE'
      },
      espacio: {
        id: 1,
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
    }
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'non-secret-approver-test-token');
    sessionStorage.setItem('usuario', JSON.stringify({
      id: 2,
      nombre: 'Coordinador de Laboratorios',
      email: 'coordinador.labs@reservas.test',
      rol: 'APROBADOR',
      cargo: 'COORDINADOR_LABORATORIOS'
    }));

    await TestBed.configureTestingModule({
      imports: [SolicitudesPendientesComponent],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SolicitudesPendientesComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  function obtenerSolicitudGet() {
    return httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/pendientes`);
  }

  it('requests the pending list with Bearer through the interceptor', () => {
    const request = obtenerSolicitudGet();

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')?.startsWith('Bearer ')).toBeTrue();
    expect(request.request.withCredentials).toBeFalse();
    request.flush([]);
  });

  it('renders the backend applicant, space, schedule, state and expired marker', () => {
    obtenerSolicitudGet().flush(solicitudes);
    fixture.detectChanges();

    const pageText = fixture.nativeElement.textContent as string;
    expect(pageText).toContain('Estudiante de Prueba');
    expect(pageText).toContain('ESTUDIANTE');
    expect(pageText).toContain('Laboratorio de Redes');
    expect(pageText).toContain('LABORATORIO');
    expect(pageText).toContain('Bloque A, piso 2');
    expect(pageText).toContain('10');
    expect(pageText).toContain('PENDIENTE');
    expect(pageText).toContain('Vencida');
    expect(fixture.nativeElement.querySelector('.status-expired')).toBeTruthy();
  });

  it('shows an explicit empty state when the backend returns no requests', () => {
    obtenerSolicitudGet().flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay solicitudes pendientes.');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('shows backend error detail and a retry action', () => {
    obtenerSolicitudGet().flush(
      { detail: 'Solo para usuarios APROBADOR' },
      { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Solo para usuarios APROBADOR');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('does not render approve or reject actions in the pending list', () => {
    obtenerSolicitudGet().flush(solicitudes);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const buttonText = buttons.map(button => button.textContent?.trim() ?? '').join(' ');
    expect(buttonText).not.toMatch(/aprobar|rechazar/i);
  });
});