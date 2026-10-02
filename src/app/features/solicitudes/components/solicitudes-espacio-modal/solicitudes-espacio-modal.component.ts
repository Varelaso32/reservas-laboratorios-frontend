import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Espacio } from '../../../../shared/models/espacio.model';
import { SolicitudPendiente } from '../../../../shared/models/solicitud.model';

@Component({
  selector: 'app-solicitudes-espacio-modal',
  standalone: true,
  templateUrl: './solicitudes-espacio-modal.component.html',
  styleUrl: './solicitudes-espacio-modal.component.scss'
})
export class SolicitudesEspacioModalComponent {
  @Input() espacio: Espacio | null = null;
  @Input() solicitudes: SolicitudPendiente[] = [];
  @Input() cargando = false;
  @Input() error: string | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() reintentar = new EventEmitter<void>();

  cerrarModal(): void {
    this.cerrar.emit();
  }

  reintentarCarga(): void {
    this.reintentar.emit();
  }

  formatearFechaHora(valor: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Bogota'
    }).format(new Date(valor));
  }
}