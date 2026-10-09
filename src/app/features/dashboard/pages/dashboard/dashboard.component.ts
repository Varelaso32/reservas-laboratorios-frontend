import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { EspaciosService } from '../../../../core/services/espacios.service';
import { ReservasService } from '../../../../core/services/reservas.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { Espacio } from '../../../../shared/models/espacio.model';
import { ReservaDetalle, ReservaResumen } from '../../../../shared/models/solicitud.model';
import { PosSidebarComponent } from '../../../../shared/components/pos-sidebar/pos-sidebar.component';
import { fechaActualLargaColombia, fechaColombia, fechaReservaColombia, horaReservaColombia, instanteReservaColombia, obtenerRangoDisponibilidadActual } from '../../../../shared/utils/fecha-colombia.util';
import { obtenerColorIdentificadorEspacio } from '../../../../shared/utils/espacio-color.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PosSidebarComponent, RouterLink, Toast],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly espaciosService = inject(EspaciosService);
  private readonly reservasService = inject(ReservasService);
  private readonly messageService = inject(MessageService);
  private readonly subscriptions = new Subscription();

  readonly fechaActual = fechaActualLargaColombia(new Date());
  readonly hoy = fechaColombia(new Date());
  cargandoAgenda = false;
  cargandoDisponibles = false;
  totalReservasHoy: number | null = null;
  reservasHoy: ReservaResumen[] = [];
  detallesReservas = new Map<number, ReservaDetalle>();
  espaciosDisponibles: Espacio[] = [];
  mensajeAgendaNoDisponible: string | null = null;
  errorAgenda: string | null = null;
  errorDisponibles: string | null = null;
  intervaloDisponibilidad: string | null = null;
  fechaDisponibilidad: string | null = null;
  cancelandoReservaId: number | null = null;
  reservaCancelar: ReservaResumen | null = null;

  get rolUsuario(): string | null {
    return this.authService.obtenerUsuarioActual()?.rol ?? null;
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

  ngOnInit(): void {
    this.cargarAgenda();
    this.cargarEspaciosDisponibles();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  obtenerColorEspacio(espacioId: number): string {
    return obtenerColorIdentificadorEspacio(espacioId);
  }

  formatearHora(valor: string): string {
    return horaReservaColombia(valor);
  }

  obtenerEstadoReserva(reserva: ReservaResumen): 'En curso' | 'Próxima' | 'Cancelada' {
    if (reserva.estado === 'CANCELADA') {
      return 'Cancelada';
    }
    const ahora = Date.now();
    return instanteReservaColombia(reserva.inicio) <= ahora && ahora < instanteReservaColombia(reserva.fin)
      ? 'En curso'
      : 'Próxima';
  }

  obtenerClaseEstado(reserva: ReservaResumen): string {
    const estado = this.obtenerEstadoReserva(reserva);
    if (estado === 'Cancelada') {
      return 'estado-cancelada';
    }
    return estado === 'En curso' ? 'estado-en-curso' : 'estado-proxima';
  }

  puedeCancelarReserva(reserva: ReservaResumen): boolean {
    return this.rolUsuario === 'SOLICITANTE' &&
      reserva.estado === 'ACTIVA' &&
      instanteReservaColombia(reserva.inicio) > Date.now();
  }

  abrirConfirmacionCancelacion(reserva: ReservaResumen): void {
    if (this.cancelandoReservaId === null && this.puedeCancelarReserva(reserva)) {
      this.reservaCancelar = reserva;
    }
  }

  cerrarConfirmacionCancelacion(): void {
    if (this.cancelandoReservaId === null) {
      this.reservaCancelar = null;
    }
  }

  confirmarCancelacion(): void {
    const reserva = this.reservaCancelar;
    if (
      !reserva ||
      this.cancelandoReservaId !== null ||
      !this.puedeCancelarReserva(reserva)
    ) {
      return;
    }

    this.cancelandoReservaId = reserva.id;
    this.subscriptions.add(this.reservasService.cancelarReserva(reserva.id).subscribe({
      next: () => {
        this.cancelandoReservaId = null;
        this.reservaCancelar = null;
        this.messageService.add({
          key: 'dashboard',
          severity: 'success',
          summary: 'Reserva cancelada',
          detail: 'La reserva fue cancelada correctamente.',
          life: 5000
        });
        this.cargarAgenda();
      },
      error: error => {
        const noEncontrada = error.status === 404;
        const conflicto = error.status === 409;
        const detalle = obtenerMensajeErrorApi(error);
        let summary = 'Error al cancelar la reserva';
        let mensaje = detalle ?? 'No se pudo cancelar la reserva. Intenta nuevamente.';
        let severity: 'warn' | 'error' = 'error';
        if (noEncontrada) {
          summary = 'Reserva no encontrada';
          mensaje = 'La reserva no existe o no pertenece a tu cuenta.';
        } else if (conflicto) {
          summary = 'No se puede cancelar la reserva';
          mensaje = 'La reserva ya inició y no se puede cancelar.';
          severity = 'warn';
        }
        this.messageService.add({
          key: 'dashboard',
          severity,
          summary,
          detail: mensaje,
          life: 5000
        });
        this.cancelandoReservaId = null;
      }
    }));
  }
  private cargarAgenda(): void {
    const rol = this.rolUsuario;
    if (rol !== 'SOLICITANTE' && rol !== 'ADMIN' && rol !== 'APROBADOR') {
      this.mensajeAgendaNoDisponible = 'No hay reservas disponibles para mostrar.';
      return;
    }

    this.cargandoAgenda = true;
    const peticion$ = rol === 'SOLICITANTE'
      ? this.reservasService.consultarMias()
      : this.reservasService.consultarAgenda({ fecha: this.hoy });

    this.subscriptions.add(peticion$.subscribe({
      next: reservas => {
        const ahora = Date.now();
        const reservasHoy = reservas.filter(reserva =>
          fechaReservaColombia(reserva.inicio) === this.hoy
        );
        const reservasActivasHoy = reservasHoy.filter(r => r.estado === 'ACTIVA');
        this.reservasHoy = reservasActivasHoy.filter(
          reserva => instanteReservaColombia(reserva.fin) > ahora
        );
        this.totalReservasHoy = this.reservasHoy.length;
        this.cargandoAgenda = false;
        for (const reserva of this.reservasHoy) {
          this.subscriptions.add(this.reservasService.obtenerDetalle(reserva.id).subscribe({
            next: detalle => this.detallesReservas.set(reserva.id, detalle),
            error: error => this.mostrarError(
              'No se pudo cargar el detalle de una reserva',
              obtenerMensajeErrorApi(error) ?? 'No se pudo cargar la información de la reserva.'
            )
          }));
        }
      },
      error: error => {
        this.cargandoAgenda = false;
        this.errorAgenda = obtenerMensajeErrorApi(error) ?? 'No se pudo cargar la agenda de hoy.';
        this.mostrarError('Error al cargar la agenda', this.errorAgenda);
      }
    }));
  }

  private cargarEspaciosDisponibles(): void {
    const rango = obtenerRangoDisponibilidadActual(new Date());
    if (!rango) {
      this.errorDisponibles = 'No se puede validar un intervalo que cruce el cambio de día.';
      return;
    }

    this.cargandoDisponibles = true;
    this.intervaloDisponibilidad = `${rango.horaInicio}–${rango.horaFin}`;
    this.fechaDisponibilidad = rango.fecha;
    this.subscriptions.add(
      this.espaciosService.consultarDisponibles(rango.fecha, rango.horaInicio, rango.horaFin).subscribe({
        next: espacios => {
          this.espaciosDisponibles = espacios;
          this.cargandoDisponibles = false;
        },
        error: error => {
          this.cargandoDisponibles = false;
          this.errorDisponibles = obtenerMensajeErrorApi(error) ?? 'No se pudo validar la disponibilidad actual.';
          this.mostrarError('Error al consultar espacios disponibles', this.errorDisponibles);
        }
      })
    );
  }

  private mostrarError(summary: string, detail: string): void {
    this.messageService.add({
      key: 'dashboard',
      severity: 'error',
      summary,
      detail,
      life: 5000
    });
  }
}
