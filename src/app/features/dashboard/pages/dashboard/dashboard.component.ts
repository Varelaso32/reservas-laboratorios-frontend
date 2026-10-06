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
import { fechaActualLargaColombia, fechaColombia, fechaReservaColombia, horaReservaColombia, obtenerRangoDisponibilidadActual } from '../../../../shared/utils/fecha-colombia.util';
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
  reservasHoy: ReservaResumen[] = [];
  detallesReservas = new Map<number, ReservaDetalle>();
  espaciosDisponibles: Espacio[] = [];
  mensajeAgendaNoDisponible: string | null = null;
  errorAgenda: string | null = null;
  errorDisponibles: string | null = null;
  intervaloDisponibilidad: string | null = null;
  fechaDisponibilidad: string | null = null;

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

  obtenerEstadoReserva(reserva: ReservaResumen): 'En curso' | 'Próxima' {
    const ahora = Date.now();
    return new Date(reserva.inicio).getTime() <= ahora && ahora < new Date(reserva.fin).getTime()
      ? 'En curso'
      : 'Próxima';
  }

  obtenerClaseEstado(reserva: ReservaResumen): string {
    return this.obtenerEstadoReserva(reserva) === 'En curso' ? 'estado-en-curso' : 'estado-proxima';
  }

  private cargarAgenda(): void {
    if (this.rolUsuario !== 'SOLICITANTE') {
      this.mensajeAgendaNoDisponible = 'No hay reservas disponibles para mostrar.';
      return;
    }

    this.cargandoAgenda = true;
    this.subscriptions.add(this.reservasService.consultarMias().subscribe({
      next: reservas => {
        const ahora = Date.now();
        this.reservasHoy = reservas.filter(reserva =>
          reserva.estado === 'ACTIVA' &&
          fechaReservaColombia(reserva.inicio) <= this.hoy &&
          fechaReservaColombia(reserva.fin) >= this.hoy &&
          new Date(reserva.fin).getTime() > ahora
        );
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
