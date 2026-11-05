import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificacionesService } from '../../../../core/services/notificaciones.service';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { Notificacion } from '../../../../shared/models/notificacion.model';
import { PosSidebarComponent } from '../../../../shared/components/pos-sidebar/pos-sidebar.component';
import {
  estadoLegible as estadoLegibleAviso,
  esRechazo as esRechazoAviso,
  fechaHoraLegible as fechaHoraLegibleAviso,
  fechaLegible as fechaLegibleAviso,
  horarioLegible as horarioLegibleAviso,
  muestraEstado as muestraEstadoAviso,
  muestraSolicitante as muestraSolicitanteAviso,
  puedeDecidirCesion,
  puedeRevisar as puedeRevisarAviso,
  rolLegible as rolLegibleAviso
} from '../../../../shared/utils/notificacion.util';

type FiltroNotificaciones = 'todas' | 'nuevas';
type ModoDecision = 'ceder' | 'conservar' | null;

/** El historial completo: se piden todos los avisos del usuario. */
const LIMITE_AVISOS = 100;

/**
 * Módulo de notificaciones: el historial completo (leídas y nuevas).
 *
 * La campana del topbar solo muestra lo nuevo y se limpia al cerrarla; aquí
 * queda todo lo que el usuario recibió y desde aquí también puede decidir una
 * cesión de cupo pendiente o ir a revisar una solicitud.
 */
