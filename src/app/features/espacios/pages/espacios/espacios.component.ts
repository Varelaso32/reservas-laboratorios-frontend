import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SolicitudReservaComponent } from '../../../reservas/pages/solicitud-reserva/solicitud-reserva.component';
import { Espacio } from '../../../../shared/models/espacio.model';
import { EspaciosService } from '../../../../core/services/espacios.service';
import { AuthService } from '../../../../core/services/auth.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';

@Component({
  selector: 'app-espacios',
  imports: [SolicitudReservaComponent],
  templateUrl: './espacios.component.html',
  styleUrl: './espacios.component.scss'
})
export class EspaciosComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly espaciosService = inject(EspaciosService);
  private readonly router = inject(Router);

  modalReservaAbierto = false;
  cargando = false;
  errorCarga: string | null = null;
  espacios: Espacio[] = [];
  espacioSeleccionado: Espacio | null = null;

  get usuarioActual() {
    return this.authService.tieneSesionActiva()
      ? this.authService.obtenerUsuarioActual()
      : null;
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