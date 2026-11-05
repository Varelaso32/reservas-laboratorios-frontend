import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { API_BASE_URL } from '../../../core/config/api.config';
import { Notificacion } from '../../models/notificacion.model';
import { CampanaNotificacionesComponent } from './campana-notificaciones.component';

describe('CampanaNotificacionesComponent', () => {
  let fixture: ComponentFixture<CampanaNotificacionesComponent>;
  let component: CampanaNotificacionesComponent;
  let httpTesting: HttpTestingController;

  const avisoCesion: Notificacion = {
    id: 7,
    tipo: 'CESION_SOLICITADA',
    titulo: 'Solicitud de cesión de cupo',
    mensaje: 'Usuario docente@reservas.test (Docente) solicita tu cupo',
    solicitud_id: 31,
    leida: false,
    creada_en: '2026-11-01T10:00:00-05:00',
    detalle: {
      solicitud_id: 31,
      estado: 'EN_ESPERA_CESION',
      espacio: 'Laboratorio de Redes',
      tipo_espacio: 'LABORATORIO',
      fecha: '2026-11-05',
      inicio: '2026-11-05T08:00:00-05:00',
      fin: '2026-11-05T10:00:00-05:00',
      motivo_urgencia: 'Sustentación de grado',
      solicitante: 'Usuario docente@reservas.test',
      motivo_rechazo: null,
      espacio_id: 1,
      rol_solicitante: 'DOCENTE'
    }
  };

  const avisoPendiente: Notificacion = {
    id: 9,
    tipo: 'SOLICITUD_PENDIENTE',
    titulo: 'Solicitud pendiente por revisar',
    mensaje:
      'Estudiante de Prueba (Estudiante) solicitó Laboratorio de Redes el 05/11/2026 de 08:00 a 10:00.',
    solicitud_id: 42,
    leida: false,
    creada_en: '2026-11-01T10:00:00-05:00',
    detalle: {
      solicitud_id: 42,
      estado: 'PENDIENTE',
      espacio_id: 3,
      espacio: 'Laboratorio de Redes',
      tipo_espacio: 'LABORATORIO',
      fecha: '2026-11-05',
      inicio: '2026-11-05T08:00:00-05:00',
      fin: '2026-11-05T10:00:00-05:00',
      motivo_urgencia: null,
      motivo_rechazo: null,
      solicitante: 'Estudiante de Prueba',
      rol_solicitante: 'ESTUDIANTE'
    }
  };

  const avisoRechazo: Notificacion = {
    ...avisoCesion,
    id: 10,
    tipo: 'SOLICITUD_RECHAZADA',
    titulo: 'Solicitud #42 rechazada',
    mensaje: 'Tu solicitud para Laboratorio de Redes fue rechazada.',
    solicitud_id: 42,
    detalle: {
      ...avisoCesion.detalle!,
      solicitud_id: 42,
      estado: 'RECHAZADA',
      motivo_rechazo: 'El espacio está en mantenimiento'
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampanaNotificacionesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        MessageService
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CampanaNotificacionesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => httpTesting.verify());

  function responderResumen(noLeidas: number): void {
    httpTesting
      .expectOne(`${API_BASE_URL}/notificaciones/resumen`)
      .flush({ no_leidas: noLeidas });
  }

  function abrirPanel(avisos: Notificacion[]): void {
    (fixture.nativeElement.querySelector('.boton-campana') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpTesting.expectOne(req => req.url === `${API_BASE_URL}/notificaciones/`).flush(avisos);
    fixture.detectChanges();
  }


  function abrirDecision(indice: number): void {
    const botones = fixture.nativeElement.querySelectorAll('.acciones-cesion button');
    (botones[indice] as HTMLButtonElement).click();
    fixture.detectChanges();
    // Al abrir la decisión la notificación se marca como leída
    httpTesting
      .expectOne(`${API_BASE_URL}/notificaciones/7/leida`)
      .flush({ ...avisoCesion, leida: true });
    fixture.detectChanges();
  }

  it('muestra el contador de no leídas al iniciar', () => {
    fixture.detectChanges();
    responderResumen(3);
    fixture.detectChanges();

    const contador = fixture.nativeElement.querySelector('.contador') as HTMLElement;
    expect(contador.textContent?.trim()).toBe('3');
    expect(
      fixture.nativeElement.querySelector('.boton-campana')?.getAttribute('aria-label')
    ).toContain('3 sin leer');
  });

  it('no muestra contador cuando todo está leído', () => {
    fixture.detectChanges();
    responderResumen(0);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.contador')).toBeNull();
  });

  it('abre el panel y muestra el detalle de la cesión', () => {
    fixture.detectChanges();
    responderResumen(1);

    abrirPanel([avisoCesion]);

    const panel = fixture.nativeElement.querySelector('.panel') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('Laboratorio de Redes');
    expect(panel.textContent).toContain('Sustentación de grado');
    expect(panel.textContent).toContain('Docente');
    expect(panel.textContent).toContain('08:00');
    expect(panel.querySelector('.acciones-cesion')).toBeTruthy();
  });

  it('cede el cupo al confirmar', () => {
    fixture.detectChanges();
    responderResumen(1);
    abrirPanel([avisoCesion]);

    abrirDecision(0);

    (fixture.nativeElement.querySelector('.decision .boton-primario') as HTMLButtonElement).click();

    const request = httpTesting.expectOne(`${API_BASE_URL}/solicitudes/31/cesion`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ aprobar: true, motivo: null });
    request.flush({
      mensaje: 'Solicitud #31 aprobada por cesión.',
      solicitud: { id: 31, estado: 'APROBADA' }
    });

    httpTesting
      .expectOne(req => req.url === `${API_BASE_URL}/notificaciones/`)
      .flush([{ ...avisoCesion, detalle: { ...avisoCesion.detalle!, estado: 'APROBADA' } }]);
  });

  it('exige motivo para conservar el cupo', () => {
    fixture.detectChanges();
    responderResumen(1);
    abrirPanel([avisoCesion]);

    abrirDecision(1);

    (fixture.nativeElement.querySelector('.decision .boton-primario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.error()).toContain('motivo');
    httpTesting.expectNone(`${API_BASE_URL}/solicitudes/31/cesion`);
  });

  it('conserva el cupo con el motivo indicado', () => {
    fixture.detectChanges();
    responderResumen(1);
    abrirPanel([avisoCesion]);

    abrirDecision(1);

    component.motivoConservar = 'El grupo necesita el laboratorio';
    (fixture.nativeElement.querySelector('.decision .boton-primario') as HTMLButtonElement).click();

    const request = httpTesting.expectOne(`${API_BASE_URL}/solicitudes/31/cesion`);
    expect(request.request.body).toEqual({
      aprobar: false,
      motivo: 'El grupo necesita el laboratorio'
    });
    request.flush({
      mensaje: 'Solicitud #31 rechazada: conservas tu reserva.',
      solicitud: { id: 31, estado: 'RECHAZADA' }
    });

    httpTesting
      .expectOne(req => req.url === `${API_BASE_URL}/notificaciones/`)
      .flush([{ ...avisoCesion, detalle: { ...avisoCesion.detalle!, estado: 'RECHAZADA' } }]);
  });

  it('solo pide las notificaciones nuevas (no leídas)', () => {
    fixture.detectChanges();
    responderResumen(2);

    (fixture.nativeElement.querySelector('.boton-campana') as HTMLButtonElement).click();
    fixture.detectChanges();

    const peticion = httpTesting.expectOne(req => req.url === `${API_BASE_URL}/notificaciones/`);
    expect(peticion.request.params.get('solo_no_leidas')).toBe('true');
    peticion.flush([avisoCesion, { ...avisoCesion, id: 8, titulo: 'Otra' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.aviso')).toHaveSize(2);
  });

  it('al cerrar el panel marca los avisos como leídos y limpia la campana', () => {
    fixture.detectChanges();
    responderResumen(2);
    abrirPanel([avisoCesion, { ...avisoCesion, id: 8, titulo: 'Otra' }]);

    // Cerrar con el mismo botón de la campana
    (fixture.nativeElement.querySelector('.boton-campana') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpTesting.expectOne(`${API_BASE_URL}/notificaciones/leidas`).flush({ actualizadas: 2 });
    fixture.detectChanges();

    expect(component.noLeidas()).toBe(0);
    expect(fixture.nativeElement.querySelector('.contador')).toBeNull();
    expect(fixture.nativeElement.querySelector('.panel')).toBeNull();
  });

  it('ofrece "Ver todas" para abrir el módulo de notificaciones', () => {
    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
    responderResumen(1);
    abrirPanel([avisoPendiente]);

    (fixture.nativeElement.querySelector('.ver-todas') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpTesting.expectOne(`${API_BASE_URL}/notificaciones/leidas`).flush({ actualizadas: 1 });
    expect(navegar).toHaveBeenCalledWith('/notificaciones');
  });

  it('muestra un estado vacío cuando no hay notificaciones', () => {
    fixture.detectChanges();
    responderResumen(0);
    abrirPanel([]);

    expect(fixture.nativeElement.querySelector('.panel-estado')?.textContent)
      .toContain('No tienes notificaciones');
  });

  it('avisa al revisor y lo lleva al espacio que debe revisar', () => {
    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
    responderResumen(1);

    abrirPanel([avisoPendiente]);

    const boton = fixture.nativeElement.querySelector(
      '.acciones-revision button'
    ) as HTMLButtonElement;
    expect(boton.textContent).toContain('Revisar solicitud');
    boton.click();
    fixture.detectChanges();

    httpTesting
      .expectOne(`${API_BASE_URL}/notificaciones/9/leida`)
      .flush({ ...avisoPendiente, leida: true });
    // Al salir del panel lo que quedaba nuevo pasa al historial
    httpTesting.expectOne(`${API_BASE_URL}/notificaciones/leidas`).flush({ actualizadas: 1 });
    expect(navegar).toHaveBeenCalledWith(['/admin/espacios'], { queryParams: { espacio: 3 } });
  });

  it('muestra el estado y el motivo cuando rechazaron la solicitud', () => {
    fixture.detectChanges();
    responderResumen(1);

    abrirPanel([avisoRechazo]);

    const panel = fixture.nativeElement.querySelector('.panel') as HTMLElement;
    expect(panel.textContent).toContain('Rechazada');
    expect(panel.textContent).toContain('El espacio está en mantenimiento');
    expect(panel.querySelector('.estado-rechazo')).toBeTruthy();
  });
});
