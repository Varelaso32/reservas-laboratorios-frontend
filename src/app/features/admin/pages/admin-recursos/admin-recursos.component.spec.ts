import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { NotificacionesService } from '../../../../core/services/notificaciones.service';
import type {
  PrestamoRecurso,
  SolicitudRecurso,
  TipoRecurso
} from '../../../../shared/models/recurso.model';
import { AdminRecursosComponent } from './admin-recursos.component';

const RECURSOS_URL = `${API_BASE_URL}/recursos`;

describe('AdminRecursosComponent', () => {
  let fixture: ComponentFixture<AdminRecursosComponent>;
  let componente: AdminRecursosComponent;
  let httpTestingController: HttpTestingController;
  let messageService: MessageService;

  const tipo: TipoRecurso = {
    id: 1,
    nombre: 'Portátil',
    descripcion: 'Equipo de préstamo',
    activo: true,
    total: 5,
    instalados: 3,
    disponibles: 2,
    prestados: 1,
    reservados: 0,
    fallidos: 0
  };

  const tipoProyector: TipoRecurso = {
    ...tipo,
    id: 2,
    nombre: 'Proyector',
    descripcion: null,
    total: 2,
    instalados: 2,
    disponibles: 1,
    prestados: 0,
    reservados: 1
  };

  const solicitudPendiente: SolicitudRecurso = {
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

  const solicitudAprobada: SolicitudRecurso = {
    ...solicitudPendiente,
    id: 32,
    estado: 'APROBADA',
    decidida_por: 'Administrador',
    fecha_decision: '2026-11-05T11:00:00'
  };

  const prestamoAsignado: PrestamoRecurso = {
    id: 51,
    solicitud_recurso_id: 32,
    reserva_id: 9,
    recurso_id: 101,
    codigo: 'PORT-01',
    tipo: 'Portátil',
    solicitante: 'Ana Docente',
    inicio: '2026-11-10T10:00:00',
    fin: '2026-11-10T12:00:00',
    estado: 'ASIGNADA',
    entregada_en: null,
    devuelta_en: null,
    estado_devolucion: null,
    comentario_devolucion: null,
    strikes_generados: 0
  };

  const prestamoEntregado: PrestamoRecurso = {
    ...prestamoAsignado,
    id: 52,
    codigo: 'PORT-02',
    estado: 'ENTREGADA',
    entregada_en: '2026-11-10T10:05:00'
  };

  const prestamoDevuelto: PrestamoRecurso = {
    ...prestamoAsignado,
    id: 53,
    codigo: 'PORT-03',
    estado: 'DEVUELTA',
    entregada_en: '2026-11-10T10:05:00',
    devuelta_en: '2026-11-10T11:55:00',
    estado_devolucion: 'EN_FUNCIONAMIENTO'
  };

  function responderCarga(): void {
    httpTestingController.expectOne(`${RECURSOS_URL}/solicitudes`).flush([
      solicitudPendiente,
      solicitudAprobada
    ]);
    httpTestingController
      .expectOne(`${RECURSOS_URL}/asignaciones`)
      .flush([prestamoAsignado, prestamoEntregado, prestamoDevuelto]);
    httpTestingController.expectOne(`${RECURSOS_URL}/tipos`).flush([tipo, tipoProyector]);
  }

  function responderRecarga(): void {
    httpTestingController.expectOne(`${RECURSOS_URL}/asignaciones`).flush([]);
    httpTestingController.expectOne(`${RECURSOS_URL}/tipos`).flush([tipo]);
  }

  beforeEach(async () => {
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'admin-session-token');
    sessionStorage.setItem('usuario', JSON.stringify({
      id: 1,
      nombre: 'Super Administrador',
      email: 'admin@reservas.test',
      rol: 'ADMIN',
      cargo: 'ADMINISTRADOR_SISTEMA'
    }));

    messageService = new MessageService();
    spyOn(messageService, 'add').and.callThrough();

    await TestBed.configureTestingModule({
      imports: [AdminRecursosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MessageService, useValue: messageService },
        {
          provide: NotificacionesService,
          useValue: {
            resumen: () => of({ no_leidas: 0 }),
            listar: () => of([]),
            marcarTodasLeidas: () => of({ actualizadas: 0 }),
            marcarLeida: () => of(null)
          }
        }
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminRecursosComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    responderCarga();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('carga solicitudes, préstamos y tipos al iniciar', () => {
    expect(componente.solicitudes).toEqual([solicitudPendiente, solicitudAprobada]);
    expect(componente.prestamos).toEqual([
      prestamoAsignado,
      prestamoEntregado,
      prestamoDevuelto
    ]);
    expect(componente.tipos).toEqual([tipo, tipoProyector]);
    expect(componente.cargando).toBeFalse();
    expect(componente.error).toBeNull();
  });

  it('calcula los contadores de pendientes, préstamos vigentes y unidades', () => {
    expect(componente.pendientes).toBe(1);
    expect(componente.prestamosVigentes).toBe(2);
    expect(componente.unidadesActivas).toBe(7);
    expect(componente.unidadesInstaladas).toBe(5);
  });

  it('filtra las solicitudes por estado o las muestra todas', () => {
    expect(componente.solicitudesFiltradas).toEqual([solicitudPendiente]);

    componente.filtroEstado = 'TODAS';
    expect(componente.solicitudesFiltradas).toEqual([
      solicitudPendiente,
      solicitudAprobada
    ]);

    componente.filtroEstado = 'RECHAZADA';
    expect(componente.solicitudesFiltradas).toEqual([]);
  });

  it('filtra los préstamos vigentes o muestra el historial completo', () => {
    expect(componente.prestamosFiltrados).toEqual([
      prestamoAsignado,
      prestamoEntregado
    ]);

    componente.soloVigentes = false;
    expect(componente.prestamosFiltrados).toHaveSize(3);
  });

  it('muestra el error del API cuando no se pueden cargar las solicitudes', () => {
    componente.cargar();
    httpTestingController
      .expectOne(`${RECURSOS_URL}/solicitudes`)
      .flush({ detail: 'Sin permisos' }, { status: 403, statusText: 'Forbidden' });
    httpTestingController.expectOne(`${RECURSOS_URL}/asignaciones`).flush([]);
    httpTestingController.expectOne(`${RECURSOS_URL}/tipos`).flush([]);

    expect(componente.cargando).toBeFalse();
    expect(componente.error).toBe('Sin permisos');
  });

  it('usa un mensaje por defecto cuando la carga falla sin detalle', () => {
    componente.cargar();
    httpTestingController
      .expectOne(`${RECURSOS_URL}/solicitudes`)
      .flush(null, { status: 500, statusText: 'Error' });
    httpTestingController.expectOne(`${RECURSOS_URL}/asignaciones`).flush([]);
    httpTestingController.expectOne(`${RECURSOS_URL}/tipos`).flush([]);

    expect(componente.error).toBe('No se pudieron cargar las solicitudes de recursos.');
  });

  it('ignora los errores de préstamos y tipos sin romper la carga', () => {
    componente.cargar();
    httpTestingController.expectOne(`${RECURSOS_URL}/solicitudes`).flush([]);
    httpTestingController
      .expectOne(`${RECURSOS_URL}/asignaciones`)
      .flush(null, { status: 500, statusText: 'Error' });
    httpTestingController
      .expectOne(`${RECURSOS_URL}/tipos`)
      .flush(null, { status: 500, statusText: 'Error' });

    // Los errores secundarios se descartan: no marcan error global ni vacían lo ya cargado.
    expect(componente.error).toBeNull();
    expect(componente.prestamos).toHaveSize(3);
    expect(componente.tipos).toHaveSize(2);
  });

  it('cambia de sección y alterna el panel de parámetros', () => {
    expect(componente.seccion).toBe('catalogo');
    expect(componente.parametrosAbierto).toBeTrue();

    componente.cambiarSeccion('prestamos');
    expect(componente.seccion).toBe('prestamos');

    componente.alternarParametros();
    expect(componente.parametrosAbierto).toBeFalse();
  });

  it('expone el usuario actual y sus iniciales', () => {
    expect(componente.usuarioActual?.nombre).toBe('Super Administrador');
    expect(componente.inicialesUsuario).toBe('SA');
  });

  it('procesa las devoluciones vencidas y avisa cuando hay strikes', () => {
    componente.procesarRetrasos();
    expect(componente.procesando).toBeTrue();

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/procesar-retrasos`);
    expect(req.request.method).toBe('POST');
    req.flush({ notificados: 3, strikes: 2 });

    expect(componente.procesando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'admin-recursos',
      severity: 'warn',
      detail: '3 devolución(es) tardía(s) y 2 strike(s) generados.'
    }));
    responderRecarga();
  });

  it('avisa que no hay devoluciones vencidas cuando el barrido no notifica', () => {
    componente.procesarRetrasos();
    httpTestingController
      .expectOne(`${RECURSOS_URL}/procesar-retrasos`)
      .flush({ notificados: 0, strikes: 0 });

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'success',
      detail: 'No hay devoluciones vencidas.'
    }));
    responderRecarga();
  });

  it('notifica el error cuando el barrido de devoluciones falla', () => {
    componente.procesarRetrasos();
    httpTestingController
      .expectOne(`${RECURSOS_URL}/procesar-retrasos`)
      .flush({ detail: 'Error interno' }, { status: 500, statusText: 'Error' });

    expect(componente.procesando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'admin-recursos',
      severity: 'error',
      detail: 'Error interno'
    }));
  });

  it('abre y cierra la decisión de una solicitud', () => {
    componente.abrirDecision(solicitudPendiente, true);
    expect(componente.decision).toEqual({
      solicitud: solicitudPendiente,
      aprobando: true,
      motivo: ''
    });

    componente.cerrarDecision();
    expect(componente.decision).toBeNull();
  });

  it('no envía el rechazo sin motivo', () => {
    componente.abrirDecision(solicitudPendiente, false);
    componente.confirmarDecision();

    httpTestingController.expectNone(`${RECURSOS_URL}/solicitudes/31/decision`);
    expect(componente.guardando).toBeFalse();
  });

  it('aprueba una solicitud y refresca préstamos y tipos', () => {
    componente.abrirDecision(solicitudPendiente, true);
    componente.confirmarDecision();

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/solicitudes/31/decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ aprobar: true, motivo: null });
    req.flush({ ...solicitudPendiente, estado: 'APROBADA' });

    expect(componente.guardando).toBeFalse();
    expect(componente.decision).toBeNull();
    expect(componente.solicitudes[0].estado).toBe('APROBADA');
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'admin-recursos',
      severity: 'success',
      summary: 'Solicitud aprobada'
    }));
    responderRecarga();
  });

  it('rechaza una solicitud con el motivo limpio', () => {
    componente.abrirDecision(solicitudPendiente, false);
    componente.decision!.motivo = '  Sin disponibilidad  ';
    componente.confirmarDecision();

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/solicitudes/31/decision`);
    expect(req.request.body).toEqual({ aprobar: false, motivo: 'Sin disponibilidad' });
    req.flush({ ...solicitudPendiente, estado: 'RECHAZADA' });

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      summary: 'Solicitud rechazada'
    }));
    responderRecarga();
  });

  it('notifica el error cuando la decisión de la solicitud falla', () => {
    componente.abrirDecision(solicitudPendiente, true);
    componente.confirmarDecision();

    httpTestingController
      .expectOne(`${RECURSOS_URL}/solicitudes/31/decision`)
      .flush({ detail: 'Ya fue decidida' }, { status: 409, statusText: 'Conflict' });

    expect(componente.guardando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'No se pudo decidir',
      detail: 'Ya fue decidida'
    }));
  });

  it('ignora la decisión si no hay una abierta o ya se está guardando', () => {
    componente.decision = null;
    componente.confirmarDecision();

    componente.abrirDecision(solicitudPendiente, true);
    componente.guardando = true;
    componente.confirmarDecision();

    expect(componente.decision).not.toBeNull();
    expect(componente.guardando).toBeTrue();
    httpTestingController.expectNone(`${RECURSOS_URL}/solicitudes/31/decision`);
  });

  it('registra la entrega de un préstamo', () => {
    componente.registrarEntrega(prestamoAsignado);

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/asignaciones/51/entrega`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...solicitudAprobada });

    expect(componente.guardando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      summary: 'Entrega registrada',
      detail: 'La unidad PORT-01 salió del inventario.'
    }));
    responderRecarga();
  });

  it('notifica el error al registrar la entrega', () => {
    componente.registrarEntrega(prestamoAsignado);
    httpTestingController
      .expectOne(`${RECURSOS_URL}/asignaciones/51/entrega`)
      .flush({ detail: 'Unidad no disponible' }, { status: 409, statusText: 'Conflict' });

    expect(componente.guardando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      detail: 'Unidad no disponible'
    }));
  });

  it('ignora la entrega mientras hay otra operación en curso', () => {
    componente.guardando = true;
    componente.registrarEntrega(prestamoAsignado);

    expect(componente.guardando).toBeTrue();
    httpTestingController.expectNone(`${RECURSOS_URL}/asignaciones/51/entrega`);
  });

  it('abre, cierra y confirma la devolución de un préstamo', () => {
    componente.abrirDevolucion(prestamoEntregado);
    expect(componente.devolucion).toEqual({
      prestamo: prestamoEntregado,
      estado: 'EN_FUNCIONAMIENTO',
      comentario: ''
    });

    componente.cerrarDevolucion();
    expect(componente.devolucion).toBeNull();

    componente.abrirDevolucion(prestamoEntregado);
    componente.devolucion!.estado = 'FALLIDO';
    componente.devolucion!.comentario = '  Pantalla rota  ';
    componente.confirmarDevolucion();

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/asignaciones/52/devolucion`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ estado: 'FALLIDO', comentario: 'Pantalla rota' });
    req.flush({ ...solicitudAprobada });

    expect(componente.devolucion).toBeNull();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      summary: 'Devolución registrada',
      detail: 'La unidad PORT-02 volvió al inventario.'
    }));
    responderRecarga();
  });

  it('envía comentario nulo cuando la devolución no lleva observación', () => {
    componente.abrirDevolucion(prestamoEntregado);
    componente.confirmarDevolucion();

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/asignaciones/52/devolucion`);
    expect(req.request.body).toEqual({ estado: 'EN_FUNCIONAMIENTO', comentario: null });
    req.flush({ ...solicitudAprobada });
    responderRecarga();
  });

  it('notifica el error al registrar la devolución', () => {
    componente.abrirDevolucion(prestamoEntregado);
    componente.confirmarDevolucion();
    httpTestingController
      .expectOne(`${RECURSOS_URL}/asignaciones/52/devolucion`)
      .flush({ detail: 'Préstamo ya devuelto' }, { status: 409, statusText: 'Conflict' });

    expect(componente.guardando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      detail: 'Préstamo ya devuelto'
    }));
  });

  it('ignora la devolución si no hay una abierta o ya se está guardando', () => {
    componente.devolucion = null;
    componente.confirmarDevolucion();

    componente.abrirDevolucion(prestamoEntregado);
    componente.guardando = true;
    componente.confirmarDevolucion();

    expect(componente.devolucion).not.toBeNull();
    expect(componente.guardando).toBeTrue();
    httpTestingController.expectNone(`${RECURSOS_URL}/asignaciones/52/devolucion`);
  });

  it('prepara el formulario de un recurso nuevo y de uno existente', () => {
    componente.nuevoTipo();
    expect(componente.formularioTipo).toEqual({
      nombre: '',
      descripcion: '',
      cantidad: 1
    });
    expect(componente.tipoEnEdicion).toBeNull();

    componente.editarTipo(tipo);
    expect(componente.tipoEnEdicion).toBe(tipo);
    expect(componente.formularioTipo).toEqual({
      nombre: 'Portátil',
      descripcion: 'Equipo de préstamo',
      cantidad: 5
    });

    componente.cerrarFormularioTipo();
    expect(componente.formularioTipo).toBeNull();
    expect(componente.tipoEnEdicion).toBeNull();
  });

  it('crea un tipo de recurso y recarga el catálogo', () => {
    componente.nuevoTipo();
    componente.formularioTipo = {
      nombre: '  Cámara  ',
      descripcion: '  Full HD  ',
      cantidad: 2
    };
    componente.guardarTipo();

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/tipos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Cámara',
      descripcion: 'Full HD',
      cantidad: 2
    });
    req.flush({ ...tipo, id: 3, nombre: 'Cámara', total: 2 });

    expect(componente.guardando).toBeFalse();
    expect(componente.formularioTipo).toBeNull();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      summary: 'Recurso creado'
    }));
    httpTestingController.expectOne(`${RECURSOS_URL}/tipos`).flush([tipo]);
  });

  it('actualiza un tipo existente enviando la descripción nula si está vacía', () => {
    componente.editarTipo(tipoProyector);
    componente.formularioTipo!.descripcion = '   ';
    componente.guardarTipo();

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/tipos/2`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      nombre: 'Proyector',
      descripcion: null,
      cantidad: 2
    });
    req.flush(tipoProyector);

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      summary: 'Recurso actualizado'
    }));
    httpTestingController.expectOne(`${RECURSOS_URL}/tipos`).flush([tipo]);
  });

  it('valida la cantidad y el nombre antes de guardar', () => {
    componente.nuevoTipo();
    componente.formularioTipo!.nombre = '   ';
    componente.guardarTipo();
    httpTestingController.expectNone(`${RECURSOS_URL}/tipos`);

    componente.formularioTipo!.nombre = 'Cámara';
    componente.formularioTipo!.cantidad = 1.5;
    componente.guardarTipo();

    httpTestingController.expectNone(`${RECURSOS_URL}/tipos`);
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'warn',
      summary: 'Revisa la cantidad'
    }));

    componente.formularioTipo!.cantidad = -1;
    componente.guardarTipo();
    httpTestingController.expectNone(`${RECURSOS_URL}/tipos`);
  });

  it('notifica el error al guardar un tipo de recurso', () => {
    componente.nuevoTipo();
    componente.formularioTipo!.nombre = 'Cámara';
    componente.guardarTipo();

    httpTestingController
      .expectOne(`${RECURSOS_URL}/tipos`)
      .flush({ detail: 'Nombre repetido' }, { status: 409, statusText: 'Conflict' });

    expect(componente.guardando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'No se pudo guardar el recurso',
      detail: 'Nombre repetido'
    }));
  });

  it('ignora el guardado si no hay formulario o ya se está guardando', () => {
    componente.formularioTipo = null;
    componente.guardarTipo();

    componente.nuevoTipo();
    componente.formularioTipo!.nombre = 'Cámara';
    componente.guardando = true;
    componente.guardarTipo();

    expect(componente.formularioTipo).not.toBeNull();
    expect(componente.guardando).toBeTrue();
    httpTestingController.expectNone(`${RECURSOS_URL}/tipos`);
  });

  it('activa y desactiva un tipo de recurso', () => {
    componente.alternarActivoTipo(tipo);

    const req = httpTestingController.expectOne(`${RECURSOS_URL}/tipos/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activo: false });
    req.flush({ ...tipo, activo: false });

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      summary: 'Recurso desactivado',
      detail: 'Portátil'
    }));
    httpTestingController.expectOne(`${RECURSOS_URL}/tipos`).flush([tipo]);
  });

  it('notifica el error al cambiar el estado de un tipo', () => {
    componente.alternarActivoTipo(tipo);
    httpTestingController
      .expectOne(`${RECURSOS_URL}/tipos/1`)
      .flush({ detail: 'Recurso en uso' }, { status: 409, statusText: 'Conflict' });

    expect(componente.guardando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      detail: 'Recurso en uso'
    }));
  });

  it('ignora el cambio de estado mientras hay otra operación en curso', () => {
    componente.guardando = true;
    componente.alternarActivoTipo(tipo);

    expect(componente.guardando).toBeTrue();
    httpTestingController.expectNone(`${RECURSOS_URL}/tipos/1`);
  });

  it('arma la franja horaria y devuelve vacío si faltan fechas', () => {
    expect(componente.franja('2026-11-10T10:00:00', '2026-11-10T12:00:00')).toBe(
      '2026-11-10 · 10:00 a 12:00'
    );
    expect(componente.franja(null, '2026-11-10T12:00:00')).toBe('');
    expect(componente.franja('2026-11-10T10:00:00', null)).toBe('');
  });

  it('traduce los estados de solicitud y préstamo con su clase de estilo', () => {
    expect(componente.nombreEstado('PENDIENTE')).toBe('Pendiente');
    expect(componente.nombreEstado('APROBADA')).toBe('Aprobada');
    expect(componente.nombreEstado('OTRO')).toBe('OTRO');
    expect(componente.claseEstadoSolicitud('PENDIENTE')).toBe(
      'badge-estado estado-pendiente'
    );

    expect(componente.nombreEstadoPrestamo('ASIGNADA')).toBe('Asignada');
    expect(componente.nombreEstadoPrestamo('ENTREGADA')).toBe('Entregada');
    expect(componente.nombreEstadoPrestamo('OTRO')).toBe('OTRO');
    expect(componente.claseEstadoPrestamo('ENTREGADA')).toBe(
      'badge-estado estado-entregada'
    );
  });

  it('marca como vencido solo un préstamo entregado con fecha pasada', () => {
    expect(componente.vencido({ ...prestamoEntregado, fin: '2020-01-01T10:00:00' })).toBeTrue();
    expect(componente.vencido({ ...prestamoEntregado, fin: '2999-01-01T10:00:00' })).toBeFalse();
    expect(componente.vencido({ ...prestamoAsignado, fin: '2020-01-01T10:00:00' })).toBeFalse();
  });

  it('cierra sesión y vuelve al login', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');

    componente.cerrarSesion();

    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