@Component({
  selector: 'app-notificaciones',
  imports: [FormsModule, PosSidebarComponent, Toast],
  templateUrl: './notificaciones.component.html',
  styleUrl: './notificaciones.component.scss'
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly notificacionesService = inject(NotificacionesService);
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly suscripciones = new Subscription();

  readonly notificaciones = signal<Notificacion[]>([]);
  readonly filtro = signal<FiltroNotificaciones>('todas');
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly procesandoId = signal<number | null>(null);
  readonly decisionAbiertaId = signal<number | null>(null);
  readonly modoDecision = signal<ModoDecision>(null);
  motivoConservar = '';

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
  }

  get inicialesUsuario(): string {
    const nombre = this.authService.obtenerUsuarioActual()?.nombre.trim();
    if (!nombre) {
      return '';
    }
    const partes = nombre.split(/\s+/).filter(Boolean);
    return partes.length === 1
      ? partes[0].slice(0, 2).toLocaleUpperCase()
      : `${partes[0][0]}${partes[partes.length - 1][0]}`.toLocaleUpperCase();
  }

  get totalNuevas(): number {
    return this.notificaciones().filter(notificacion => !notificacion.leida).length;
  }

  get visibles(): Notificacion[] {
    return this.filtro() === 'nuevas'
      ? this.notificaciones().filter(notificacion => !notificacion.leida)
      : this.notificaciones();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.suscribir(
      this.notificacionesService.listar(false, LIMITE_AVISOS).subscribe({
        next: notificaciones => {
          this.notificaciones.set(notificaciones);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las notificaciones.');
          this.cargando.set(false);
        }
      })
    );
  }

  cambiarFiltro(filtro: FiltroNotificaciones): void {
    this.filtro.set(filtro);
  }

  marcarTodasLeidas(): void {
    if (this.totalNuevas === 0) {
      return;
    }
    this.suscribir(
      this.notificacionesService.marcarTodasLeidas().subscribe({
        next: () => {
          this.notificaciones.update(notificaciones =>
            notificaciones.map(notificacion => ({ ...notificacion, leida: true }))
          );
          this.notificar('success', 'Notificaciones leídas', 'Ya no quedan avisos nuevos.');
        },
        error: () => this.error.set('No se pudieron marcar las notificaciones como leídas.')
      })
    );
  }

  marcarLeida(notificacion: Notificacion): void {
    if (notificacion.leida) {
      return;
    }
    this.suscribir(
      this.notificacionesService.marcarLeida(notificacion.id).subscribe({
        next: () => {
          this.notificaciones.update(notificaciones =>
            notificaciones.map(item =>
              item.id === notificacion.id ? { ...item, leida: true } : item
            )
          );
        },
        error: () => undefined
      })
    );
  }

  /** Lleva al revisor a la pantalla donde decide, abriendo el espacio solicitado. */
  revisar(notificacion: Notificacion): void {
    this.marcarLeida(notificacion);
    if (notificacion.tipo === 'RECURSO_SOLICITADO') {
      void this.router.navigate(['/admin/parametros/recursos']);
      return;
    }
    if (notificacion.tipo === 'SOLICITUD_POR_AUTORIZAR') {
      void this.router.navigate(['/autorizaciones']);
      return;
    }
    const espacioId = notificacion.detalle?.espacio_id;
    void this.router.navigate(['/admin/espacios'], {
      queryParams: espacioId ? { espacio: espacioId } : {}
    });
  }

  abrirDecision(notificacion: Notificacion, modo: Exclude<ModoDecision, null>): void {
    this.marcarLeida(notificacion);
    this.decisionAbiertaId.set(notificacion.id);
    this.modoDecision.set(modo);
    this.motivoConservar = '';
    this.error.set('');
  }

  cerrarDecision(): void {
    this.decisionAbiertaId.set(null);
    this.modoDecision.set(null);
    this.motivoConservar = '';
  }

  cederCupo(notificacion: Notificacion): void {
    this.decidirCesion(notificacion, true, null);
  }

  conservarCupo(notificacion: Notificacion): void {
    const motivo = this.motivoConservar.trim();
    if (!motivo) {
      this.error.set('Indica el motivo por el que conservas tu cupo.');
      return;
    }
    this.decidirCesion(notificacion, false, motivo);
  }

  private decidirCesion(
    notificacion: Notificacion,
    aprobar: boolean,
    motivo: string | null
  ): void {
    const solicitudId = notificacion.solicitud_id ?? notificacion.detalle?.solicitud_id;
    if (!solicitudId || this.procesandoId() !== null) {
      return;
    }

    this.procesandoId.set(notificacion.id);
    this.error.set('');
    this.suscribir(
      this.solicitudesService.decidirCesion(solicitudId, { aprobar, motivo }).subscribe({
        next: respuesta => {
          this.procesandoId.set(null);
          this.cerrarDecision();
          this.notificar('success', aprobar ? 'Cupo cedido' : 'Cupo conservado', respuesta.mensaje);
          this.cargar();
        },
        error: (error: unknown) => {
          this.procesandoId.set(null);
          const mensaje =
            obtenerMensajeErrorApi(error) ??
            'No se pudo registrar la decisión. Intenta nuevamente.';
          this.error.set(mensaje);
          this.notificar('error', 'No se pudo decidir la cesión', mensaje);
        }
      })
    );
  }

  // --- Presentación (mismas reglas que la campana) --- //

  puedeRevisar(notificacion: Notificacion): boolean {
    return puedeRevisarAviso(notificacion);
  }

  puedeDecidir(notificacion: Notificacion): boolean {
    return puedeDecidirCesion(notificacion);
  }

  muestraEstado(notificacion: Notificacion): boolean {
    return muestraEstadoAviso(notificacion);
  }

  esRechazo(notificacion: Notificacion): boolean {
    return esRechazoAviso(notificacion);
  }

  muestraSolicitante(notificacion: Notificacion): boolean {
    return muestraSolicitanteAviso(notificacion);
  }

  estadoLegible(notificacion: Notificacion): string {
    return estadoLegibleAviso(notificacion);
  }

  rolLegible(rol: string): string {
    return rolLegibleAviso(rol);
  }

  fechaLegible(valor: string): string {
    return fechaLegibleAviso(valor);
  }

  horarioLegible(inicio: string, fin: string): string {
    return horarioLegibleAviso(inicio, fin);
  }

  fechaHoraLegible(valor: string): string {
    return fechaHoraLegibleAviso(valor);
  }

  private suscribir(suscripcion: Subscription): void {
    this.suscripciones.add(suscripcion);
  }

  private notificar(severity: 'success' | 'error', summary: string, detail: string): void {
    this.messageService.add({ key: 'notificaciones-modulo', severity, summary, detail, life: 6000 });
  }
}
