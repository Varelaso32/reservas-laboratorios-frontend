import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ReservasService } from '../../../../core/services/reservas.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { PosSidebarComponent } from '../../../../shared/components/pos-sidebar/pos-sidebar.component';
import { ReservaResumen } from '../../../../shared/models/solicitud.model';
import {
  fechaActualLargaColombia,
  fechaColombia,
  fechaDesdeClaveColombia,
  fechaReservaColombia,
  horaReservaColombia,
  obtenerInicioSemana,
  sumarDiasFecha
} from '../../../../shared/utils/fecha-colombia.util';

interface DiaCalendario {
  fecha: string;
  nombre: string;
  numero: string;
  esHoy: boolean;
  columna: number;
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [PosSidebarComponent, Toast],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss'
})
export class CalendarioComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly reservasService = inject(ReservasService);
  private readonly messageService = inject(MessageService);
  private readonly subscriptions = new Subscription();

  readonly fechaActual = fechaActualLargaColombia(new Date());
  readonly hoy = fechaColombia(new Date());
  readonly horas = Array.from({ length: 12 }, (_, indice) => indice + 7);
  semanaInicio = obtenerInicioSemana(this.hoy);
  reservas: ReservaResumen[] = [];
  cargando = false;
  errorCarga: string | null = null;

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

  get diasSemana(): DiaCalendario[] {
    return Array.from({ length: 7 }, (_, indice) => {
      const fecha = sumarDiasFecha(this.semanaInicio, indice);
      const fechaDate = fechaDesdeClaveColombia(fecha);
      const nombre = new Intl.DateTimeFormat('es-CO', {
        weekday: 'short',
        timeZone: 'UTC'
      }).format(fechaDate).replace('.', '');
      return {
        fecha,
        nombre: nombre.charAt(0).toLocaleUpperCase() + nombre.slice(1),
        numero: String(fechaDate.getUTCDate()),
        esHoy: fecha === this.hoy,
        columna: indice + 2
      };
    });
  }

  get etiquetaSemana(): string {
    if (this.semanaInicio === obtenerInicioSemana(this.hoy)) {
      return 'Semana actual';
    }
    const fin = sumarDiasFecha(this.semanaInicio, 6);
    const formato = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const inicioTexto = formato.format(fechaDesdeClaveColombia(this.semanaInicio)).replace('.', '');
    const finTexto = formato.format(fechaDesdeClaveColombia(fin)).replace('.', '');
    return `${inicioTexto} – ${finTexto}`;
  }

  ngOnInit(): void {
    this.cargarReservas();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  semanaAnterior(): void {
    this.semanaInicio = sumarDiasFecha(this.semanaInicio, -7);
  }

  semanaSiguiente(): void {
    this.semanaInicio = sumarDiasFecha(this.semanaInicio, 7);
  }

  reservasDelDia(fecha: string): ReservaResumen[] {
    return this.reservas.filter(reserva =>
      reserva.estado === 'ACTIVA' &&
      fechaReservaColombia(reserva.inicio) === fecha &&
      this.minutosDelDia(reserva.inicio) < 19 * 60 &&
      this.minutosDelDia(reserva.fin) > 7 * 60
    );
  }

  hora(valor: string): string {
    return horaReservaColombia(valor);
  }

  posicionVertical(valor: string): number {
    const minutos = this.minutosDelDia(valor);
    return Math.max(0, Math.min(720, minutos - 7 * 60)) / 720 * 100;
  }

  alturaVertical(reserva: ReservaResumen): number {
    let inicio = this.minutosDelDia(reserva.inicio);
    let fin = this.minutosDelDia(reserva.fin);
    if (fechaReservaColombia(reserva.fin) > fechaReservaColombia(reserva.inicio)) {
      fin += 24 * 60;
    }
    inicio = Math.max(7 * 60, Math.min(19 * 60, inicio));
    fin = Math.max(inicio, Math.min(19 * 60, fin));
    return Math.max(2.2, (fin - inicio) / 720 * 100);
  }

  private cargarReservas(): void {
    if (this.rolUsuario !== 'SOLICITANTE') {
      return;
    }

    this.cargando = true;
    this.subscriptions.add(this.reservasService.consultarMias().subscribe({
      next: reservas => {
        this.reservas = reservas.filter(reserva =>
          reserva.estado === 'ACTIVA' && new Date(reserva.fin).getTime() > Date.now()
        );
        this.cargando = false;
      },
      error: error => {
        this.errorCarga = obtenerMensajeErrorApi(error) ?? 'No se pudieron cargar las reservas.';
        this.cargando = false;
        this.messageService.add({
          key: 'calendario',
          severity: 'error',
          summary: 'Error al cargar el calendario',
          detail: this.errorCarga,
          life: 5000
        });
      }
    }));
  }

  private minutosDelDia(valor: string): number {
    const [hora, minutos] = horaReservaColombia(valor).split(':').map(Number);
    return hora * 60 + minutos;
  }
}
