import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

@Component({
  selector: 'app-solicitud-reserva',
  imports: [ReactiveFormsModule],
  templateUrl: './solicitud-reserva.component.html',
  styleUrl: './solicitud-reserva.component.scss'
})
export class SolicitudReservaComponent {

  @Input() espacioNombre = '';
  @Input() piso = 0;

  @Output() cerrar = new EventEmitter<void>();

  tipoActividad = 'Clase';

  mensajeDisponibilidad = '';
  disponible = true;

  reservasMock = [
    {
      espacio: 'Lab. Redes',
      fecha: '2026-09-16',
      horaInicio: '09:00',
      horaFin: '11:00'
    },
    {
      espacio: 'Sala de Reuniones A',
      fecha: '2026-09-16',
      horaInicio: '14:00',
      horaFin: '16:00'
    }
  ];

  formReserva = new FormGroup({

    solicitante: new FormControl(
      '',
      Validators.required
    ),

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
        Validators.min(1)
      ]
    ),

    proposito: new FormControl(
      '',
      Validators.required
    )

  });

  seleccionarActividad(tipo: string) {
    this.tipoActividad = tipo;
  }

  cerrarModal() {
    this.cerrar.emit();
  }

  validarDisponibilidad() {

    const fecha = this.formReserva.value.fecha;
    const horaInicio = this.formReserva.value.horaInicio;
    const horaFin = this.formReserva.value.horaFin;

    console.log('--- VALIDACIÓN DE DISPONIBILIDAD ---');
    console.log('Espacio seleccionado:', this.espacioNombre);
    console.log('Fecha seleccionada:', fecha);
    console.log('Hora inicio:', horaInicio);
    console.log('Hora fin:', horaFin);

    if (!fecha || !horaInicio || !horaFin) {

      this.mensajeDisponibilidad = '';

      return;
    }

    const existeCruce = this.reservasMock.some(reserva => {

      const mismoEspacio =
        reserva.espacio === this.espacioNombre;

      const mismaFecha =
        reserva.fecha === fecha;

      const cruzaHorario =
        horaInicio < reserva.horaFin &&
        horaFin > reserva.horaInicio;

      console.log('Comparando contra:', reserva);
      console.log('Mismo espacio:', mismoEspacio);
      console.log('Misma fecha:', mismaFecha);
      console.log('Cruza horario:', cruzaHorario);

      return (
        mismoEspacio &&
        mismaFecha &&
        cruzaHorario
      );
    });

    console.log('¿Existe cruce?:', existeCruce);

    if (existeCruce) {

      this.disponible = false;

      this.mensajeDisponibilidad =
        'Este espacio no está disponible en el horario seleccionado.';

    } else {

      this.disponible = true;

      this.mensajeDisponibilidad =
        'El espacio está disponible en este horario.';
    }

  }

  confirmarReserva() {

    if (this.formReserva.invalid) {

      this.formReserva.markAllAsTouched();

      alert(
        'Completa todos los campos obligatorios antes de continuar.'
      );

      return;
    }

    this.validarDisponibilidad();

    if (!this.disponible) {

      alert(
        'No es posible reservar este espacio porque el horario seleccionado no está disponible.'
      );

      return;
    }

    const solicitudMock = {

      espacio: this.espacioNombre,

      piso: this.piso,

      solicitante:
        this.formReserva.value.solicitante,

      fecha:
        this.formReserva.value.fecha,

      horaInicio:
        this.formReserva.value.horaInicio,

      horaFin:
        this.formReserva.value.horaFin,

      asistentes:
        this.formReserva.value.asistentes,

      tipoActividad:
        this.tipoActividad,

      proposito:
        this.formReserva.value.proposito

    };

    console.log(
      'Solicitud creada:',
      solicitudMock
    );

    alert(
      'Solicitud de reserva creada correctamente.'
    );

    this.formReserva.reset();

    this.tipoActividad = 'Clase';

    this.mensajeDisponibilidad = '';

    this.disponible = true;

    this.cerrarModal();
  }
}