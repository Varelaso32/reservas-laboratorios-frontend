import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SolicitudReservaComponent } from '../../../reservas/pages/solicitud-reserva/solicitud-reserva.component';
import { SolicitudesEspacioModalComponent } from '../../../solicitudes/components/solicitudes-espacio-modal/solicitudes-espacio-modal.component';
import { Espacio } from '../../../../shared/models/espacio.model';
import { EspaciosService } from '../../../../core/services/espacios.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { SolicitudPendiente } from '../../../../shared/models/solicitud.model';

@Component({
  selector: 'app-espacios',
  imports: [SolicitudReservaComponent, SolicitudesEspacioModalComponent],
  templateUrl: './espacios.component.html',
  styleUrl: './espacios.component.scss'
})
export class EspaciosComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly espaciosService = inject(EspaciosService);
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly router = inject(Router);

  modalReservaAbierto = false;
  modalSolicitudesAbierto = false;
  cargando = false;
  errorCarga: string | null = null;
  espacios: Espacio[] = [];
  espacioSeleccionado: Espacio | null = null;
  espacioSolicitudesSeleccionado: Espacio | null = null;
  solicitudesDelEspacio: SolicitudPendiente[] = [];
  cargandoSolicitudes = false;
  errorSolicitudes: string | null = null;
  conteosPendientes = new Map<number, number>();
  cargandoConteosPendientes = false;
  errorConteosPendientes = false;

  get usuarioActual() {
    return this.authService.tieneSesionActiva()
      ? this.authService.obtenerUsuarioActual()
      : null;
  }

  get puedeVerSolicitudesPendientes(): boolean {
    return this.usuarioActual?.rol === 'APROBADOR';
  }

  get inicialesUsuario(): string {
    const nombre = this.usuarioActual?.nombre.trim();
    if (!nombre) {
      return '';
    }

    const partes = nombre.split(/\s+/).filter(Boolean);
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toLocaleUpperCase();
    }

    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toLocaleUpperCase();
  }

  get rolCargoUsuario(): string {
    const usuario = this.usuarioActual;
    if (!usuario) {
      return '';
    }

    const cargo = usuario.cargo?.trim();
    return cargo ? `${usuario.rol} · ${cargo}` : usuario.rol;
  }

  ngOnInit(): void {
    this.cargarEspacios();
    if (this.puedeVerSolicitudesPendientes) {
      this.cargarConteosPendientes();
    }
  }

  cargarEspacios(): void {
    this.cargando = true;
    this.errorCarga = null;

    this.espaciosService.listar().subscribe({
      next: espacios => {
        this.espacios = espacios;
        this.cargando = false;
      },
      error: error => {
        this.errorCarga =
          obtenerMensajeErrorApi(error) ?? 'No se pudieron cargar los espacios. Intenta nuevamente.';
        this.cargando = false;
      }
    });
  }

  cargarConteosPendientes(): void {
    if (!this.puedeVerSolicitudesPendientes) {
      return;
    }

    this.cargandoConteosPendientes = true;
    this.errorConteosPendientes = false;
    this.solicitudesService.consultarPendientes().subscribe({
      next: solicitudes => {
        const conteos = new Map<number, number>();
        for (const solicitud of solicitudes) {
          if (solicitud.estado === 'PENDIENTE') {
            const espacioId = solicitud.espacio.id;
            conteos.set(espacioId, (conteos.get(espacioId) ?? 0) + 1);
          }
        }
        this.conteosPendientes = conteos;
        this.cargandoConteosPendientes = false;
      },
      error: () => {
        this.cargandoConteosPendientes = false;
        this.errorConteosPendientes = true;
      }
    });
  }

  obtenerConteoPendientes(espacioId: number): number {
    return this.conteosPendientes.get(espacioId) ?? 0;
  }

  abrirSolicitudes(espacio: Espacio): void {
    this.espacioSolicitudesSeleccionado = espacio;
    this.modalSolicitudesAbierto = true;
    this.cargarSolicitudesDelEspacio();
  }

  cargarSolicitudesDelEspacio(): void {
    const espacio = this.espacioSolicitudesSeleccionado;
    if (!espacio) {
      return;
    }

    this.cargandoSolicitudes = true;
    this.errorSolicitudes = null;
    this.solicitudesDelEspacio = [];

    this.solicitudesService.consultarPendientes(espacio.id).subscribe({
      next: solicitudes => {
        this.solicitudesDelEspacio = solicitudes.filter(
          solicitud => solicitud.espacio.id === espacio.id
        );
        this.cargandoSolicitudes = false;
      },
      error: error => {
        this.errorSolicitudes = obtenerMensajeErrorApi(error) ??
          (error.status === 403
            ? 'No tienes permiso para consultar estas solicitudes.'
            : 'No se pudieron cargar las solicitudes pendientes. Intenta nuevamente.');
        this.cargandoSolicitudes = false;
      }
    });
  }

  cerrarSolicitudes(): void {
    this.modalSolicitudesAbierto = false;
    this.espacioSolicitudesSeleccionado = null;
    this.solicitudesDelEspacio = [];
    this.errorSolicitudes = null;
  }

  formatearFechaHora(valor: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Bogota'
    }).format(new Date(valor));
  }

  abrirReserva(espacio: Espacio): void {
    this.espacioSeleccionado = espacio;
    this.modalReservaAbierto = true;
  }

  cerrarReserva(): void {
    this.modalReservaAbierto = false;
    this.espacioSeleccionado = null;
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}