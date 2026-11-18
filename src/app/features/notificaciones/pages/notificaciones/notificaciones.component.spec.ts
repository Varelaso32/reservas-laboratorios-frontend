import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { Notificacion, SolicitudDetalle } from '../../../../shared/models/notificacion.model';
import { NotificacionesComponent } from './notificaciones.component';

describe('NotificacionesComponent', () => {
  let fixture: ComponentFixture<NotificacionesComponent>;
  let component: NotificacionesComponent;
  let httpTesting: HttpTestingController;

  const usuario = {
    id: 4,
    nombre: 'Estudiante de Prueba',
    email: 'estudiante@reservas.test',
    rol: 'SOLICITANTE',
    cargo: 'ESTUDIANTE'
  };

  const detalleBase: SolicitudDetalle = {
    solicitud_id: 42,
    estado: 'APROBADA',
    espacio_id: 3,
    espacio: 'Laboratorio de Software',
    tipo_espacio: 'LABORATORIO',
    fecha: '2026-11-05',
    inicio: '2026-11-05T08:00:00-05:00',
    fin: '2026-11-05T10:00:00-05:00',
    motivo_urgencia: null,
    motivo_rechazo: null,
    solicitante: 'Estudiante de Prueba',
    rol_solicitante: 'ESTUDIANTE'
  };

  const avisoAprobado: Notificacion = {
    id: 12,
    tipo: 'SOLICITUD_APROBADA',
    titulo: 'Solicitud #42 aprobada',
    mensaje: 'Tu solicitud para Laboratorio de Software fue aprobada.',
    solicitud_id: 42,
    leida: false,
    creada_en: '2026-11-01T10:00:00-05:00',
    detalle: detalleBase
  };

  const avisoRechazado: Notificacion = {
    id: 11,
    tipo: 'SOLICITUD_RECHAZADA',
    titulo: 'Solicitud #41 rechazada',
    mensaje: 'Tu solicitud para Laboratorio de Software fue rechazada.',
    solicitud_id: 41,
    leida: true,
    creada_en: '2026-10-31T09:00:00-05:00',
    detalle: {
      ...detalleBase,
      solicitud_id: 41,
      estado: 'RECHAZADA',
      motivo_rechazo: 'El espacio está en mantenimiento'
    }
  };

  const avisoPendiente: Notificacion = {
    id: 9,
    tipo: 'SOLICITUD_PENDIENTE',
    titulo: 'Solicitud pendiente por revisar',
    mensaje: 'Un estudiante solicitó el Laboratorio de Software.',
    solicitud_id: 45,
    leida: false,
    creada_en: '2026-11-01T11:00:00-05:00',
    detalle: { ...detalleBase, solicitud_id: 45, estado: 'PENDIENTE', espacio_id: 3 }
  };

  const avisoCesion: Notificacion = {
    id: 7,
    tipo: 'CESION_SOLICITADA',
    titulo: 'Solicitud de cesión de cupo',
    mensaje: 'Un docente solicita tu cupo.',
    solicitud_id: 31,
    leida: true,
    creada_en: '2026-11-01T10:00:00-05:00',
    detalle: {
      ...detalleBase,
      solicitud_id: 31,
      estado: 'EN_ESPERA_CESION',
      espacio_id: 1,
      espacio: 'Laboratorio de Redes',
      motivo_urgencia: 'Sustentación de grado',
      solicitante: 'Docente de Prueba',
      rol_solicitante: 'DOCENTE'
    }
  };

  beforeEach(async () => {
    sessionStorage.setItem('access_token', 'spec-session-token');
    sessionStorage.setItem('usuario', JSON.stringify(usuario));

    await TestBed.configureTestingModule({
      imports: [NotificacionesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        MessageService
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NotificacionesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
  });

  function crear(avisos: Notificacion[]): void {
    fixture.detectChanges();
    httpTesting
      .expectOne(req => req.url === `${API_BASE_URL}/notificaciones/`)
      .flush(avisos);
    fixture.detectChanges();
  }

  it('muestra el historial completo con leídas y nuevas', () => {
    crear([avisoAprobado, avisoRechazado]);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Solicitud #42 aprobada');
    expect(texto).toContain('Solicitud #41 rechazada');
    expect(texto).toContain('El espacio está en mantenimiento');
    expect(fixture.nativeElement.querySelectorAll('.aviso')).toHaveSize(2);
    expect(fixture.nativeElement.querySelectorAll('.pastilla-nueva')).toHaveSize(1);
    expect(fixture.nativeElement.querySelector('.chip.activo')?.textContent).toContain('Todas');
  });

  it('filtra solo las notificaciones nuevas', () => {
    crear([avisoAprobado, avisoRechazado]);

    const chips = fixture.nativeElement.querySelectorAll('.chip') as NodeListOf<HTMLButtonElement>;
    (chips[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.aviso')).toHaveSize(1);
    expect(fixture.nativeElement.textContent).toContain('Solicitud #42 aprobada');
    expect(fixture.nativeElement.textContent).not.toContain('Solicitud #41 rechazada');
  });

  it('marca todas como leídas y deja de mostrar la pastilla de nueva', () => {
    crear([avisoAprobado, avisoRechazado]);

    (fixture.nativeElement.querySelector('.barra-filtros .boton-secundario') as HTMLButtonElement)
      .click();
    fixture.detectChanges();

    httpTesting
      .expectOne(`${API_BASE_URL}/notificaciones/leidas`)
      .flush({ actualizadas: 1 });
    fixture.detectChanges();

    expect(component.totalNuevas).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.pastilla-nueva')).toHaveSize(0);
  });

  it('marca una notificación como leída sin borrarla del historial', () => {
    crear([avisoAprobado, avisoRechazado]);

    const boton = fixture.nativeElement.querySelector(
      '.aviso.no-leida .acciones-aviso .boton-secundario'
    ) as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();

    httpTesting
      .expectOne(`${API_BASE_URL}/notificaciones/12/leida`)
      .flush({ ...avisoAprobado, leida: true });
    fixture.detectChanges();

    expect(component.totalNuevas).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.aviso')).toHaveSize(2);
  });

  it('lleva a revisar la solicitud y la marca como leída', () => {
    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    crear([avisoPendiente]);

    const boton = fixture.nativeElement.querySelector(
      '.acciones-aviso .boton-primario'
    ) as HTMLButtonElement;
    expect(boton.textContent).toContain('Revisar solicitud');
    boton.click();
    fixture.detectChanges();

    httpTesting
      .expectOne(`${API_BASE_URL}/notificaciones/9/leida`)
      .flush({ ...avisoPendiente, leida: true });
    expect(navegar).toHaveBeenCalledWith(['/admin/espacios'], { queryParams: { espacio: 3 } });
  });

  it('permite decidir una cesión pendiente desde el historial', () => {
    crear([avisoCesion]);

    (fixture.nativeElement.querySelector('.acciones-cesion .boton-primario') as HTMLButtonElement)
      .click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.decision .boton-primario') as HTMLButtonElement).click();

    const decision = httpTesting.expectOne(`${API_BASE_URL}/solicitudes/31/cesion`);
    expect(decision.request.body).toEqual({ aprobar: true, motivo: null });
    decision.flush({
      mensaje: 'Solicitud #31 aprobada por cesión.',
      solicitud: { id: 31, estado: 'APROBADA' }
    });

    httpTesting
      .expectOne(req => req.url === `${API_BASE_URL}/notificaciones/`)
      .flush([{ ...avisoCesion, leida: true, detalle: { ...avisoCesion.detalle!, estado: 'APROBADA' } }]);
  });

  it('muestra un estado vacío cuando no hay notificaciones', () => {
    crear([]);

    expect(fixture.nativeElement.querySelector('.estado')?.textContent)
      .toContain('Todavía no tienes notificaciones');
  });
});
