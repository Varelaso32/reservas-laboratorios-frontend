import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { AuthService } from '../../../../core/services/auth.service';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { Espacio } from '../../../../shared/models/espacio.model';
import { SolicitudCreada } from '../../../../shared/models/solicitud.model';

import { SolicitudReservaComponent } from './solicitud-reserva.component';

describe('SolicitudReservaComponent', () => {
  let component: SolicitudReservaComponent;
  let fixture: ComponentFixture<SolicitudReservaComponent>;
  let httpTestingController: HttpTestingController;
  let messageService: jasmine.SpyObj<MessageService>;
  let sesionActiva: boolean;
  let usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: 'SOLICITANTE' | 'APROBADOR';
    cargo: 'ESTUDIANTE';
  };
  const espacio: Espacio = {
    id: 17,
    nombre: 'Laboratorio de Redes',
    tipo: 'LABORATORIO',
    capacidad: 25,
    ubicacion: 'Bloque A, piso 2'
  };

  beforeEach(async () => {
    messageService = jasmine.createSpyObj<MessageService>('MessageService', ['add', 'clear']);
    sesionActiva = true;
    usuario = {
      id: 4,
      nombre: 'Solicitante de prueba',
      email: 'estudiante@reservas.test',
      rol: 'SOLICITANTE',
      cargo: 'ESTUDIANTE'
    };

    await TestBed.configureTestingModule({
      imports: [SolicitudReservaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MessageService, useValue: messageService },
        {
          provide: AuthService,
          useValue: {
            tieneSesionActiva: () => sesionActiva,
            obtenerUsuarioActual: () => sesionActiva ? usuario : null
          }
        }
      ]
    })
    .compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SolicitudReservaComponent);
    component = fixture.componentInstance;
    component.espacio = espacio;
    fixture.detectChanges();
  });

  afterEach(() => httpTestingController.verify());

  function completarFormulario(): void {
    component.formReserva.setValue({
      fecha: '2099-10-05',
      horaInicio: '08:00',
      horaFin: '10:00',
      asistentes: 10,
      proposito: 'Prueba de disponibilidad'
    });
  }

  function obtenerConsultaDisponibilidad() {
    return httpTestingController.expectOne(
      request => request.url === `${API_BASE_URL}/espacios/17/disponibilidad`
    );
  }

  function obtenerSolicitudPost() {
    return httpTestingController.expectOne(`${API_BASE_URL}/solicitudes/`);
  }

  function respuestaCreada(): SolicitudCreada {
    return {
      id: 301,
      espacio_id: 17,
      espacio_nombre: espacio.nombre,
      inicio: '2099-10-05T08:00:00-05:00',
      fin: '2099-10-05T10:00:00-05:00',
      proposito: 'Prueba de disponibilidad',
      asistentes: 10,
      equipamiento: null,
      estado: 'PENDIENTE',
      motivo_rechazo: null,
      fecha_decision: null,
      creada_en: '2026-10-02T09:00:00-05:00',
      mensaje: 'Solicitud #301 registrada. Quedó en estado PENDIENTE.'
    };
  }

  function responderDisponibilidad(disponible: boolean): void {
    obtenerConsultaDisponibilidad().flush({
      espacio_id: 17,
      disponible,
      mensaje: disponible ? 'Disponible' : 'No disponible'
    });
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the booking form modal compact and shows the real selected space context', () => {
    const modal = fixture.nativeElement.querySelector('.modal') as HTMLElement;
    expect(getComputedStyle(modal).width).toBe('460px');
    const context = fixture.nativeElement.querySelector('.espacio-seleccionado')?.textContent
      .replace(/\s+/g, ' ')
      .trim();
    expect(context).toContain('Laboratorio de Redes · LABORATORIO · Bloque A, piso 2');
    expect(fixture.nativeElement.querySelector('.fila-tres')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.modal-footer .confirmar')?.textContent)
      .toContain('Confirmar reserva');
  });

  it('does not request availability when any query field is incomplete', () => {
    component.formReserva.controls.fecha.setValue('2099-10-05');
    component.formReserva.controls.horaInicio.setValue('08:00');

    component.validarDisponibilidad();

    httpTestingController.expectNone(() => true);
    expect(component.mensajeDisponibilidad).toBe('');
  });

  it('requests availability using the selected id and exact date and time params', () => {
    expect(fixture.nativeElement.querySelector('.aviso-disponibilidad')).toBeNull();
    completarFormulario();

    component.validarDisponibilidad();

    const request = obtenerConsultaDisponibilidad();
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('fecha')).toBe('2099-10-05');
    expect(request.request.params.get('hora_inicio')).toBe('08:00');
    expect(request.request.params.get('hora_fin')).toBe('10:00');
    request.flush({ espacio_id: 17, disponible: true, mensaje: 'Disponible según backend' });
    fixture.detectChanges();

    expect(component.disponible).toBeTrue();
    expect(component.mensajeDisponibilidad).toBe('Disponible según backend');
    expect(component.estadoDisponibilidad).toBe('disponible');
    const aviso = fixture.nativeElement.querySelector('.aviso-disponibilidad.disponible') as HTMLElement;
    expect(aviso.textContent).toContain('Disponible según backend');
    expect(aviso.getAttribute('role')).toBe('status');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'success',
      summary: 'Horario disponible',
      detail: 'Disponible según backend'
    }));
  });

  it('shows the backend message with the unavailable style when the space is occupied', () => {
    completarFormulario();
    component.validarDisponibilidad();

    obtenerConsultaDisponibilidad().flush({
      espacio_id: 17,
      disponible: false,
      mensaje: 'El espacio ya se encuentra ocupado en ese horario'
    });
    fixture.detectChanges();

    expect(component.disponible).toBeFalse();
    expect(component.mensajeDisponibilidad).toBe('El espacio ya se encuentra ocupado en ese horario');
    expect(fixture.nativeElement.querySelector('.aviso-disponibilidad.no-disponible')).toBeTruthy();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'warn',
      summary: 'Horario no disponible',
      detail: 'El espacio ya se encuentra ocupado en ese horario'
    }));
  });

  it('rejects an invalid time range locally without making a request', () => {
    component.formReserva.patchValue({
      fecha: '2099-10-05',
      horaInicio: '10:00',
      horaFin: '10:00'
    });

    component.validarDisponibilidad();

    httpTestingController.expectNone(() => true);
    expect(component.disponible).toBeFalse();
    expect(component.estadoDisponibilidad).toBe('hora-invalida');
    expect(component.mensajeDisponibilidad).toContain('posterior');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'warn' }));
  });

  it('revalidates on confirmation and blocks the temporary flow when unavailable', () => {
    completarFormulario();
    const closeSpy = spyOn(component.cerrar, 'emit');

    component.confirmarReserva();

    obtenerConsultaDisponibilidad().flush({
      espacio_id: 17,
      disponible: false,
      mensaje: 'No disponible'
    });

    expect(component.disponible).toBeFalse();
    expect(closeSpy).not.toHaveBeenCalled();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'warn' }));
  });

  it('does not consider an HTTP error available or continue confirmation', () => {
    completarFormulario();
    const closeSpy = spyOn(component.cerrar, 'emit');

    component.confirmarReserva();

    obtenerConsultaDisponibilidad().flush(
      { detail: 'Error del servidor' },
      { status: 500, statusText: 'Internal Server Error' }
    );

    expect(component.disponible).toBeNull();
    expect(component.estadoDisponibilidad).toBe('error');
    expect(component.mensajeDisponibilidad).toBe('Error del servidor');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      detail: 'Error del servidor'
    }));
    expect(closeSpy).not.toHaveBeenCalled();
    expect(component.formReserva.controls.fecha.value).toBe('2099-10-05');
  });

  it('does not send when the user has no active session', () => {
    sesionActiva = false;
    completarFormulario();

    component.disponible = true;
    component.confirmarReserva();

    httpTestingController.expectNone(() => true);
    expect(component.mensajeDisponibilidad).toContain('Inicia sesión');
  });

  it('shows the non-solicitant restriction as an integrated informational notice', () => {
    usuario.rol = 'APROBADOR';
    fixture.detectChanges();

    const aviso = fixture.nativeElement.querySelector('.aviso-restriccion') as HTMLElement;
    expect(aviso.textContent).toContain('Solo una cuenta SOLICITANTE');
    expect(aviso.getAttribute('role')).toBe('alert');
    expect(aviso.classList.contains('error')).toBeFalse();
  });

  it('blocks assistants above the selected space capacity before requesting availability', () => {
    completarFormulario();
    component.formReserva.controls.asistentes.setValue(26);

    component.confirmarReserva();

    httpTestingController.expectNone(() => true);
    expect(component.formReserva.controls.asistentes.hasError('capacidadExcedida')).toBeTrue();
  });

  it('blocks past reservations using Colombia local time before making requests', () => {
    component.formReserva.setValue({
      fecha: '2000-01-01',
      horaInicio: '08:00',
      horaFin: '10:00',
      asistentes: 10,
      proposito: 'Solicitud pasada'
    });

    component.confirmarReserva();

    httpTestingController.expectNone(() => true);
    expect(component.mensajeDisponibilidad).toContain('fecha u hora pasada');
  });

  it('shows the pending success dialog only after the backend creates the request', () => {
    completarFormulario();
    component.seleccionarActividad('Examen');
    const closeSpy = spyOn(component.cerrar, 'emit');
    expect(fixture.nativeElement.querySelector('.modal-exito')).toBeNull();

    component.confirmarReserva();
    responderDisponibilidad(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal-exito')).toBeNull();

    const post = obtenerSolicitudPost();
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      espacio_id: 17,
      fecha: '2099-10-05',
      hora_inicio: '08:00',
      hora_fin: '10:00',
      proposito: 'Prueba de disponibilidad',
      asistentes: 10
    });
    expect(post.request.body.solicitante).toBeUndefined();
    expect(post.request.body.tipoActividad).toBeUndefined();
    expect(post.request.body.equipamiento).toBeUndefined();
    expect(closeSpy).not.toHaveBeenCalled();

    const respuesta = respuestaCreada();
    post.flush(respuesta, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(component.solicitudCreada?.id).toBe(301);
    expect(component.solicitudCreada?.estado).toBe('PENDIENTE');
    const dialogo = fixture.nativeElement.querySelector('.modal-exito') as HTMLElement;
    expect(dialogo).toBeTruthy();
    expect(dialogo.getAttribute('role')).toBe('dialog');
    expect(dialogo.textContent).toContain('Solicitud enviada correctamente');
    expect(dialogo.textContent).toContain(
      'Tu solicitud está pendiente de aprobación por parte del administrador.'
    );
    expect(dialogo.textContent).toContain('Te notificaremos cuando sea revisada.');
    expect(dialogo.querySelector('.badge-pendiente')?.textContent).toContain('Pendiente de aprobación');
    expect(dialogo.querySelector('.cerrar-exito')?.textContent).toBe('Cerrar');
    expect(getComputedStyle(dialogo).width).toBe('292px');
    expect(getComputedStyle(dialogo.querySelector('.icono-exito') as HTMLElement).width).toBe('34px');
    expect(getComputedStyle(dialogo.querySelector('.cerrar-exito') as HTMLElement).width).toBe('58px');
    expect(messageService.add).not.toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    expect(component.formReserva.controls.fecha.value).toBeNull();
    expect(component.estadoDisponibilidad).toBe('neutro');
    expect(component.mensajeDisponibilidad).toBe('');
    expect(closeSpy).not.toHaveBeenCalled();

    (dialogo.querySelector('.cerrar-exito') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal-exito')).toBeNull();
    expect(closeSpy).toHaveBeenCalledOnceWith();
    httpTestingController.expectNone(`${API_BASE_URL}/solicitudes/`);
  });

  it('keeps the modal and form open when creation returns HTTP 409', () => {
    completarFormulario();
    const closeSpy = spyOn(component.cerrar, 'emit');

    component.confirmarReserva();
    responderDisponibilidad(true);
    obtenerSolicitudPost().flush(
      { detail: 'El espacio ya está ocupado en ese horario' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(closeSpy).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal-exito')).toBeNull();
    expect(component.formReserva.controls.fecha.value).toBe('2099-10-05');
    expect(component.mensajeDisponibilidad).toBe('El espacio ya está ocupado en ese horario');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
  });

  it('does not make duplicate availability or creation requests on repeated confirmation', () => {
    completarFormulario();
    const solicitudesService = TestBed.inject(SolicitudesService);
    const createSpy = spyOn(solicitudesService, 'crearSolicitud').and.callThrough();
    component.confirmarReserva();
    component.confirmarReserva();
    responderDisponibilidad(true);
    const post = obtenerSolicitudPost();
    component.confirmarReserva();

    expect(createSpy).toHaveBeenCalledTimes(1);
    const respuesta = respuestaCreada();
    post.flush(respuesta, { status: 201, statusText: 'Created' });

    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('accepts only positive integer assistant counts', () => {
    const asistentes = component.formReserva.controls.asistentes;
    const inputNumber = fixture.debugElement.query(By.directive(InputNumber)).componentInstance as InputNumber;

    expect(inputNumber.step).toBe(1);
    expect(inputNumber.minFractionDigits).toBe(0);
    expect(inputNumber.maxFractionDigits).toBe(0);

    const input = fixture.nativeElement.querySelector('p-inputnumber input') as HTMLInputElement;
    for (const key of ['e', 'E', '+', '-', '.', ',', 'a', '!']) {
      const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      input.dispatchEvent(evento);
      expect(evento.defaultPrevented).toBeTrue();
    }

    const teclaNumerica = new KeyboardEvent('keydown', {
      key: '2', bubbles: true, cancelable: true
    });
    input.dispatchEvent(teclaNumerica);
    expect(teclaNumerica.defaultPrevented).toBeFalse();

    const pegado = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(pegado, 'clipboardData', {
      value: { getData: () => '2e3' }
    });
    input.dispatchEvent(pegado);
    expect(pegado.defaultPrevented).toBeTrue();

    for (const cantidad of [20, 5, 1]) {
      asistentes.setValue(cantidad);
      expect(asistentes.valid).toBeTrue();
    }

    for (const cantidad of [1.5, -5, 26]) {
      asistentes.setValue(cantidad);
      expect(asistentes.invalid).toBeTrue();
    }

    expect(fixture.nativeElement.querySelector('p-inputnumber')).toBeTruthy();
  });
});
