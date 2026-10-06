import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { EspaciosService } from '../../../../core/services/espacios.service';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { Espacio } from '../../../../shared/models/espacio.model';
import { obtenerColorIdentificadorEspacio } from '../../../../shared/utils/espacio-color.util';
import { EstadoDetalleSolicitud, SolicitudPendiente } from '../../../../shared/models/solicitud.model';
import { SolicitudesEspacioModalComponent } from '../../../solicitudes/components/solicitudes-espacio-modal/solicitudes-espacio-modal.component';

@Component({
  selector: 'app-admin-espacios',
  imports: [RouterLink, SolicitudesEspacioModalComponent],
  templateUrl: './admin-espacios.component.html',
  styleUrl: './admin-espacios.component.scss'
})
export class AdminEspaciosComponent implements OnDestroy, OnInit {
  private readonly authService = inject(AuthService);
  private readonly espaciosService = inject(EspaciosService);
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private detalleSubscription = new Subscription();
  private aprobacionSubscription: Subscription | null = null;

  readonly columnas = 8;
  espacios: Espacio[] = [];
  cargandoEspacios = false;
  errorEspacios: string | null = null;
  conteosPendientes = new Map<number, number>();
  cargandoConteos = false;
  errorConteos = false;
  espacioSeleccionado: Espacio | null = null;
  solicitudes: SolicitudPendiente[] = [];
  cargandoSolicitudes = false;
  errorSolicitudes: string | null = null;
  detallesSolicitudes = new Map<number, EstadoDetalleSolicitud>();
  aprobandoSolicitudId: number | null = null;
  solicitudRechazoId: number | null = null;
  rechazandoSolicitudId: number | null = null;
  private rechazoSubscription: Subscription | null = null;

  get usuarioActual() {
    return this.authService.obtenerUsuarioActual();
  }

