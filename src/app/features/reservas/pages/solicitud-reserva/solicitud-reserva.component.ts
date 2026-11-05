import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
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
import { ConfiguracionService } from '../../../../core/services/configuracion.service';
import { EspaciosService } from '../../../../core/services/espacios.service';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { Espacio } from '../../../../shared/models/espacio.model';
import { ReglasEspacio, Responsable, TipoUso } from '../../../../shared/models/configuracion.model';
import { SolicitudCrear, SolicitudCreada } from '../../../../shared/models/solicitud.model';
import { obtenerColorIdentificadorEspacio } from '../../../../shared/utils/espacio-color.util';
import { nombreRolReserva, puedePedirCupo as puedeSolicitarCupo, rolReservaDe } from '../../../../shared/utils/rol-reserva.util';

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
export class SolicitudReservaComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly espaciosService = inject(EspaciosService);
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly messageService = inject(MessageService);
  private consultaSubscription: Subscription | null = null;
  private ultimaConsultaKey: string | null = null;

  @Input() espacio: Espacio | null = null;

  @Output() cerrar = new EventEmitter<void>();

  tipoActividad = '';
  tiposUso: TipoUso[] = [];
  responsables: Responsable[] = [];
  reglas: ReglasEspacio | null = null;
  cargandoReglas = false;
  tipoUsoSeleccionadoId: number | null = null;
  responsableSeleccionadoId: number | null = null;

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
    ),

    /** HU-30: motivo obligatorio para pedir el cupo de alguien de menor jerarquía */
    motivoUrgencia: new FormControl(
      '',
      [Validators.maxLength(500)]
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

  get exigeResponsable(): boolean {
    return this.reglas?.requiere_responsable ?? false;
  }

  /** HU-30: rol de reserva del usuario (jerarquía distinta del permiso de plataforma). */
  get rolReserva(): string {
    return nombreRolReserva(rolReservaDe(this.usuarioActual?.cargo));
  }

  /** HU-30: solo Docente, Coordinador o Director pueden pedir el cupo de otro. */
  get puedePedirCupo(): boolean {
    return this.puedeCrearSolicitud && puedeSolicitarCupo(this.usuarioActual?.cargo);
  }

  /** El horario está ocupado y el usuario puede intentar la cesión (HU-30). */
  get muestraMotivoUrgencia(): boolean {
    return this.estadoDisponibilidad === 'no-disponible' && this.puedePedirCupo;
  }

  get motivoUrgenciaValor(): string {
    return (this.formReserva.controls.motivoUrgencia.value ?? '').trim();
  }

  /** Resumen de las reglas del espacio para avisar antes de enviar (HU-21, HU-28, HU-33, HU-34). */
  get resumenReglas(): string[] {
    const reglas = this.reglas;
    if (!reglas) {
      return [];
    }

    const apertura = this.horaCorta(reglas.hora_apertura);
    const cierre = this.horaCorta(reglas.hora_cierre);
    const franja = apertura && cierre ? `${apertura} a ${cierre}` : '07:00 a 22:00 (horario institucional)';
    const avisos = [`Opera ${this.textoDias(reglas.dias_operacion)} de ${franja}`];

    if (reglas.duracion_maxima_min) {
      avisos.push(`Duración máxima por uso: ${reglas.duracion_maxima_min} minutos`);
    }
    if (reglas.separacion_min > 0) {
      avisos.push(`Separación mínima entre reservas: ${reglas.separacion_min} minutos`);
    }
    if (reglas.ocupacion_minima) {
      avisos.push(`Mínimo ${reglas.ocupacion_minima} asistentes para aprovechar el espacio`);
    }
    if (reglas.max_usos_dia) {
      avisos.push(`Máximo ${reglas.max_usos_dia} usos por día`);
    }
    if (reglas.requiere_responsable) {
      avisos.push('Este espacio exige un responsable docente, coordinador o director');
    }
    if (reglas.admite_autorizacion_especial) {
      avisos.push('Fuera de la franja la solicitud queda pendiente de autorización especial');
    }

    return avisos;
  }

  ngOnInit(): void {
    if (this.espacio?.id) {
      this.cargarReglas(this.espacio.id);
    }
  }

  cargarReglas(espacioId: number): void {
    this.cargandoReglas = true;
    this.configuracionService.consultarReglas(espacioId).subscribe({
      next: reglas => {
        this.reglas = reglas;
        this.tiposUso = reglas.tipos_uso;
        this.tipoUsoSeleccionadoId = reglas.tipos_uso.length > 0 ? reglas.tipos_uso[0].id : null;
        this.tipoActividad = reglas.tipos_uso.length > 0 ? reglas.tipos_uso[0].nombre : '';
        this.cargandoReglas = false;
        if (reglas.requiere_responsable) {
          this.cargarResponsables();
        }
      },
      error: () => {
        // Sin la configuración el formulario sigue funcionando: el backend valida igual.
        this.reglas = null;
        this.tiposUso = [];
        this.cargandoReglas = false;
      }
    });
  }

  private cargarResponsables(): void {
    this.configuracionService.listarResponsables().subscribe({
      next: responsables => {
        this.responsables = responsables;
      },
      error: () => {
        this.responsables = [];
      }
    });
  }

  seleccionarTipoUso(tipo: TipoUso): void {
    this.tipoUsoSeleccionadoId = tipo.id;
    this.tipoActividad = tipo.nombre;
  }

  seleccionarResponsable(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.responsableSeleccionadoId = valor ? Number(valor) : null;
  }

  private horaCorta(valor: string | null): string | null {
    return valor ? valor.slice(0, 5) : null;
  }

  private textoDias(dias: number[] | undefined): string {
    const nombres = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const validos = (dias ?? []).filter(dia => dia >= 1 && dia <= 7);
    if (validos.length === 0 || validos.length === 7) {
      return 'todos los días';
    }
    return validos.map(dia => nombres[dia - 1]).join(', ');
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

    if (this.exigeResponsable && this.responsableSeleccionadoId === null) {
      this.mostrarErrorFormulario('Selecciona el responsable de la actividad.');
      return;
    }

    if (this.tiposUso.length > 0 && this.tipoUsoSeleccionadoId === null) {
      this.mostrarErrorFormulario('Selecciona el tipo de actividad de la reserva.');
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

          if (continuarAlConfirmar) {
            if (respuesta.disponible) {
              this.crearSolicitudReal();
            } else if (this.motivoUrgenciaValor) {
              // HU-30: el horario está ocupado, pero un rol superior puede pedir el cupo.
              // El backend decide si la rechaza o la deja en espera de cesión.
              this.crearSolicitudReal();
            } else {
              this.notificar(
                'warn',
                'Horario no disponible',
                this.puedePedirCupo
                  ? 'El horario ya está ocupado. Si necesitas ese cupo con urgencia, indica el motivo y vuelve a confirmar: el titular decidirá si lo cede.'
                  : respuesta.mensaje
              );
            }
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

    if (this.tipoUsoSeleccionadoId !== null) {
      solicitud.tipo_uso_id = this.tipoUsoSeleccionadoId;
    }
    if (this.responsableSeleccionadoId !== null) {
      solicitud.responsable_id = this.responsableSeleccionadoId;
    }
    if (this.motivoUrgenciaValor) {
      solicitud.motivo_urgencia = this.motivoUrgenciaValor;
    }

    this.cargandoSolicitud = true;
    this.solicitudesService.crearSolicitud(solicitud).subscribe({
      next: respuesta => {
        this.cargandoSolicitud = false;
        this.formReserva.reset();
        this.reiniciarSeleccionActividad();
        this.limpiarEstadoDisponibilidad();
        this.solicitudCreada = respuesta;
      },
      error: (error: { status?: number }) => {
        this.cargandoSolicitud = false;
        this.disponible = null;
        this.estadoDisponibilidad = 'error';
        const conflicto = error?.status === 409;
        this.mensajeDisponibilidad =
          obtenerMensajeErrorApi(error) ??
          (conflicto
            ? 'El espacio ya cuenta con una solicitud pendiente o una reserva en ese horario. Por favor selecciona otro horario o espacio.'
            : 'No se pudo crear la solicitud. Intenta nuevamente.');
        this.notificar(
          'error',
          conflicto ? 'Espacio no disponible' : 'No se pudo enviar la solicitud',
          this.mensajeDisponibilidad
        );
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

  private reiniciarSeleccionActividad(): void {
    this.responsableSeleccionadoId = null;
    this.tipoUsoSeleccionadoId = this.tiposUso.length > 0 ? this.tiposUso[0].id : null;
    this.tipoActividad = this.tiposUso.length > 0 ? this.tiposUso[0].nombre : '';
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