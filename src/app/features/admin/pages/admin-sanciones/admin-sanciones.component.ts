import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { AuthService } from '../../../../core/services/auth.service';
import { SancionesService } from '../../../../core/services/sanciones.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { Reactivacion, ReporteSanciones, Strike, UsuarioSancionado } from '../../../../shared/models/sancion.model';
import { obtenerInicialesUsuario } from '../../../../shared/utils/usuario-iniciales.util';

interface DecisionEnCurso {
  reactivacion: Reactivacion;
  strikesAnular: number[];
  motivo: string;
  rechazando: boolean;
}

/**
 * Reporte de sancionados y reactivaciones (HU-42).
 * Solo para el Administrador del Sistema.
 */
@Component({
  selector: 'app-admin-sanciones',
  imports: [FormsModule, RouterLink, RouterLinkActive, Toast],
  templateUrl: './admin-sanciones.component.html',
  styleUrl: './admin-sanciones.component.scss'
})
export class AdminSancionesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly sancionesService = inject(SancionesService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  reporte: ReporteSanciones | null = null;
  cargando = false;
  error: string | null = null;
  soloBloqueados = false;
  procesando = false;
  decision: DecisionEnCurso | null = null;
  guardandoDecision = false;
  parametrosAbierto = false;

  get usuarioActual() {
    return this.authService.obtenerUsuarioActual();
  }

  get inicialesUsuario(): string {
    return obtenerInicialesUsuario(this.usuarioActual?.nombre);
  }

  ngOnInit(): void {
    this.cargarReporte();
  }

  cargarReporte(): void {
    this.cargando = true;
    this.error = null;
    this.sancionesService.consultarReporte(this.soloBloqueados).subscribe({
      next: reporte => {
        this.reporte = reporte;
        this.cargando = false;
      },
      error: error => {
        this.reporte = null;
        this.cargando = false;
        this.error = obtenerMensajeErrorApi(error) ?? 'No se pudo cargar el reporte de sanciones.';
      }
    });
  }

  alternarFiltro(): void {
    this.soloBloqueados = !this.soloBloqueados;
    this.cargarReporte();
  }

  procesarVencidas(): void {
    if (this.procesando) {
      return;
    }
    this.procesando = true;
    this.sancionesService.procesarVencidas().subscribe({
      next: resultado => {
        this.procesando = false;
        this.notificar(
          'success',
          'Procesamiento completado',
          `${resultado.advertencias} advertencia(s) y ${resultado.no_shows} no-show registrados.`
        );
        this.cargarReporte();
      },
      error: error => {
        this.procesando = false;
        this.notificar(
          'error',
          'No se pudo procesar',
          obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.'
        );
      }
    });
  }

  abrirDecision(reactivacion: Reactivacion, rechazando = false): void {
    this.decision = {
      reactivacion,
      strikesAnular: rechazando ? [] : this.strikesActivosDelUsuario(reactivacion.usuario_id).map(strike => strike.id),
      motivo: '',
      rechazando
    };
  }

  cerrarDecision(): void {
    if (!this.guardandoDecision) {
      this.decision = null;
    }
  }

  alternarStrikeAnular(strikeId: number): void {
    if (!this.decision) {
      return;
    }
    const actuales = this.decision.strikesAnular;
    this.decision.strikesAnular = actuales.includes(strikeId)
      ? actuales.filter(id => id !== strikeId)
      : [...actuales, strikeId];
  }

  confirmarDecision(): void {
    const decision = this.decision;
    if (!decision || this.guardandoDecision) {
      return;
    }

    if (decision.rechazando) {
      if (!decision.motivo.trim()) {
        this.notificar('warn', 'Falta el motivo', 'Indica por qué rechazas la reactivación.');
        return;
      }
    } else if (decision.strikesAnular.length === 0) {
      this.notificar('warn', 'Selecciona strikes', 'Indica al menos un strike para anular.');
      return;
    }

    this.guardandoDecision = true;
    this.sancionesService.decidirReactivacion(decision.reactivacion.id, {
      aprobar: !decision.rechazando,
      strikes_anular: decision.rechazando ? [] : decision.strikesAnular,
      motivo: decision.rechazando ? decision.motivo.trim() : null
    }).subscribe({
      next: resultado => {
        this.guardandoDecision = false;
        this.decision = null;
        this.notificar(
          'success',
          decision.rechazando ? 'Reactivación rechazada' : 'Reactivación aceptada',
          decision.rechazando
            ? 'El usuario recibió el motivo del rechazo.'
            : `Se anularon ${resultado.strikes_anulados} strike(s).`
        );
        this.cargarReporte();
      },
      error: error => {
        this.guardandoDecision = false;
        this.notificar(
          'error',
          'No se pudo decidir',
          obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.'
        );
      }
    });
  }

  strikesDelUsuario(usuarioId: number): Strike[] {
    return this.reporte?.usuarios.find(item => item.usuario_id === usuarioId)?.strikes ?? [];
  }

  strikesActivosDelUsuario(usuarioId: number): Strike[] {
    return this.strikesDelUsuario(usuarioId).filter(strike => !strike.anulado);
  }

  strikesDeReactivacion(reactivacion: Reactivacion): Strike[] {
    return this.strikesActivosDelUsuario(reactivacion.usuario_id);
  }

  usuarioDeReactivacion(reactivacion: Reactivacion): UsuarioSancionado | undefined {
    return this.reporte?.usuarios.find(item => item.usuario_id === reactivacion.usuario_id);
  }

  justificacionDe(reactivacion: Reactivacion, strikeId: number): string {
    return reactivacion.detalle.find(item => item.strike_id === strikeId)?.justificacion ?? '—';
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return '—';
    }
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return fecha;
    }
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Bogota'
    }).format(valor);
  }

  alternarParametros(): void {
    this.parametrosAbierto = !this.parametrosAbierto;
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  private notificar(severity: 'success' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 5000 });
  }
}