  get puedeConsultarSolicitudes(): boolean {
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

  ngOnInit(): void {
    this.cargarEspacios();
    if (this.puedeConsultarSolicitudes) {
      this.cargarConteosPendientes();
    }
  }

  cargarEspacios(): void {
    this.cargandoEspacios = true;
    this.errorEspacios = null;
    this.espaciosService.listar().subscribe({
      next: espacios => {
        this.espacios = espacios;
        this.cargandoEspacios = false;
      },
      error: error => {
        this.errorEspacios = obtenerMensajeErrorApi(error) ??
          'No se pudieron cargar los espacios. Intenta nuevamente.';
        this.cargandoEspacios = false;
      }
    });
  }

  cargarConteosPendientes(): void {
    if (!this.puedeConsultarSolicitudes) {
      return;
    }

    this.cargandoConteos = true;
    this.errorConteos = false;
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
        this.cargandoConteos = false;
      },
      error: () => {
        this.conteosPendientes = new Map();
        this.errorConteos = true;
        this.cargandoConteos = false;
      }
    });
  }

  obtenerConteoPendientes(espacioId: number): number {
    return this.conteosPendientes.get(espacioId) ?? 0;
  }

  obtenerColorEspacio(espacioId: number): string {
    return obtenerColorIdentificadorEspacio(espacioId);
  }

  verSolicitudes(espacio: Espacio): void {
    if (!this.puedeConsultarSolicitudes) {
      return;
    }

    this.cancelarCargasDetalle();
    this.espacioSeleccionado = espacio;
    this.solicitudes = [];
    this.errorSolicitudes = null;
    this.cargandoSolicitudes = true;

    this.solicitudesService.consultarPendientes(espacio.id).subscribe({
      next: solicitudes => {
        this.solicitudes = solicitudes.filter(
          solicitud => solicitud.espacio.id === espacio.id && solicitud.estado === 'PENDIENTE'
        );
        this.cargandoSolicitudes = false;
        this.aprobandoSolicitudId = null;
        this.cargarDetallesSolicitudes(this.solicitudes);
      },
      error: error => {
        this.errorSolicitudes = obtenerMensajeErrorApi(error) ??
          (error.status === 403
            ? 'No tienes permiso para consultar estas solicitudes.'
            : 'No se pudieron cargar las solicitudes pendientes. Intenta nuevamente.');
        this.cargandoSolicitudes = false;
        this.aprobandoSolicitudId = null;
      }
    });
  }

  aprobarSolicitud(solicitudId: number): void {
    if (
      !this.puedeConsultarSolicitudes ||
      this.aprobandoSolicitudId !== null ||
      !this.solicitudes.some(solicitud => solicitud.id === solicitudId && solicitud.estado === 'PENDIENTE')
    ) {
      return;
    }

    const espacio = this.espacioSeleccionado;
    if (!espacio) {
      return;
    }

    this.aprobandoSolicitudId = solicitudId;
    this.aprobacionSubscription = this.solicitudesService.aprobarSolicitud(solicitudId).subscribe({
      next: () => {
        this.messageService.add({
          key: 'solicitudes-acciones',
          severity: 'success',
          summary: 'Reserva aprobada',
          detail: 'La solicitud fue aprobada correctamente.',
          life: 5000
        });
        this.cargarConteosPendientes();
        if (this.espacioSeleccionado?.id === espacio.id) {
          this.verSolicitudes(espacio);
        } else {
          this.aprobandoSolicitudId = null;
        }
        this.aprobacionSubscription = null;
      },
      error: error => {
        const conflicto = error instanceof HttpErrorResponse && error.status === 409;
        const mensaje = obtenerMensajeErrorApi(error) ??
          (conflicto
            ? 'La solicitud ya no puede aprobarse.'
            : 'No se pudo aprobar la solicitud. Intenta nuevamente.');
        this.messageService.add({
          key: 'solicitudes-acciones',
          severity: conflicto ? 'warn' : 'error',
          summary: conflicto ? 'No se pudo aprobar la solicitud' : 'Error al aprobar la solicitud',
          detail: mensaje,
          life: 5000
        });
        this.aprobandoSolicitudId = null;
        this.aprobacionSubscription = null;
      }
    });
  }

  abrirDialogoRechazo(solicitudId: number): void {
    if (
      this.puedeConsultarSolicitudes &&
      this.rechazandoSolicitudId === null &&
      this.solicitudes.some(solicitud => solicitud.id === solicitudId && solicitud.estado === 'PENDIENTE')
    ) {
      this.solicitudRechazoId = solicitudId;
    }
  }

  cancelarRechazo(): void {
    if (this.rechazandoSolicitudId === null) {
      this.solicitudRechazoId = null;
    }
  }

  rechazarSolicitud(solicitudId: number, motivo: string): void {
    if (
      !this.puedeConsultarSolicitudes ||
      this.rechazandoSolicitudId !== null ||
      this.solicitudRechazoId !== solicitudId ||
      !this.solicitudes.some(solicitud => solicitud.id === solicitudId && solicitud.estado === 'PENDIENTE')
    ) {
      return;
    }

    const espacio = this.espacioSeleccionado;
    const motivoLimpio = motivo.trim();
    if (!espacio || !motivoLimpio || motivoLimpio.length > 500) {
      return;
    }

    this.rechazandoSolicitudId = solicitudId;
    this.rechazoSubscription = this.solicitudesService.rechazarSolicitud(solicitudId, motivoLimpio).subscribe({
      next: () => {
        this.messageService.add({
          key: 'solicitudes-acciones',
          severity: 'success',
          summary: 'Solicitud rechazada',
          detail: 'La solicitud fue rechazada correctamente.',
          life: 5000
        });
        this.solicitudRechazoId = null;
        this.rechazandoSolicitudId = null;
        this.cargarConteosPendientes();
        if (this.espacioSeleccionado?.id === espacio.id) {
          this.verSolicitudes(espacio);
        }
        this.rechazoSubscription = null;
      },
      error: error => {
        const conflicto = error instanceof HttpErrorResponse && error.status === 409;
        const mensaje = obtenerMensajeErrorApi(error) ??
          (conflicto
            ? 'La solicitud ya no está pendiente.'
            : 'No se pudo rechazar la solicitud. Intenta nuevamente.');
        this.messageService.add({
          key: 'solicitudes-acciones',
          severity: conflicto ? 'warn' : 'error',
          summary: conflicto ? 'No se pudo rechazar la solicitud' : 'Error al rechazar la solicitud',
          detail: mensaje,
          life: 5000
        });
        this.rechazandoSolicitudId = null;
        this.rechazoSubscription = null;
      }
    });
  }

  cerrarSolicitudes(): void {
    this.cancelarCargasDetalle();
    this.cancelarRechazo();
    this.espacioSeleccionado = null;
    this.solicitudes = [];
    this.errorSolicitudes = null;
  }

  ngOnDestroy(): void {
    this.cancelarCargasDetalle();
    this.aprobacionSubscription?.unsubscribe();
    this.rechazoSubscription?.unsubscribe();
  }

  private cargarDetallesSolicitudes(solicitudes: SolicitudPendiente[]): void {
    this.cancelarCargasDetalle();
    this.detallesSolicitudes = new Map(solicitudes.map(solicitud => [
      solicitud.id,
      { detalle: null, cargando: true, error: null }
    ]));

    for (const solicitud of solicitudes) {
      const subscription = this.solicitudesService.obtenerDetalle(solicitud.id).subscribe({
        next: detalle => {
          this.actualizarEstadoDetalle(solicitud.id, {
            detalle,
            cargando: false,
            error: null
          });
        },
        error: error => {
          const mensaje = obtenerMensajeErrorApi(error) ??
            'No se pudo cargar el detalle de la solicitud.';
          this.actualizarEstadoDetalle(solicitud.id, {
            detalle: null,
            cargando: false,
            error: mensaje
          });
          this.messageService.add({
            severity: 'error',
            summary: 'Error al cargar una solicitud',
            detail: mensaje,
            life: 5000
          });
        }
      });
      this.detalleSubscription.add(subscription);
    }
  }

  private actualizarEstadoDetalle(solicitudId: number, estado: EstadoDetalleSolicitud): void {
    this.detallesSolicitudes = new Map(this.detallesSolicitudes).set(solicitudId, estado);
  }

  private cancelarCargasDetalle(): void {
    this.detalleSubscription.unsubscribe();
    this.detalleSubscription = new Subscription();
    this.detallesSolicitudes = new Map();
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}