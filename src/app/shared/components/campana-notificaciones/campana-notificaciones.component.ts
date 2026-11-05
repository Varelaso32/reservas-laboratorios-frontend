import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Subscription } from 'rxjs';

import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { SolicitudesService } from '../../../core/services/solicitudes.service';
import { obtenerMensajeErrorApi } from '../../../core/utils/api-error.util';
import { Notificacion } from '../../models/notificacion.model';
import {
  estadoLegible as estadoLegibleAviso,
  esRechazo as esRechazoAviso,
  fechaLegible as fechaLegibleAviso,
  horarioLegible as horarioLegibleAviso,
  muestraEstado as muestraEstadoAviso,
  muestraSolicitante as muestraSolicitanteAviso,
  puedeRevisar as puedeRevisarAviso,
  rolLegible as rolLegibleAviso
} from '../../utils/notificacion.util';

type ModoDecision = 'ceder' | 'conservar' | null;

/** Cada cuánto se refresca el contador de no leídas mientras la sesión está abierta. */
const REFRESCO_CONTADOR_MS = 30_000;

/**
 * Campana de notificaciones del topbar.
 *
 * Muestra solo los avisos **nuevos** (no leídos) y el contador. Al cerrar el
 * panel se marcan como leídos, de modo que la campana vuelva a quedar limpia:
 * el historial completo vive en el módulo /notificaciones.
 */
@Component({
  selector: 'app-campana-notificaciones',
  imports: [FormsModule, Toast],
  templateUrl: './campana-notificaciones.component.html',
  styleUrl: './campana-notificaciones.component.scss'
})
export class CampanaNotificacionesComponent implements OnInit, OnDestroy {
  private readonly notificacionesService = inject(NotificacionesService);
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private suscripciones: Subscription[] = [];
  private intervaloContador?: ReturnType<typeof setInterval>;

  readonly abierto = signal(false);
  readonly notificaciones = signal<Notificacion[]>([]);
  readonly noLeidas = signal(0);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly procesandoId = signal<number | null>(null);
  readonly decisionAbiertaId = signal<number | null>(null);
  readonly modoDecision = signal<ModoDecision>(null);
  motivoConservar = '';

  ngOnInit(): void {
    this.cargarResumen();
    // Sin recargar la página: si llega una solicitud o una decisión, el contador se entera
    this.intervaloContador = setInterval(() => this.cargarResumen(), REFRESCO_CONTADOR_MS);
  }

  ngOnDestroy(): void {
    if (this.intervaloContador) {
      clearInterval(this.intervaloContador);
    }
    this.suscripciones.forEach(suscripcion => suscripcion.unsubscribe());
  }

  @HostListener('document:click', ['$event'])
  cerrarAlClicFuera(evento: MouseEvent): void {
    if (!this.abierto()) {
      return;
    }
    const destino = evento.target as Node | null;
    if (destino && !this.host.nativeElement.contains(destino)) {
      this.cerrarPanel();
    }
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.abierto()) {
      this.cerrarPanel();
    }
  }

  get etiquetaContador(): string {
    const total = this.noLeidas();
    if (total === 0) {
      return 'Notificaciones';
    }
    return `Notificaciones: ${total} sin leer`;
  }

  alternarPanel(): void {
    if (this.abierto()) {
      this.cerrarPanel();
      return;
    }
    this.abierto.set(true);
    this.cargarListado();
  }

  cerrarPanel(): void {
    const estabaAbierto = this.abierto();
    this.abierto.set(false);
    this.cerrarDecision();
    if (estabaAbierto) {
      this.consumirAvisos();
    }
  }

  /** Al salir del panel los avisos dejan de ser "nuevos": pasan al historial. */
  private consumirAvisos(): void {
    if (!this.notificaciones().some(notificacion => !notificacion.leida)) {
      return;
    }
    this.suscribir(
      this.notificacionesService.marcarTodasLeidas().subscribe({
        next: () => {
          this.notificaciones.set([]);
          this.noLeidas.set(0);
        },
        // Si falla, el aviso sigue contando: se reintentará en el próximo cierre
        error: () => undefined
      })
    );
  }

  /** El historial completo (leídas y no leídas) está en el módulo de notificaciones. */
  verTodas(): void {
    this.cerrarPanel();
    void this.router.navigateByUrl('/notificaciones');
  }

  /** ¿El aviso lleva a revisar una solicitud (bandeja de aprobación o autorización)? */
  puedeRevisar(notificacion: Notificacion): boolean {
    return puedeRevisarAviso(notificacion);
  }

  /** Lleva al revisor a la pantalla donde decide, abriendo el espacio solicitado. */
  revisar(notificacion: Notificacion): void {
    this.marcarLeida(notificacion);
    this.cerrarPanel();
    if (notificacion.tipo === 'RECURSO_SOLICITADO') {
      void this.router.navigate(['/admin/parametros/recursos']);
      return;
    }
    if (notificacion.tipo === 'SOLICITUD_POR_AUTORIZAR') {
      this.router.navigate(['/autorizaciones']);
      return;
    }
    const espacioId = notificacion.detalle?.espacio_id;
    this.router.navigate(['/admin/espacios'], {
      queryParams: espacioId ? { espacio: espacioId } : {}
    });
  }

  /** Los avisos de resultado muestran una píldora con el estado de la solicitud. */
  muestraEstado(notificacion: Notificacion): boolean {
    return muestraEstadoAviso(notificacion);
  }

  esRechazo(notificacion: Notificacion): boolean {
    return esRechazoAviso(notificacion);
  }

  /** Quién pide solo se muestra al revisor y al titular del cupo, no al propio solicitante. */
  muestraSolicitante(notificacion: Notificacion): boolean {
    return muestraSolicitanteAviso(notificacion);
  }

  estadoLegible(notificacion: Notificacion): string {
    return estadoLegibleAviso(notificacion);
  }

  cargarResumen(): void {
    this.suscribir(
      this.notificacionesService.resumen().subscribe({
        next: resumen => this.noLeidas.set(resumen.no_leidas),
        error: () => this.noLeidas.set(0)
      })
    );
  }

  cargarListado(): void {
    this.cargando.set(true);
    this.error.set('');
    // La campana solo muestra lo nuevo; lo leído vive en /notificaciones
    this.suscribir(
      this.notificacionesService.listar(true).subscribe({
        next: notificaciones => {
          this.notificaciones.set(notificaciones);
          this.noLeidas.set(notificaciones.length);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las notificaciones.');
          this.cargando.set(false);
        }
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
          this.noLeidas.update(total => Math.max(0, total - 1));
        },
        error: () => undefined
      })
    );
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
          this.cargarListado();
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

  rolLegible(rol: string): string {
    return rolLegibleAviso(rol);
  }

  fechaLegible(valor: string): string {
    return fechaLegibleAviso(valor);
  }

  horarioLegible(inicio: string, fin: string): string {
    return horarioLegibleAviso(inicio, fin);
  }

  private suscribir(suscripcion: Subscription): void {
    this.suscripciones.push(suscripcion);
  }

  private notificar(severity: 'success' | 'error', summary: string, detail: string): void {
    this.messageService.add({ key: 'notificaciones', severity, summary, detail, life: 6000 });
  }
}
