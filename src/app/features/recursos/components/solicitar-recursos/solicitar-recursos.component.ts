import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RecursosService } from '../../../../core/services/recursos.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import {
  DisponibilidadRecursos,
  ReservaElegibleRecursos,
  SolicitudRecurso
} from '../../../../shared/models/recurso.model';
import {
  fechaReservaColombia,
  horaReservaColombia
} from '../../../../shared/utils/fecha-colombia.util';

interface LineaSolicitud {
  tipo_recurso_id: number;
  tipo: string;
  disponibles: number;
  cantidad: number;
}

/**
 * Diálogo para pedir recursos tecnológicos de una reserva propia (HU-44).
 * El horario es el de la reserva y no se puede editar.
 */
@Component({
  selector: 'app-solicitar-recursos',
  imports: [FormsModule],
  templateUrl: './solicitar-recursos.component.html',
  styleUrl: './solicitar-recursos.component.scss'
})
export class SolicitarRecursosComponent implements OnInit {
  private readonly recursosService = inject(RecursosService);

  @Output() cerrado = new EventEmitter<void>();
  @Output() solicitado = new EventEmitter<SolicitudRecurso>();

  reservas: ReservaElegibleRecursos[] = [];
  reservaId: number | null = null;
  disponibilidad: DisponibilidadRecursos | null = null;
  lineas: LineaSolicitud[] = [];
  observacion = '';
  cargandoReservas = true;
  cargandoDisponibilidad = false;
  enviando = false;
  error: string | null = null;

  ngOnInit(): void {
    this.cargarReservas();
  }

  cargarReservas(): void {
    this.cargandoReservas = true;
    this.error = null;
    this.recursosService.reservasElegibles().subscribe({
      next: reservas => {
        this.reservas = reservas;
        this.cargandoReservas = false;
        if (reservas.length > 0) {
          this.seleccionarReserva(reservas[0].reserva_id);
        }
      },
      error: error => {
        this.cargandoReservas = false;
        this.error =
          obtenerMensajeErrorApi(error) ?? 'No se pudieron cargar tus reservas.';
      }
    });
  }

  seleccionarReserva(reservaId: number): void {
    this.reservaId = reservaId;
    this.cargandoDisponibilidad = true;
    this.error = null;
    this.lineas = [];
    this.recursosService.disponibilidad(reservaId).subscribe({
      next: disponibilidad => {
        this.disponibilidad = disponibilidad;
        this.lineas = disponibilidad.tipos.map(tipo => ({
          tipo_recurso_id: tipo.tipo_recurso_id,
          tipo: tipo.tipo,
          disponibles: tipo.disponibles,
          cantidad: 0
        }));
        this.cargandoDisponibilidad = false;
      },
      error: error => {
        this.cargandoDisponibilidad = false;
        this.disponibilidad = null;
        this.error =
          obtenerMensajeErrorApi(error) ?? 'No se pudo consultar la disponibilidad.';
      }
    });
  }

  cambiarReserva(valor: string): void {
    const reservaId = Number(valor);
    if (reservaId > 0) {
      this.seleccionarReserva(reservaId);
    }
  }

  get totalSolicitado(): number {
    return this.lineas.reduce((total, linea) => total + (linea.cantidad || 0), 0);
  }

  /** Texto de la opción del selector: espacio, fecha y franja de la reserva. */
  etiquetaReserva(reserva: ReservaElegibleRecursos): string {
    return (
      `#${reserva.reserva_id} · ${reserva.espacio} · ` +
      `${fechaReservaColombia(reserva.inicio)} ` +
      `${horaReservaColombia(reserva.inicio)} a ${horaReservaColombia(reserva.fin)}`
    );
  }

  get hayExceso(): boolean {
    return this.lineas.some(linea => linea.cantidad > linea.disponibles);
  }

  get puedeEnviar(): boolean {
    return (
      !this.enviando &&
      this.reservaId !== null &&
      this.totalSolicitado > 0 &&
      !this.hayExceso
    );
  }

  enviar(): void {
    if (!this.puedeEnviar || this.reservaId === null) {
      return;
    }
    this.enviando = true;
    this.error = null;
    this.recursosService
      .solicitar({
        reserva_id: this.reservaId,
        detalle: this.lineas
          .filter(linea => linea.cantidad > 0)
          .map(linea => ({
            tipo_recurso_id: linea.tipo_recurso_id,
            cantidad: linea.cantidad
          })),
        observacion: this.observacion.trim() || null
      })
      .subscribe({
        next: solicitud => {
          this.enviando = false;
          this.solicitado.emit(solicitud);
        },
        error: error => {
          this.enviando = false;
          this.error =
            obtenerMensajeErrorApi(error) ?? 'No se pudo registrar la solicitud.';
        }
      });
  }

  cerrar(): void {
    if (!this.enviando) {
      this.cerrado.emit();
    }
  }
}
