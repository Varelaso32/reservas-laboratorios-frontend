import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { SolicitudPendiente } from '../../../../shared/models/solicitud.model';

@Component({
  selector: 'app-solicitudes-pendientes',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './solicitudes-pendientes.component.html',
  styleUrl: './solicitudes-pendientes.component.scss'
})
export class SolicitudesPendientesComponent implements OnInit {
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  solicitudes: SolicitudPendiente[] = [];
  cargando = false;
  errorCarga: string | null = null;

  get usuarioActual() {
    return this.authService.obtenerUsuarioActual();
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

  ngOnInit(): void {
    this.cargarPendientes();
  }

  cargarPendientes(): void {
    this.cargando = true;
    this.errorCarga = null;

    this.solicitudesService.consultarPendientes().subscribe({
      next: solicitudes => {
        this.solicitudes = solicitudes;
        this.cargando = false;
      },
      error: error => {
        this.errorCarga = obtenerMensajeErrorApi(error) ??
          (error.status === 403
            ? 'No tienes permiso para consultar estas solicitudes.'
            : 'No se pudieron cargar las solicitudes pendientes. Intenta nuevamente.');
        this.cargando = false;
      }
    });
  }

  formatearFechaHora(valor: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Bogota'
    }).format(new Date(valor));
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}