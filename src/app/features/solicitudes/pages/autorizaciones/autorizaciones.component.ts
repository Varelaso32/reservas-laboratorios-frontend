import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { AuthService } from '../../../../core/services/auth.service';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { PosSidebarComponent } from '../../../../shared/components/pos-sidebar/pos-sidebar.component';
import { SolicitudAutorizacion } from '../../../../shared/models/configuracion.model';
import { fechaDesdeClaveColombia, horaReservaColombia } from '../../../../shared/utils/fecha-colombia.util';
import { obtenerInicialesUsuario } from '../../../../shared/utils/usuario-iniciales.util';

/**
 * Bandeja de autorización especial (HU-35).
 * Muestra las solicitudes que quedaron fuera de la franja de operación y permite
 * autorizarlas (vuelven al flujo normal) o negarlas con un motivo obligatorio.
 */
@Component({
  selector: 'app-autorizaciones',
  imports: [FormsModule, PosSidebarComponent, Toast],
  templateUrl: './autorizaciones.component.html',
  styleUrl: './autorizaciones.component.scss'
})
export class AutorizacionesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly messageService = inject(MessageService);

  solicitudes: SolicitudAutorizacion[] = [];
  cargando = false;
  errorCarga: string | null = null;

  confirmandoId: number | null = null;
  negandoId: number | null = null;
  motivoNegacion = '';
  errorMotivo: string | null = null;
  procesandoId: number | null = null;

  get usuarioActual() {
    return this.authService.tieneSesionActiva()
      ? this.authService.obtenerUsuarioActual()
      : null;
  }

  get inicialesUsuario(): string {
    return obtenerInicialesUsuario(this.usuarioActual?.nombre);
  }

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.cargando = true;
    this.errorCarga = null;
    this.solicitudesService.consultarAutorizaciones().subscribe({
      next: solicitudes => {
        this.solicitudes = solicitudes;
        this.cargando = false;
      },
      error: error => {
        this.errorCarga =
          obtenerMensajeErrorApi(error) ??
          'No se pudieron cargar las solicitudes pendientes de autorización.';
        this.cargando = false;
      }
    });
  }

  pedirConfirmacion(solicitud: SolicitudAutorizacion): void {
    if (this.procesandoId !== null) {
      return;
    }
    this.negandoId = null;
    this.motivoNegacion = '';
    this.errorMotivo = null;
    this.confirmandoId = solicitud.id;
  }

  cancelarConfirmacion(): void {
    this.confirmandoId = null;
  }

  iniciarNegacion(solicitud: SolicitudAutorizacion): void {
    if (this.procesandoId !== null) {
      return;
    }
    this.confirmandoId = null;
    this.negandoId = solicitud.id;
    this.motivoNegacion = '';
    this.errorMotivo = null;
  }

  cancelarNegacion(): void {
    this.negandoId = null;
    this.motivoNegacion = '';
    this.errorMotivo = null;
  }

  confirmarAutorizacion(solicitud: SolicitudAutorizacion): void {
    if (this.procesandoId !== null) {
      return;
    }
    this.procesandoId = solicitud.id;
    this.solicitudesService.decidirAutorizacion(solicitud.id, { aprobar: true }).subscribe({
      next: respuesta => {
        this.procesandoId = null;
        this.confirmandoId = null;
        this.quitarDeLista(solicitud.id);
        this.notificar('success', 'Solicitud autorizada', respuesta.mensaje);
      },
      error: error => {
        this.procesandoId = null;
        this.confirmandoId = null;
        this.notificar(
          'error',
          'No se pudo autorizar',
          obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.'
        );
      }
    });
  }

  confirmarNegacion(solicitud: SolicitudAutorizacion): void {
    if (this.procesandoId !== null) {
      return;
    }
    const motivo = this.motivoNegacion.trim();
    if (!motivo) {
      this.errorMotivo = 'Para negar la autorización debes indicar un motivo.';
      return;
    }

    this.procesandoId = solicitud.id;
    this.errorMotivo = null;
    this.solicitudesService
      .decidirAutorizacion(solicitud.id, { aprobar: false, motivo })
      .subscribe({
        next: respuesta => {
          this.procesandoId = null;
          this.negandoId = null;
          this.motivoNegacion = '';
          this.quitarDeLista(solicitud.id);
          this.notificar('success', 'Autorización negada', respuesta.mensaje);
        },
        error: error => {
          this.procesandoId = null;
          this.notificar(
            'error',
            'No se pudo negar la autorización',
            obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.'
          );
        }
      });
  }

  nombreSolicitante(solicitud: SolicitudAutorizacion): string {
    return solicitud.solicitante.nombre;
  }

  fechaSolicitud(solicitud: SolicitudAutorizacion): string {
    const texto = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Bogota'
    }).format(fechaDesdeClaveColombia(solicitud.fecha));
    return texto.charAt(0).toLocaleUpperCase() + texto.slice(1);
  }

  horaSolicitud(valor: string): string {
    return horaReservaColombia(valor);
  }

  private quitarDeLista(solicitudId: number): void {
    this.solicitudes = this.solicitudes.filter(solicitud => solicitud.id !== solicitudId);
  }

  private notificar(severity: 'success' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ key: 'autorizaciones', severity, summary, detail, life: 5000 });
  }
}
