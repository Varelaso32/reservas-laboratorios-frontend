import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { AuthService } from '../../../../core/services/auth.service';
import { ReportesService } from '../../../../core/services/reportes.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { DashboardAdmin, ResumenDia } from '../../../../shared/models/reporte.model';
import { obtenerInicialesUsuario } from '../../../../shared/utils/usuario-iniciales.util';
import { CampanaNotificacionesComponent } from '../../../../shared/components/campana-notificaciones/campana-notificaciones.component';

/**
 * Tablero del Administrador: indicadores del día, próximas reservas y actividad
 * de la semana, con acceso directo al módulo de reportes.
 */
@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, Toast, CampanaNotificacionesComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reportesService = inject(ReportesService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  cargando = true;
  error: string | null = null;
  datos: DashboardAdmin | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  get usuarioActual() {
    return this.authService.tieneSesionActiva()
      ? this.authService.obtenerUsuarioActual()
      : null;
  }

  get inicialesUsuario(): string {
    return obtenerInicialesUsuario(this.usuarioActual?.nombre);
  }

  get serieSemanal(): ResumenDia[] {
    return this.datos?.serie_semanal ?? [];
  }

  get maximoReservasSemana(): number {
    return Math.max(1, ...this.serieSemanal.map(dia => dia.reservas));
  }

  get totalReservasSemana(): number {
    return this.serieSemanal.reduce((total, dia) => total + dia.reservas, 0);
  }

  get ocupacionPromedioSemana(): number {
    if (this.serieSemanal.length === 0) {
      return 0;
    }
    const suma = this.serieSemanal.reduce((total, dia) => total + dia.tasa_ocupacion, 0);
    return Math.round((suma / this.serieSemanal.length) * 10) / 10;
  }

  get maximoTopEspacios(): number {
    return Math.max(1, ...(this.datos?.top_espacios ?? []).map(espacio => espacio.reservas));
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.reportesService.dashboard().subscribe({
      next: datos => {
        this.datos = datos;
        this.cargando = false;
      },
      error: error => {
        const mensaje =
          obtenerMensajeErrorApi(error) ?? 'No se pudo cargar el tablero. Intenta nuevamente.';
        this.error = mensaje;
        this.cargando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Tablero no disponible',
          detail: mensaje
        });
      }
    });
  }

  porcentaje(valor: number): string {
    return `${valor.toFixed(1)} %`;
  }

  anchoBarra(valor: number, maximo: number): number {
    return Math.min(100, Math.round((valor / Math.max(1, maximo)) * 100));
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
