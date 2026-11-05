/// <reference types="jasmine" />
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { AutorizacionesComponent } from './autorizaciones.component';
import { SolicitudAutorizacion } from '../../../../shared/models/configuracion.model';

describe('AutorizacionesComponent', () => {
  let fixture: ComponentFixture<AutorizacionesComponent>;
  let component: AutorizacionesComponent;
  let httpTestingController: HttpTestingController;

  const URL_AUTORIZACIONES = `${API_BASE_URL}/solicitudes/autorizaciones`;

  const solicitud: SolicitudAutorizacion = {
    id: 51,
    estado: 'PENDIENTE_AUTORIZACION',
    solicitante: {
      id: 9,
      nombre: 'Estudiante Nocturno',
      email: 'nocturno@reservas.test',
      cargo: 'ESTUDIANTE',
      rol_reserva: 'ESTUDIANTE'
    },
    espacio: {
      id: 1,
      nombre: 'Laboratorio de Redes',
      tipo: 'LABORATORIO',
      capacidad: 25,
      ubicacion: 'Bloque A'
    },
    fecha: '2026-11-02',
    inicio: '2026-11-02T23:00:00-05:00',
    fin: '2026-11-03T01:00:00-05:00',
    asistentes: 12,
    proposito: 'Práctica de configuración de routers',
    motivo_urgencia: 'Es la única franja libre del grupo nocturno',
    creada_en: '2026-10-28T09:00:00-05:00'
  };

  function crearComponente(): void {
    fixture = TestBed.createComponent(AutorizacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function responderListado(solicitudes: SolicitudAutorizacion[] = [solicitud]): void {
    httpTestingController.expectOne(URL_AUTORIZACIONES).flush(solicitudes);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'token-coordinador');
    sessionStorage.setItem(
      'usuario',
      JSON.stringify({
        id: 3,
        nombre: 'Coordinadora Labs',
        email: 'coordinador.labs@reservas.test',
        rol: 'APROBADOR',
        cargo: 'COORDINADOR_LABORATORIOS',
        puede_autorizar_especial: true
      })
    );

    await TestBed.configureTestingModule({
      imports: [AutorizacionesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        MessageService
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });

  afterEach(() => httpTestingController.verify());

  it('lista las solicitudes fuera de franja con su espacio y motivo de urgencia', () => {
    crearComponente();
    responderListado();

    const tarjeta = fixture.nativeElement.querySelector('.tarjeta') as HTMLElement;
    expect(tarjeta.textContent).toContain('Laboratorio de Redes');
    expect(tarjeta.textContent).toContain('Fuera de franja');
    expect(tarjeta.textContent).toContain('Estudiante Nocturno');
    expect(tarjeta.textContent).toContain('23:00');
    expect(tarjeta.textContent).toContain('Práctica de configuración de routers');
    expect(tarjeta.textContent).toContain('Es la única franja libre del grupo nocturno');
  });

  it('muestra el estado vacío cuando no hay solicitudes pendientes', () => {
    crearComponente();
    responderListado([]);

    const vacio = fixture.nativeElement.querySelector('.estado-vacio') as HTMLElement;
    expect(vacio.textContent).toContain('No hay solicitudes esperando autorización');
  });

  it('autoriza una solicitud y la quita de la bandeja', () => {
    crearComponente();
    responderListado();

    component.pedirConfirmacion(solicitud);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.confirmacion')).toBeTruthy();

    component.confirmarAutorizacion(solicitud);

    const post = httpTestingController.expectOne(
      `${API_BASE_URL}/solicitudes/51/autorizacion`
    );
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ aprobar: true });
    post.flush({
      mensaje: 'Solicitud #51 autorizada. Pasa al flujo normal de aprobación.',
      solicitud: { ...solicitud, estado: 'PENDIENTE' }
    });

    expect(component.solicitudes.length).toBe(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.estado-vacio')).toBeTruthy();
  });

  it('exige un motivo antes de negar la autorización', () => {
    crearComponente();
    responderListado();

    component.iniciarNegacion(solicitud);
    component.motivoNegacion = '   ';
    component.confirmarNegacion(solicitud);

    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/51/autorizacion`);
    expect(component.errorMotivo).toContain('motivo');
  });

  it('niega la autorización con el motivo escrito', () => {
    crearComponente();
    responderListado();

    component.iniciarNegacion(solicitud);
    component.motivoNegacion = 'El laboratorio cierra a las 22:00';
    component.confirmarNegacion(solicitud);

    const post = httpTestingController.expectOne(
      `${API_BASE_URL}/solicitudes/51/autorizacion`
    );
    expect(post.request.body).toEqual({
      aprobar: false,
      motivo: 'El laboratorio cierra a las 22:00'
    });
    post.flush({
      mensaje: 'Solicitud #51 rechazada: la autorización especial fue negada.',
      solicitud: { ...solicitud, estado: 'RECHAZADA' }
    });

    expect(component.solicitudes.length).toBe(0);
    expect(component.negandoId).toBeNull();
  });

  it('muestra el error cuando la bandeja no se puede cargar', () => {
    crearComponente();

    httpTestingController
      .expectOne(URL_AUTORIZACIONES)
      .flush(
        { detail: 'No tienes permiso para autorizar solicitudes fuera de la franja' },
        { status: 403, statusText: 'Forbidden' }
      );
    fixture.detectChanges();

    const estado = fixture.nativeElement.querySelector('.estado.error') as HTMLElement;
    expect(estado.textContent).toContain('No tienes permiso');
  });
});
