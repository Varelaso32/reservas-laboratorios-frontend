import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Toast } from 'primeng/toast';

import { Espacio } from '../../../../shared/models/espacio.model';
import { EstadoDetalleSolicitud, SolicitudPendiente } from '../../../../shared/models/solicitud.model';

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

  @Output() cerrar = new EventEmitter<void>();
  @Output() reintentar = new EventEmitter<void>();
  @Output() aprobar = new EventEmitter<number>();
  @Output() solicitarRechazo = new EventEmitter<number>();
  @Output() cancelarRechazo = new EventEmitter<void>();
  @Output() rechazar = new EventEmitter<{ solicitudId: number; motivo: string }>();

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
}