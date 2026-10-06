import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Toast } from 'primeng/toast';

import { Espacio } from '../../../../shared/models/espacio.model';
import { EstadoDetalleSolicitud, SolicitudPendiente } from '../../../../shared/models/solicitud.model';

@Component({
  selector: 'app-solicitudes-espacio-modal',
  standalone: true,
  imports: [Toast],
  templateUrl: './solicitudes-espacio-modal.component.html',
  styleUrl: './solicitudes-espacio-modal.component.scss'
})
export class SolicitudesEspacioModalComponent {
  @Input() espacio: Espacio | null = null;
  @Input() solicitudes: SolicitudPendiente[] = [];
  @Input() cargando = false;
  @Input() error: string | null = null;
  @Input() detalles: ReadonlyMap<number, EstadoDetalleSolicitud> = new Map();
  @Input() aprobandoSolicitudId: number | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() reintentar = new EventEmitter<void>();
  @Output() aprobar = new EventEmitter<number>();

  cerrarModal(): void {
    this.cerrar.emit();
  }

  reintentarCarga(): void {
    this.reintentar.emit();
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