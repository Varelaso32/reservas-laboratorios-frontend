import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { API_BASE_URL } from '../../../../core/config/api.config';
import type {
  Reactivacion,
  ReporteSanciones,
  Strike,
  UsuarioSancionado
} from '../../../../shared/models/sancion.model';
import { AdminSancionesComponent } from './admin-sanciones.component';

const REPORTE_URL = `${API_BASE_URL}/sanciones/reporte`;

describe('AdminSancionesComponent', () => {
  let fixture: ComponentFixture<AdminSancionesComponent>;
  let componente: AdminSancionesComponent;
  let httpTestingController: HttpTestingController;
  let messageService: MessageService;

  const strike: Strike = {
    id: 4,
    reserva_id: 9,
    espacio: 'Laboratorio de Redes',
    inicio: '2026-11-01T08:00:00',
    minutos_retraso: 12,
    anulado: false,
    motivo_anulacion: null,
    creada_en: '2026-11-01T08:20:00'
  };

  const strikeAnulado: Strike = {
    ...strike,
    id: 5,
    anulado: true,
    motivo_anulacion: 'Reactivación aprobada'
  };

  const reactivacion: Reactivacion = {
    id: 3,
    usuario_id: 7,
    usuario: 'Ana Docente',
    estado: 'PENDIENTE',
    justificacion: 'Tuve una emergencia',
    detalle: [{ strike_id: 4, justificacion: 'Cita médica' }],
    strikes_anulados: 0,
    creada_en: '2026-11-02T09:00:00',
    decidida_por: null,
    fecha_decision: null,
    motivo_rechazo: null
  };

  const sancionado: UsuarioSancionado = {
    usuario_id: 7,
    nombre: 'Ana Docente',
    email: 'ana@reservas.test',
    rol: 'SOLICITANTE',
    cargo: 'DOCENTE',
    strikes_activos: 1,
    bloqueado: true,
    strikes: [strike, strikeAnulado],
    reactivacion
  };

  const reporte: ReporteSanciones = {
    total_usuarios: 1,
    total_bloqueados: 1,
    usuarios: [sancionado],
    reactivaciones_pendientes: [reactivacion]
  };

  function responderReporte(cuerpo: ReporteSanciones = reporte): void {
    httpTestingController.expectOne(REPORTE_URL).flush(cuerpo);
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
      imports: [AdminSancionesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MessageService, useValue: messageService }
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminSancionesComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    responderReporte();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('carga el reporte de sanciones al iniciar', () => {
    expect(componente.reporte).toEqual(reporte);
    expect(componente.cargando).toBeFalse();
    expect(componente.error).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ana Docente');
  });

  it('muestra el error del API cuando el reporte no se puede cargar', () => {
    componente.cargarReporte();
    httpTestingController
      .expectOne(REPORTE_URL)
      .flush({ detail: 'Servicio no disponible' }, { status: 503, statusText: 'Unavailable' });

    expect(componente.reporte).toBeNull();
    expect(componente.cargando).toBeFalse();
    expect(componente.error).toBe('Servicio no disponible');
  });

  it('usa un mensaje por defecto cuando el reporte falla sin detalle', () => {
    componente.cargarReporte();
    httpTestingController.expectOne(REPORTE_URL).flush(null, { status: 500, statusText: 'Error' });

    expect(componente.error).toBe('No se pudo cargar el reporte de sanciones.');
  });

  it('alterna el filtro de bloqueados y recarga el reporte', () => {
    componente.alternarFiltro();

    expect(componente.soloBloqueados).toBeTrue();
    httpTestingController.expectOne(`${REPORTE_URL}?solo_bloqueados=true`).flush(reporte);

    componente.alternarFiltro();
    expect(componente.soloBloqueados).toBeFalse();
    httpTestingController.expectOne(REPORTE_URL).flush(reporte);
  });

  it('procesa las reservas vencidas y recarga el reporte', () => {
    componente.procesarVencidas();
    expect(componente.procesando).toBeTrue();

    const req = httpTestingController.expectOne(`${API_BASE_URL}/sanciones/procesar`);
    expect(req.request.method).toBe('POST');
    req.flush({ advertencias: 2, no_shows: 1 });

    expect(componente.procesando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'success',
      summary: 'Procesamiento completado',
      detail: '2 advertencia(s) y 1 no-show registrados.'
    }));
    httpTestingController.expectOne(REPORTE_URL).flush(reporte);
  });

  it('no repite el procesamiento mientras hay uno en curso', () => {
    componente.procesando = true;
    componente.procesarVencidas();

    expect(componente.procesando).toBeTrue();
    httpTestingController.expectNone(`${API_BASE_URL}/sanciones/procesar`);
  });

  it('notifica el error cuando el procesamiento falla', () => {
    componente.procesarVencidas();
    httpTestingController
      .expectOne(`${API_BASE_URL}/sanciones/procesar`)
      .flush({ detail: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(componente.procesando).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'No se pudo procesar',
      detail: 'No autorizado'
    }));
  });

  it('abre la decisión con los strikes activos del usuario al aprobar', () => {
    componente.abrirDecision(reactivacion);

    expect(componente.decision).not.toBeNull();
    expect(componente.decision?.rechazando).toBeFalse();
    expect(componente.decision?.strikesAnular).toEqual([4]);
    expect(componente.decision?.motivo).toBe('');
  });

  it('abre la decisión sin strikes preseleccionados al rechazar', () => {
    componente.abrirDecision(reactivacion, true);

    expect(componente.decision?.rechazando).toBeTrue();
    expect(componente.decision?.strikesAnular).toEqual([]);
  });

  it('alterna los strikes a anular y cierra la decisión', () => {
    componente.abrirDecision(reactivacion);

    componente.alternarStrikeAnular(4);
    expect(componente.decision?.strikesAnular).toEqual([]);

    componente.alternarStrikeAnular(6);
    expect(componente.decision?.strikesAnular).toEqual([6]);

    componente.cerrarDecision();
    expect(componente.decision).toBeNull();
  });

  it('no alterna strikes si no hay una decisión abierta', () => {
    componente.decision = null;
    componente.alternarStrikeAnular(4);

    expect(componente.decision).toBeNull();
  });

  it('no cierra la decisión mientras se está guardando', () => {
    componente.abrirDecision(reactivacion);
    componente.guardandoDecision = true;
    componente.cerrarDecision();

    expect(componente.decision).not.toBeNull();
  });

  it('exige el motivo cuando se rechaza la reactivación', () => {
    componente.abrirDecision(reactivacion, true);
    componente.confirmarDecision();

    httpTestingController.expectNone(
      request => request.url.includes('/sanciones/reactivaciones/')
    );
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'warn',
      summary: 'Falta el motivo'
    }));
  });

  it('exige al menos un strike cuando se aprueba la reactivación', () => {
    componente.abrirDecision(reactivacion);
    componente.decision!.strikesAnular = [];
    componente.confirmarDecision();

    httpTestingController.expectNone(
      request => request.url.includes('/sanciones/reactivaciones/')
    );
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'warn',
      summary: 'Selecciona strikes'
    }));
  });

  it('aprueba la reactivación anulando los strikes seleccionados', () => {
    componente.abrirDecision(reactivacion);
    componente.confirmarDecision();

    const req = httpTestingController.expectOne(
      `${API_BASE_URL}/sanciones/reactivaciones/3/decision`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      aprobar: true,
      strikes_anular: [4],
      motivo: null
    });
    req.flush({ ...reactivacion, estado: 'ACEPTADA', strikes_anulados: 1 });

    expect(componente.guardandoDecision).toBeFalse();
    expect(componente.decision).toBeNull();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'success',
      summary: 'Reactivación aceptada',
      detail: 'Se anularon 1 strike(s).'
    }));
    httpTestingController.expectOne(REPORTE_URL).flush(reporte);
  });

  it('rechaza la reactivación con el motivo indicado', () => {
    componente.abrirDecision(reactivacion, true);
    componente.decision!.motivo = '  No cumple los requisitos  ';
    componente.confirmarDecision();

    const req = httpTestingController.expectOne(
      `${API_BASE_URL}/sanciones/reactivaciones/3/decision`
    );
    expect(req.request.body).toEqual({
      aprobar: false,
      strikes_anular: [],
      motivo: 'No cumple los requisitos'
    });
    req.flush({ ...reactivacion, estado: 'RECHAZADA' });

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'success',
      summary: 'Reactivación rechazada'
    }));
    httpTestingController.expectOne(REPORTE_URL).flush(reporte);
  });

  it('notifica el error cuando la decisión falla', () => {
    componente.abrirDecision(reactivacion);
    componente.confirmarDecision();

    httpTestingController
      .expectOne(`${API_BASE_URL}/sanciones/reactivaciones/3/decision`)
      .flush({ detail: 'Ya fue decidida' }, { status: 409, statusText: 'Conflict' });

    expect(componente.guardandoDecision).toBeFalse();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'No se pudo decidir',
      detail: 'Ya fue decidida'
    }));
  });

  it('ignora la decisión si no hay una abierta o ya se está guardando', () => {
    componente.decision = null;
    componente.confirmarDecision();

    componente.abrirDecision(reactivacion);
    componente.guardandoDecision = true;
    componente.confirmarDecision();

    expect(componente.decision).not.toBeNull();
    expect(componente.guardandoDecision).toBeTrue();
    httpTestingController.expectNone(
      request => request.url.includes('/sanciones/reactivaciones/')
    );
  });

  it('consulta los strikes del usuario y solo los activos', () => {
    expect(componente.strikesDelUsuario(7)).toEqual([strike, strikeAnulado]);
    expect(componente.strikesActivosDelUsuario(7)).toEqual([strike]);
    expect(componente.strikesDeReactivacion(reactivacion)).toEqual([strike]);
    expect(componente.strikesDelUsuario(99)).toEqual([]);
  });

  it('busca el usuario y la justificación de una reactivación', () => {
    expect(componente.usuarioDeReactivacion(reactivacion)).toEqual(sancionado);
    expect(componente.usuarioDeReactivacion({ ...reactivacion, usuario_id: 99 })).toBeUndefined();
    expect(componente.justificacionDe(reactivacion, 4)).toBe('Cita médica');
    expect(componente.justificacionDe(reactivacion, 99)).toBe('—');
  });

  it('formatea fechas nulas, inválidas y válidas', () => {
    expect(componente.formatearFecha(null)).toBe('—');
    expect(componente.formatearFecha('no-es-fecha')).toBe('no-es-fecha');
    expect(componente.formatearFecha('2026-11-03T13:00:00Z')).toContain('2026');
  });

  it('alterna el panel de parámetros', () => {
    expect(componente.parametrosAbierto).toBeFalse();

    componente.alternarParametros();
    expect(componente.parametrosAbierto).toBeTrue();

    componente.alternarParametros();
    expect(componente.parametrosAbierto).toBeFalse();
  });

  it('expone el usuario actual y sus iniciales', () => {
    expect(componente.usuarioActual?.nombre).toBe('Super Administrador');
    expect(componente.inicialesUsuario).toBe('SA');
  });

  it('cierra sesión y vuelve al login', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');

    componente.cerrarSesion();

    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
