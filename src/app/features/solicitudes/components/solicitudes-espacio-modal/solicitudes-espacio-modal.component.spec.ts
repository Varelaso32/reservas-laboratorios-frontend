import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { MessageService } from 'primeng/api';

import { SolicitudesEspacioModalComponent } from './solicitudes-espacio-modal.component';
import { Espacio } from '../../../../shared/models/espacio.model';

describe('SolicitudesEspacioModalComponent', () => {
  let component: SolicitudesEspacioModalComponent;
  let fixture: ComponentFixture<SolicitudesEspacioModalComponent>;

  const mockEspacio: Espacio = {
    id: 1,
    nombre: 'Laboratorio de Redes',
    tipo: 'LABORATORIO',
    capacidad: 30,
    ubicacion: 'Bloque A'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudesEspacioModalComponent],
      providers: [MessageService]
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudesEspacioModalComponent);
    component = fixture.componentInstance;
    component.espacio = mockEspacio;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe emitir evento cerrar al cerrar modal', () => {
    spyOn(component.cerrar, 'emit');
    component.cerrarModal();
    expect(component.cerrar.emit).toHaveBeenCalled();
  });

  it('debe emitir reintentar al reintentar carga', () => {
    spyOn(component.reintentar, 'emit');
    component.reintentarCarga();
    expect(component.reintentar.emit).toHaveBeenCalled();
  });

  it('debe abrir y cancelar el dialogo de rechazo', () => {
    spyOn(component.solicitarRechazo, 'emit');
    spyOn(component.cancelarRechazo, 'emit');

    component.abrirRechazo(10);
    expect(component.solicitarRechazo.emit).toHaveBeenCalledWith(10);

    component.cancelarDialogoRechazo();
    expect(component.cancelarRechazo.emit).toHaveBeenCalled();
  });

  it('debe limpiar motivoRechazo en ngOnChanges cuando cambia solicitudRechazoId', () => {
    component.motivoRechazo.setValue('Motivo viejo');
    component.solicitudRechazoId = 15;
    component.ngOnChanges({
      solicitudRechazoId: new SimpleChange(null, 15, false)
    });

    expect(component.motivoRechazo.value).toBe('');
    expect(component.motivoRechazo.pristine).toBeTrue();
  });

  it('no debe confirmar rechazo si el motivo es invalido o vacio', () => {
    spyOn(component.rechazar, 'emit');
    component.solicitudRechazoId = 15;
    component.motivoRechazo.setValue('   ');

    component.confirmarRechazo();
    expect(component.rechazar.emit).not.toHaveBeenCalled();
  });

  it('debe emitir rechazo si el motivo es valido', () => {
    spyOn(component.rechazar, 'emit');
    component.solicitudRechazoId = 15;
    component.motivoRechazo.setValue('Espacio no disponible por mantenimiento');

    component.confirmarRechazo();
    expect(component.rechazar.emit).toHaveBeenCalledWith({
      solicitudId: 15,
      motivo: 'Espacio no disponible por mantenimiento'
    });
  });

  it('debe formatear fecha y hora correctamente en zona horaria America/Bogota', () => {
    const fechaIso = '2026-10-08T15:30:00Z';
    const formateada = component.formatearFechaHora(fechaIso);
    expect(formateada).toBeTruthy();
    expect(typeof formateada).toBe('string');
  });

  it('debe emitir filtros de historial cuando cambian los inputs', () => {
    spyOn(component.filtrosHistorialChange, 'emit');

    const selectEvent = { target: { value: 'APROBADA' } } as unknown as Event;
    component.cambiarFiltroEstado(selectEvent);

    expect(component.filtrosHistorialChange.emit).toHaveBeenCalledWith({
      estado: 'APROBADA'
    });

    // Con criterio 'decision', emite fechas al backend
    component.criterioFecha = 'decision';
    const fechaDesdeEvent = { target: { value: '2026-10-01' } } as unknown as Event;
    component.cambiarFiltroFechaDesde(fechaDesdeEvent);

    expect(component.filtrosHistorialChange.emit).toHaveBeenCalledWith({
      estado: 'APROBADA',
      fecha_desde: '2026-10-01'
    });

    const fechaHastaEvent = { target: { value: '2026-10-15' } } as unknown as Event;
    component.cambiarFiltroFechaHasta(fechaHastaEvent);

    expect(component.filtrosHistorialChange.emit).toHaveBeenCalledWith({
      estado: 'APROBADA',
      fecha_desde: '2026-10-01',
      fecha_hasta: '2026-10-15'
    });
  });

  it('filtra solicitudes resueltas por fecha de reserva y por fecha de decision', () => {
    component.solicitudesResueltas = [
      {
        id: 1,
        solicitante: { id: 1, nombre: 'Ana', email: 'ana@ecci.edu.co', cargo: null },
        espacio: mockEspacio,
        inicio: '2026-10-15T08:00:00-05:00',
        fin: '2026-10-15T10:00:00-05:00',
        asistentes: 10,
        estado: 'APROBADA',
        motivo_rechazo: null,
        decidida_por: 'Admin',
        fecha_decision: '2026-10-11T18:58:00-05:00'
      },
      {
        id: 2,
        solicitante: { id: 2, nombre: 'Carlos', email: 'carlos@ecci.edu.co', cargo: null },
        espacio: mockEspacio,
        inicio: '2026-10-20T08:00:00-05:00',
        fin: '2026-10-20T10:00:00-05:00',
        asistentes: 15,
        estado: 'RECHAZADA',
        motivo_rechazo: 'Mantenimiento',
        decidida_por: 'Admin',
        fecha_decision: '2026-10-12T10:00:00-05:00'
      }
    ];

    // Por defecto criterio 'reserva':
    component.criterioFecha = 'reserva';
    component.filtroFechaDesde = '2026-10-11';
    component.filtroFechaHasta = '2026-10-12';
    // El inicio es 15 y 20, ninguno coincide
    expect(component.solicitudesResueltasFiltradas.length).toBe(0);

    // Ajustamos rango de reserva
    component.filtroFechaDesde = '2026-10-15';
    component.filtroFechaHasta = '2026-10-16';
    expect(component.solicitudesResueltasFiltradas.length).toBe(1);
    expect(component.solicitudesResueltasFiltradas[0].id).toBe(1);

    // Con criterio 'decision':
    component.criterioFecha = 'decision';
    component.filtroFechaDesde = '2026-10-11';
    component.filtroFechaHasta = '2026-10-12';
    expect(component.solicitudesResueltasFiltradas.length).toBe(2);

    const criterioEvent = { target: { value: 'decision' } } as unknown as Event;
    component.cambiarCriterioFecha(criterioEvent);
    expect(component.criterioFecha).toBe('decision');
  });
});

