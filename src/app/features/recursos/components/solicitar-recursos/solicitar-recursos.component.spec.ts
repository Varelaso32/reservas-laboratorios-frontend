import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { API_BASE_URL } from '../../../../core/config/api.config';
import type {
  DisponibilidadRecursos,
  ReservaElegibleRecursos,
  SolicitudRecurso
} from '../../../../shared/models/recurso.model';
import { SolicitarRecursosComponent } from './solicitar-recursos.component';

const RECURSOS_URL = `${API_BASE_URL}/recursos`;

describe('SolicitarRecursosComponent', () => {
  let fixture: ComponentFixture<SolicitarRecursosComponent>;
  let componente: SolicitarRecursosComponent;
  let httpTestingController: HttpTestingController;

  const reservas: ReservaElegibleRecursos[] = [
    {
      reserva_id: 9,
      espacio_id: 1,
      espacio: 'Laboratorio de Redes',
      inicio: '2026-11-10T10:00:00',
      fin: '2026-11-10T12:00:00'
    },
    {
      reserva_id: 12,
      espacio_id: 2,
      espacio: 'Sala de Juntas',
      inicio: '2026-11-11T08:00:00',
      fin: '2026-11-11T09:00:00'
    }
  ];

  const disponibilidad: DisponibilidadRecursos = {
    reserva_id: 9,
    espacio: 'Laboratorio de Redes',
    inicio: '2026-11-10T10:00:00',
    fin: '2026-11-10T12:00:00',
    tipos: [
      {
        tipo_recurso_id: 1,
        tipo: 'Portátil',
        total: 5,
        instalados: 3,
        disponibles: 2,
        prestados: 1,
        reservados: 0,
        fallidos: 0
      },
      {
        tipo_recurso_id: 2,
        tipo: 'Proyector',
        total: 2,
        instalados: 1,
        disponibles: 1,
        prestados: 0,
        reservados: 1,
        fallidos: 0
      }
    ]
  };

  const solicitud: SolicitudRecurso = {
    id: 31,
    reserva_id: 9,
    espacio_id: 1,
    espacio: 'Laboratorio de Redes',
    inicio: '2026-11-10T10:00:00',
    fin: '2026-11-10T12:00:00',
    solicitante_id: 7,
    solicitante: 'Ana Docente',
    estado: 'PENDIENTE',
    observacion: null,
    motivo_rechazo: null,
    creada_en: '2026-11-05T10:00:00',
    decidida_por: null,
    fecha_decision: null,
    detalle: [],
    asignaciones: []
  };

  function responderDisponibilidad(): void {
    httpTestingController
      .expectOne(`${RECURSOS_URL}/disponibilidad?reserva_id=9`)
      .flush(disponibilidad);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitarRecursosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations()
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SolicitarRecursosComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();

    httpTestingController.expectOne(`${RECURSOS_URL}/reservas-elegibles`).flush(reservas);
    responderDisponibilidad();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('carga las reservas elegibles y selecciona la primera con su disponibilidad', () => {
    expect(componente.reservas).toEqual(reservas);
    expect(componente.reservaId).toBe(9);
    expect(componente.disponibilidad).toEqual(disponibilidad);
    expect(componente.cargandoReservas).toBeFalse();
    expect(componente.cargandoDisponibilidad).toBeFalse();
    expect(componente.lineas).toEqual([
      { tipo_recurso_id: 1, tipo: 'Portátil', disponibles: 2, cantidad: 0 },
      { tipo_recurso_id: 2, tipo: 'Proyector', disponibles: 1, cantidad: 0 }
    ]);
  });

  it('no consulta disponibilidad cuando el usuario no tiene reservas elegibles', () => {
    componente.reservaId = null;
    componente.cargarReservas();
    httpTestingController.expectOne(`${RECURSOS_URL}/reservas-elegibles`).flush([]);

    expect(componente.reservas).toEqual([]);
    expect(componente.reservaId).toBeNull();
    expect(componente.cargandoReservas).toBeFalse();
    httpTestingController.expectNone(
      request => request.url === `${RECURSOS_URL}/disponibilidad`
    );
  });

  it('muestra el mensaje del API al fallar la carga de reservas', () => {
    componente.cargarReservas();
    httpTestingController
      .expectOne(`${RECURSOS_URL}/reservas-elegibles`)
      .flush({ detail: 'Sesión expirada' }, { status: 401, statusText: 'Unauthorized' });

    expect(componente.cargandoReservas).toBeFalse();
    expect(componente.error).toBe('Sesión expirada');
  });

  it('usa un mensaje por defecto cuando la carga de reservas falla sin detalle', () => {
    componente.cargarReservas();
    httpTestingController
      .expectOne(`${RECURSOS_URL}/reservas-elegibles`)
      .flush(null, { status: 500, statusText: 'Error' });

    expect(componente.error).toBe('No se pudieron cargar tus reservas.');
  });

  it('limpia la disponibilidad cuando falla la consulta', () => {
    componente.seleccionarReserva(12);
    httpTestingController
      .expectOne(`${RECURSOS_URL}/disponibilidad?reserva_id=12`)
      .flush({ detail: 'Reserva no válida' }, { status: 400, statusText: 'Bad Request' });

    expect(componente.reservaId).toBe(12);
    expect(componente.disponibilidad).toBeNull();
    expect(componente.lineas).toEqual([]);
    expect(componente.cargandoDisponibilidad).toBeFalse();
    expect(componente.error).toBe('Reserva no válida');
  });

  it('cambia de reserva solo con un identificador válido', () => {
    componente.cambiarReserva('12');
    expect(componente.reservaId).toBe(12);
    httpTestingController
      .expectOne(`${RECURSOS_URL}/disponibilidad?reserva_id=12`)
      .flush({ ...disponibilidad, reserva_id: 12 });

    componente.cambiarReserva('0');
    componente.cambiarReserva('');
    httpTestingController.expectNone(
      request => request.url === `${RECURSOS_URL}/disponibilidad` && request.params.get('reserva_id') === '0'
    );
    expect(componente.reservaId).toBe(12);
  });

  it('suma las cantidades pedidas y detecta el exceso sobre lo disponible', () => {
    componente.lineas[0].cantidad = 2;
    componente.lineas[1].cantidad = 1;

    expect(componente.totalSolicitado).toBe(3);
    expect(componente.hayExceso).toBeFalse();
    expect(componente.puedeEnviar).toBeTrue();

    componente.lineas[0].cantidad = 3;
    expect(componente.hayExceso).toBeTrue();
    expect(componente.puedeEnviar).toBeFalse();
  });

  it('no permite enviar sin reserva o sin unidades seleccionadas', () => {
    expect(componente.puedeEnviar).toBeFalse();

    componente.reservaId = null;
    componente.lineas[0].cantidad = 1;
    expect(componente.puedeEnviar).toBeFalse();

    componente.reservaId = 9;
    componente.lineas[0].cantidad = 0;
    expect(componente.puedeEnviar).toBeFalse();
  });

  it('arma la etiqueta de la reserva con espacio, fecha y franja', () => {
    expect(componente.etiquetaReserva(reservas[0])).toBe(
      '#9 · Laboratorio de Redes · 2026-11-10 10:00 a 12:00'
    );
  });

  it('envía la solicitud con las líneas que tienen cantidad y la observación limpia', () => {
    const emitido = jasmine.createSpy('solicitado');
    componente.solicitado.subscribe(emitido);

    componente.lineas[0].cantidad = 2;
    componente.lineas[1].cantidad = 0;
    componente.observacion = '  Para la clase  ';

    componente.enviar();

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/solicitudes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      reserva_id: 9,
      detalle: [{ tipo_recurso_id: 1, cantidad: 2 }],
      observacion: 'Para la clase'
    });
    expect(componente.enviando).toBeTrue();

    req.flush(solicitud);

    expect(componente.enviando).toBeFalse();
    expect(emitido).toHaveBeenCalledWith(solicitud);
  });

  it('envía observación nula cuando solo hay espacios en blanco', () => {
    componente.lineas[1].cantidad = 1;
    componente.observacion = '   ';

    componente.enviar();

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/solicitudes`);
    expect(req.request.body.observacion).toBeNull();
    req.flush(solicitud);
  });

  it('ignora el envío cuando no se puede enviar', () => {
    componente.lineas[0].cantidad = 0;
    componente.enviar();

    httpTestingController.expectNone(`${RECURSOS_URL}/solicitudes`);
    expect(componente.enviando).toBeFalse();
  });

  it('muestra el error del API cuando falla el envío', () => {
    componente.lineas[0].cantidad = 1;
    componente.enviar();

    httpTestingController
      .expectOne(`${RECURSOS_URL}/solicitudes`)
      .flush({ detail: 'No hay stock suficiente' }, { status: 409, statusText: 'Conflict' });

    expect(componente.enviando).toBeFalse();
    expect(componente.error).toBe('No hay stock suficiente');
  });

  it('usa un mensaje por defecto cuando el envío falla sin detalle', () => {
    componente.lineas[0].cantidad = 1;
    componente.enviar();

    httpTestingController
      .expectOne(`${RECURSOS_URL}/solicitudes`)
      .flush(null, { status: 500, statusText: 'Error' });

    expect(componente.error).toBe('No se pudo registrar la solicitud.');
  });

  it('emite el cierre solo cuando no hay un envío en curso', () => {
    const cerrado = jasmine.createSpy('cerrado');
    componente.cerrado.subscribe(cerrado);

    componente.cerrar();
    expect(cerrado).toHaveBeenCalledTimes(1);

    componente.enviando = true;
    componente.cerrar();
    expect(cerrado).toHaveBeenCalledTimes(1);
  });
});
