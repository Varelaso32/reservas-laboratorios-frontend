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
});

