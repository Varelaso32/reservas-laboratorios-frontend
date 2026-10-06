import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-usuarios.component.html',
  styleUrl: './admin-usuarios.component.scss'
})
export class AdminUsuariosComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly filtros = ['Todos', 'Docentes', 'Estudiantes', 'Operadores'];

  get usuarioActual() {
    return this.authService.obtenerUsuarioActual();
  }

  get inicialesUsuario(): string {
    const nombre = this.usuarioActual?.nombre.trim();
    if (!nombre) {
      return '';
    }

    const partes = nombre.split(/\s+/).filter(Boolean);
    return partes.length === 1
      ? partes[0].slice(0, 2).toLocaleUpperCase()
      : `${partes[0][0]}${partes[partes.length - 1][0]}`.toLocaleUpperCase();
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
