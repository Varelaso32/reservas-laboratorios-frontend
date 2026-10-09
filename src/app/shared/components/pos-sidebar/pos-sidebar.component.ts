import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

export type SeccionPos = 'dashboard' | 'calendario' | 'espacios';

@Component({
  selector: 'app-pos-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './pos-sidebar.component.html',
  styleUrl: './pos-sidebar.component.scss'
})
export class PosSidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @Input({ required: true }) seccionActiva!: SeccionPos;

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

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
