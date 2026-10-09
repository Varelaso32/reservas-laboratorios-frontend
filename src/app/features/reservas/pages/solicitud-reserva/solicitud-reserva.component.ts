import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { AuthService } from '../../../../core/services/auth.service';
import { EspaciosService } from '../../../../core/services/espacios.service';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { Espacio } from '../../../../shared/models/espacio.model';
import { SolicitudCrear, SolicitudCreada } from '../../../../shared/models/solicitud.model';
import { obtenerColorIdentificadorEspacio } from '../../../../shared/utils/espacio-color.util';

type EstadoDisponibilidad =
  | 'neutro'
  | 'consultando'
  | 'disponible'
  | 'no-disponible'
  | 'hora-invalida'
  | 'error';

@Component({
  selector: 'app-solicitud-reserva',
  imports: [ReactiveFormsModule, RouterLink, InputNumber],
  templateUrl: './solicitud-reserva.component.html',
  styleUrl: './solicitud-reserva.component.scss'
})
export class SolicitudReservaComponent {
  private readonly authService = inject(AuthService);
  private readonly espaciosService = inject(EspaciosService);
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly messageService = inject(MessageService);
  private consultaSubscription: Subscription | null = null;
  private ultimaConsultaKey: string | null = null;

  @Input() espacio: Espacio | null = null;

  @Output() cerrar = new EventEmitter<void>();

  tipoActividad = 'Clase';

  mensajeDisponibilidad = '';
  disponible: boolean | null = null;
  estadoDisponibilidad: EstadoDisponibilidad = 'neutro';
  cargandoDisponibilidad = false;
  cargandoSolicitud = false;
  solicitudCreada: SolicitudCreada | null = null;

  formReserva = new FormGroup({
    fecha: new FormControl(
      '',
      Validators.required
    ),

    horaInicio: new FormControl(
      '',
      Validators.required
    ),

    horaFin: new FormControl(
      '',
      Validators.required
    ),

    asistentes: new FormControl<number | null>(
      null,
      [
        Validators.required,
        Validators.min(1),
        control => control.value !== null && !Number.isInteger(control.value)
          ? { enteroPositivo: true }
          : null,
        control => {
          const capacidad = this.espacio?.capacidad;
          return capacidad !== undefined && control.value !== null && control.value > capacidad
            ? { capacidadExcedida: true }
            : null;
        }
      ]
    ),

    proposito: new FormControl(
      '',
      [Validators.required, Validators.maxLength(500), Validators.pattern(/\S/)]
    )

  });

  get espacioNombre(): string {
    return this.espacio?.nombre ?? '';
  }

  get colorIdentificadorEspacio(): string {
    return this.espacio ? obtenerColorIdentificadorEspacio(this.espacio.id) : '#7758e5';
  }

  get usuarioActual() {
    return this.authService.tieneSesionActiva()
      ? this.authService.obtenerUsuarioActual()
      : null;
  }

  get puedeCrearSolicitud(): boolean {
    return this.usuarioActual?.rol === 'SOLICITANTE';
  }

  seleccionarActividad(tipo: string) {
    this.tipoActividad = tipo;
  }

  filtrarTeclasAsistentes(event: KeyboardEvent): void {
    const teclasEdicion = [
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight',
      'ArrowUp', 'ArrowDown', 'Home', 'End'
    ];

    if (/^\d$/.test(event.key) || teclasEdicion.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }

    event.preventDefault();
  }

  validarPegadoAsistentes(event: ClipboardEvent): void {
    const valorPegado = event.clipboardData?.getData('text') ?? '';
    if (!/^\d+$/.test(valorPegado)) {
      event.preventDefault();
    }
  }

  cerrarModal() {
    this.solicitudCreada = null;
    this.cerrar.emit();
  }

  validarDisponibilidad(): void {
    if (this.cargandoSolicitud) {
      return;
    }
    this.consultarDisponibilidad(false, false);
  }

  confirmarReserva(): void {
    if (this.cargandoDisponibilidad || this.cargandoSolicitud) {
      return;
    }

    if (!this.usuarioActual) {
      this.mostrarErrorFormulario('Inicia sesión para enviar una solicitud.');
      return;
    }

    if (!this.puedeCrearSolicitud) {
      this.mostrarErrorFormulario('Solo una cuenta con rol SOLICITANTE puede crear solicitudes.');
      return;
    }

    if (!this.espacio || this.espacio.id === undefined || this.espacio.id === null) {
      this.mostrarErrorFormulario('Selecciona un espacio válido antes de continuar.');
      return;
    }

    this.formReserva.controls.asistentes.updateValueAndValidity();
    if (this.formReserva.invalid) {
      this.formReserva.markAllAsTouched();
      this.mostrarErrorFormulario('Revisa los campos obligatorios y sus validaciones.');
      return;
    }

    const { fecha, horaInicio } = this.formReserva.getRawValue();
    if (fecha && horaInicio && this.fechaHoraEnPasadoEnColombia(fecha, horaInicio)) {
      this.mostrarErrorFormulario('No se puede solicitar un espacio en una fecha u hora pasada.');
      return;
    }

    this.consultarDisponibilidad(true, true);
  }

