import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ReportesService } from '../../../../core/services/reportes.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import {
  ActividadUsuario,
  Auditoria,
  FormatoReporte,
  NoShow,
  OcupacionEspacio,
  PicosDemanda,
  ResumenDia,
  TipoReporte
} from '../../../../shared/models/reporte.model';
import {
  fechaColombia,
  sumarDiasFecha
} from '../../../../shared/utils/fecha-colombia.util';
import { obtenerInicialesUsuario } from '../../../../shared/utils/usuario-iniciales.util';
import { CampanaNotificacionesComponent } from '../../../../shared/components/campana-notificaciones/campana-notificaciones.component';

interface DefinicionReporte {
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  icono: string;
  tono: string;
}

/**
 * Módulo de reportes del Administrador (HU-15, HU-24, HU-36).
 * Seis reportes con descarga en PDF o CSV y resumen semanal.
 */
@Component({
  selector: 'app-admin-reportes',
  imports: [FormsModule, RouterLink, Toast, CampanaNotificacionesComponent],
  templateUrl: './admin-reportes.component.html',
  styleUrl: './admin-reportes.component.scss'
})
export class AdminReportesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reportesService = inject(ReportesService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  readonly reportes: DefinicionReporte[] = [
    {
      tipo: 'ocupacion',
      titulo: 'Reporte de ocupación',
      descripcion: 'Horas reservadas frente a horas disponibles por espacio.',
      icono: 'pi-chart-pie',
      tono: 'azul'
    },
    {
      tipo: 'actividad',
      titulo: 'Actividad por usuario',
      descripcion: 'Reservas, cancelaciones y no-shows de cada solicitante.',
      icono: 'pi-users',
      tono: 'menta'
    },
    {
      tipo: 'no-shows',
      titulo: 'No-shows',
      descripcion: 'Reservas en las que el solicitante no se presentó.',
      icono: 'pi-user-minus',
      tono: 'ember'
    },
    {
      tipo: 'picos',
      titulo: 'Picos de demanda',
      descripcion: 'Días y franjas horarias con más reservas activas.',
      icono: 'pi-chart-line',
      tono: 'lavanda'
    },
    {
      tipo: 'auditoria',
      titulo: 'Auditoría del sistema',
      descripcion: 'Acciones sobre solicitudes y cambios de configuración.',
      icono: 'pi-history',
      tono: 'sol'
    },
    {
      tipo: 'resumen',
      titulo: 'Resumen semanal',
      descripcion: 'Reservas, cancelaciones, no-shows y ocupación día a día.',
      icono: 'pi-calendar',
      tono: 'azul'
    }
  ];

  desde = '';
  hasta = '';
  cargando = true;
  error: string | null = null;
  exportando: string | null = null;

  resumen: ResumenDia[] = [];
  ocupacion: OcupacionEspacio[] = [];
  actividad: ActividadUsuario[] = [];
  noShows: NoShow[] = [];
  picos: PicosDemanda = { por_dia: [], por_franja: [] };
  auditoria: Auditoria[] = [];

  ngOnInit(): void {
    const hoy = fechaColombia(new Date());
    this.hasta = hoy;
    this.desde = sumarDiasFecha(hoy, -6);
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

  get totalReservas(): number {
    return this.resumen.reduce((total, dia) => total + dia.reservas, 0);
  }

  get totalCancelaciones(): number {
    return this.resumen.reduce((total, dia) => total + dia.cancelaciones, 0);
  }

  get totalNoShows(): number {
    return this.resumen.reduce((total, dia) => total + dia.no_shows, 0);
  }

  get ocupacionPromedio(): number {
    if (this.resumen.length === 0) {
      return 0;
    }
    const suma = this.resumen.reduce((total, dia) => total + dia.tasa_ocupacion, 0);
    return Math.round((suma / this.resumen.length) * 10) / 10;
  }

  get ocupacionTop(): OcupacionEspacio[] {
    return this.ocupacion.slice(0, 4);
  }

  get actividadTop(): ActividadUsuario[] {
    return this.actividad.slice(0, 4);
  }

  get auditoriaReciente(): Auditoria[] {
    return this.auditoria.slice(0, 4);
  }

  get maximoFranja(): number {
    return Math.max(1, ...this.picos.por_franja.map(franja => franja.reservas));
  }

  get periodoLegible(): string {
    if (!this.desde || !this.hasta) {
      return 'Últimos 7 días';
    }
    return `${this.formatearFecha(this.desde)} – ${this.formatearFecha(this.hasta)}`;
  }

  get diasConReservas(): number {
    return this.resumen.filter(dia => dia.reservas > 0).length;
  }

  get mejorDia(): string {    if (this.resumen.length === 0) {
      return '—';
    }
    const mejor = [...this.resumen].sort((a, b) => b.reservas - a.reservas)[0];
    return mejor.reservas === 0 ? '—' : `${mejor.dia} (${mejor.reservas})`;
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    const periodo = { desde: this.desde, hasta: this.hasta };

    forkJoin({
      resumen: this.reportesService.resumen(periodo),
      ocupacion: this.reportesService.ocupacion(periodo),
      actividad: this.reportesService.actividad(periodo),
      noShows: this.reportesService.noShows(periodo),
      picos: this.reportesService.picos(periodo),
      auditoria: this.reportesService.auditoria(periodo)
    }).subscribe({
      next: datos => {
        this.resumen = datos.resumen;
        this.ocupacion = datos.ocupacion;
        this.actividad = datos.actividad;
        this.noShows = datos.noShows;
        this.picos = datos.picos;
        this.auditoria = datos.auditoria;
        this.cargando = false;
      },
      error: error => {
        this.error =
          obtenerMensajeErrorApi(error) ?? 'No se pudieron cargar los reportes. Intenta nuevamente.';
        this.cargando = false;
      }
    });
  }

  aplicarPeriodo(): void {
    if (!this.desde || !this.hasta) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Periodo incompleto',
        detail: 'Selecciona la fecha inicial y la fecha final.'
      });
      return;
    }
    if (this.desde > this.hasta) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Periodo inválido',
        detail: 'La fecha inicial no puede ser posterior a la fecha final.'
      });
      return;
    }
    this.cargar();
  }

  usarSemanaActual(): void {
    const hoy = fechaColombia(new Date());
    this.hasta = hoy;
    this.desde = sumarDiasFecha(hoy, -6);
    this.cargar();
  }

  exportar(tipo: TipoReporte, formato: FormatoReporte): void {
    const clave = `${tipo}-${formato}`;
    if (this.exportando) {
      return;
    }
    this.exportando = clave;
    this.reportesService.exportar(tipo, formato, { desde: this.desde, hasta: this.hasta }).subscribe({
      next: contenido => {
        const nombre = this.reportesService.nombreArchivo(tipo, formato);
        const url = URL.createObjectURL(contenido);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
        this.exportando = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Reporte descargado',
          detail: `${nombre} incluye tu nombre y la hora de generación.`
        });
      },
      error: async error => {
        this.exportando = null;
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo exportar',
          detail: await this.mensajeErrorDescarga(error)
        });
      }
    });
  }

  private async mensajeErrorDescarga(error: unknown): Promise<string> {
    const cuerpo = (error as { error?: unknown })?.error;
    if (cuerpo instanceof Blob) {
      try {
        const texto = await cuerpo.text();
        const detalle = JSON.parse(texto)?.detail;
        if (typeof detalle === 'string') {
          return detalle;
        }
      } catch {
        // El cuerpo no era JSON: se usa el mensaje genérico.
      }
    }
    return obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.';
  }

  formatearFecha(fecha: string): string {
    const [, month, day] = fecha.split('-');
    return `${day}/${month}/${fecha.slice(0, 4)}`;
  }

  formatearFechaHora(valor: string): string {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return valor;
    }
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Bogota'
    }).format(fecha);
  }

  porcentaje(valor: number): string {
    return `${valor.toFixed(1)} %`;
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
