import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Toast } from 'primeng/toast';

import { Espacio } from '../../../../shared/models/espacio.model';
import {
  EstadoDetalleSolicitud,
  SolicitudPendiente,
  SolicitudResuelta
} from '../../../../shared/models/solicitud.model';

@Component({
  selector: 'app-solicitudes-espacio-modal',
  standalone: true,
  imports: [ReactiveFormsModule, Toast],
  templateUrl: './solicitudes-espacio-modal.component.html',
  styleUrl: './solicitudes-espacio-modal.component.scss'
})
export class SolicitudesEspacioModalComponent implements OnChanges {
  @Input() espacio: Espacio | null = null;
  @Input() solicitudes: SolicitudPendiente[] = [];
  @Input() cargando = false;
  @Input() error: string | null = null;
  @Input() detalles: ReadonlyMap<number, EstadoDetalleSolicitud> = new Map();
  @Input() aprobandoSolicitudId: number | null = null;
  @Input() solicitudRechazoId: number | null = null;
  @Input() rechazandoSolicitudId: number | null = null;
  @Input() solicitudesResueltas: SolicitudResuelta[] = [];
  @Input() cargandoResueltas = false;
  @Input() errorResueltas: string | null = null;
  @Input() puedeGestionarPendientes = true;
  @Input() puedeVerHistorial = true;

  @Output() cerrar = new EventEmitter<void>();
  @Output() reintentar = new EventEmitter<void>();
  @Output() aprobar = new EventEmitter<number>();
  @Output() solicitarRechazo = new EventEmitter<number>();
  @Output() cancelarRechazo = new EventEmitter<void>();
  @Output() rechazar = new EventEmitter<{ solicitudId: number; motivo: string }>();
  @Output() filtrosHistorialChange = new EventEmitter<{
    estado?: 'APROBADA' | 'RECHAZADA';
    fecha_desde?: string;
    fecha_hasta?: string;
  }>();
  filtroEstado: '' | 'APROBADA' | 'RECHAZADA' = '';
  criterioFecha: 'reserva' | 'decision' = 'reserva';
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  readonly motivoRechazo = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.maxLength(500),
      control => control.value.trim().length > 0 ? null : { whitespace: true }
    ]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['solicitudRechazoId']) {
      this.motivoRechazo.reset('');
      this.motivoRechazo.markAsPristine();
      this.motivoRechazo.markAsUntouched();
    }
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }

  reintentarCarga(): void {
    this.reintentar.emit();
  }

  abrirRechazo(solicitudId: number): void {
    if (this.aprobandoSolicitudId === null && this.rechazandoSolicitudId === null) {
      this.solicitarRechazo.emit(solicitudId);
    }
  }

  cancelarDialogoRechazo(): void {
    if (this.rechazandoSolicitudId === null) {
      this.cancelarRechazo.emit();
    }
  }

  confirmarRechazo(): void {
    this.motivoRechazo.markAsTouched();
    if (
      this.motivoRechazo.invalid ||
      !this.motivoRechazo.value.trim() ||
      this.motivoRechazo.value.length > 500 ||
      this.solicitudRechazoId === null ||
      this.rechazandoSolicitudId !== null
    ) {
      return;
    }

    this.rechazar.emit({
      solicitudId: this.solicitudRechazoId,
      motivo: this.motivoRechazo.value.trim()
    });
  }

  obtenerEstadoDetalle(solicitudId: number): EstadoDetalleSolicitud | undefined {
    return this.detalles.get(solicitudId);
  }

  formatearFechaHora(valor: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Bogota'
    }).format(new Date(valor));
  }

  formatearFecha(valor: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeZone: 'America/Bogota'
    }).format(new Date(valor));
  }

  formatearHora(valor: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      timeStyle: 'short',
      timeZone: 'America/Bogota'
    }).format(new Date(valor));
  }
  cambiarFiltroEstado(event: Event): void {
    this.filtroEstado = (event.target as HTMLSelectElement).value as typeof this.filtroEstado;
    this.emitirFiltrosHistorial();
  }

  cambiarCriterioFecha(event: Event): void {
    this.criterioFecha = (event.target as HTMLSelectElement).value as 'reserva' | 'decision';
    this.emitirFiltrosHistorial();
  }

  cambiarFiltroFechaDesde(event: Event): void {
    this.filtroFechaDesde = (event.target as HTMLInputElement).value;
    this.emitirFiltrosHistorial();
  }

  cambiarFiltroFechaHasta(event: Event): void {
    this.filtroFechaHasta = (event.target as HTMLInputElement).value;
    this.emitirFiltrosHistorial();
  }

  extraerFechaLocal(fechaIso: string): string {
    try {
      const fecha = new Date(fechaIso);
      if (isNaN(fecha.getTime())) {
        return fechaIso.slice(0, 10);
      }
      const formateador = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formateador.format(fecha);
    } catch {
      return fechaIso.slice(0, 10);
    }
  }

  get solicitudesResueltasFiltradas(): SolicitudResuelta[] {
    let lista = this.solicitudesResueltas;
    if (this.filtroEstado) {
      lista = lista.filter(s => s.estado === this.filtroEstado);
    }
    if (this.criterioFecha === 'reserva') {
      if (this.filtroFechaDesde) {
        lista = lista.filter(s => this.extraerFechaLocal(s.inicio) >= this.filtroFechaDesde);
      }
      if (this.filtroFechaHasta) {
        lista = lista.filter(s => this.extraerFechaLocal(s.inicio) <= this.filtroFechaHasta);
      }
    } else if (this.criterioFecha === 'decision') {
      if (this.filtroFechaDesde) {
        lista = lista.filter(s => !!s.fecha_decision && this.extraerFechaLocal(s.fecha_decision) >= this.filtroFechaDesde);
      }
      if (this.filtroFechaHasta) {
        lista = lista.filter(s => !!s.fecha_decision && this.extraerFechaLocal(s.fecha_decision) <= this.filtroFechaHasta);
      }
    }
    return lista;
  }

  reintentarHistorial(): void {
    this.emitirFiltrosHistorial();
  }

  private emitirFiltrosHistorial(): void {
    if (this.criterioFecha === 'decision') {
      this.filtrosHistorialChange.emit({
        ...(this.filtroEstado ? { estado: this.filtroEstado } : {}),
        ...(this.filtroFechaDesde ? { fecha_desde: this.filtroFechaDesde } : {}),
        ...(this.filtroFechaHasta ? { fecha_hasta: this.filtroFechaHasta } : {})
      });
    } else {
      // Para criterio de reserva, no enviamos fecha_desde/fecha_hasta al backend porque
      // el backend filtra por fecha_decision. El filtrado por fecha de reserva se realiza
      // localmente sobre las solicitudes resueltas.
      this.filtrosHistorialChange.emit({
        ...(this.filtroEstado ? { estado: this.filtroEstado } : {})
      });
    }
  }
}