  private consultarDisponibilidad(forzar: boolean, continuarAlConfirmar: boolean): void {
    const { fecha, horaInicio, horaFin } = this.formReserva.getRawValue();

    if (!this.espacio?.id || !fecha || !horaInicio || !horaFin) {
      this.cancelarConsulta();
      this.ultimaConsultaKey = null;
      this.disponible = null;
      this.estadoDisponibilidad = 'neutro';
      this.mensajeDisponibilidad = '';
      return;
    }

    if (horaFin <= horaInicio) {
      this.cancelarConsulta();
      this.ultimaConsultaKey = null;
      this.disponible = false;
      this.estadoDisponibilidad = 'hora-invalida';
      this.mensajeDisponibilidad = 'La hora de fin debe ser posterior a la hora de inicio.';
      this.notificar('warn', 'Horario no disponible', this.mensajeDisponibilidad);
      return;
    }

    const consultaKey = `${this.espacio.id}|${fecha}|${horaInicio}|${horaFin}`;
    if (!forzar && consultaKey === this.ultimaConsultaKey) {
      return;
    }

    this.consultaSubscription?.unsubscribe();
    this.ultimaConsultaKey = consultaKey;
    this.disponible = null;
    this.estadoDisponibilidad = 'consultando';
    this.cargandoDisponibilidad = true;
    this.mensajeDisponibilidad = 'Consultando disponibilidad...';

    this.consultaSubscription = this.espaciosService
      .consultarDisponibilidad(this.espacio.id, fecha, horaInicio, horaFin)
      .subscribe({
        next: respuesta => {
          this.disponible = respuesta.disponible;
          this.estadoDisponibilidad = respuesta.disponible ? 'disponible' : 'no-disponible';
          this.mensajeDisponibilidad = respuesta.mensaje;
          this.cargandoDisponibilidad = false;
          this.consultaSubscription = null;

          if (respuesta.disponible && !continuarAlConfirmar) {
            this.notificar('success', 'Horario disponible', respuesta.mensaje);
          } else if (!respuesta.disponible) {
            this.notificar('warn', 'Horario no disponible', respuesta.mensaje);
          }

          if (continuarAlConfirmar && respuesta.disponible) {
            this.crearSolicitudReal();
          }
        },
        error: error => {
          this.disponible = null;
          this.estadoDisponibilidad = 'error';
          this.mensajeDisponibilidad =
            obtenerMensajeErrorApi(error) ?? 'No se pudo verificar la disponibilidad. Intenta nuevamente.';
          this.notificar('error', 'Error de disponibilidad', this.mensajeDisponibilidad);
          this.cargandoDisponibilidad = false;
          this.consultaSubscription = null;
          this.ultimaConsultaKey = null;
        }
      });
  }

  private cancelarConsulta(): void {
    this.consultaSubscription?.unsubscribe();
    this.consultaSubscription = null;
    this.cargandoDisponibilidad = false;
  }

  private crearSolicitudReal(): void {
    const espacio = this.espacio;
    const { fecha, horaInicio, horaFin, asistentes, proposito } = this.formReserva.getRawValue();
    if (!espacio || !fecha || !horaInicio || !horaFin || asistentes === null || !proposito) {
      this.mostrarErrorFormulario('Completa los datos de la solicitud antes de continuar.');
      return;
    }

    const solicitud: SolicitudCrear = {
      espacio_id: espacio.id,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      proposito: proposito.trim(),
      asistentes
    };

    this.cargandoSolicitud = true;
    this.solicitudesService.crearSolicitud(solicitud).subscribe({
      next: respuesta => {
        this.cargandoSolicitud = false;
        this.formReserva.reset();
        this.tipoActividad = 'Clase';
        this.limpiarEstadoDisponibilidad();
        this.solicitudCreada = respuesta;
      },
      error: error => {
        this.cargandoSolicitud = false;
        this.disponible = null;
        this.estadoDisponibilidad = 'error';
        this.mensajeDisponibilidad =
          obtenerMensajeErrorApi(error) ?? 'No se pudo crear la solicitud. Intenta nuevamente.';
        this.notificar('error', 'No se pudo enviar la solicitud', this.mensajeDisponibilidad);
      }
    });
  }

  private mostrarErrorFormulario(mensaje: string): void {
    this.disponible = false;
    this.estadoDisponibilidad = 'error';
    this.mensajeDisponibilidad = mensaje;
    this.notificar('warn', 'Revisa la solicitud', mensaje);
  }

  private notificar(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.clear?.();
    this.messageService.add({ severity, summary, detail, life: 5000 });
  }

  private limpiarEstadoDisponibilidad(): void {
    this.mensajeDisponibilidad = '';
    this.disponible = null;
    this.estadoDisponibilidad = 'neutro';
    this.ultimaConsultaKey = null;
  }

  private fechaHoraEnPasadoEnColombia(fecha: string, hora: string): boolean {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    const valores = Object.fromEntries(partes.map(parte => [parte.type, parte.value]));
    const fechaActual = `${valores['year']}-${valores['month']}-${valores['day']}`;
    const horaActual = `${valores['hour']}:${valores['minute']}:${valores['second']}`;

    return fecha < fechaActual || (fecha === fechaActual && `${hora}:00` < horaActual);
  }

}