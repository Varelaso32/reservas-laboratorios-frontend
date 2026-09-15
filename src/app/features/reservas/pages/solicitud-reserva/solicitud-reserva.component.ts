import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-solicitud-reserva',
  imports: [ReactiveFormsModule],
  templateUrl: './solicitud-reserva.component.html',
  styleUrl: './solicitud-reserva.component.scss'
})
export class SolicitudReservaComponent {


formReserva = new FormGroup({
  solicitante: new FormControl('', Validators.required),

  fecha: new FormControl('', Validators.required),

  horaInicio: new FormControl('', Validators.required),

  horaFin: new FormControl('', Validators.required),

  asistentes: new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(1)
  ]),

  proposito: new FormControl('', Validators.required)
});  
  @Input() espacioNombre = '';
  @Input() piso = 0;

  @Output() cerrar = new EventEmitter<void>();

  tipoActividad = 'Clase';

  seleccionarActividad(tipo: string) {
    this.tipoActividad = tipo;
  }

  cerrarModal() {
    this.cerrar.emit();
  }

 confirmarReserva() {

  if (this.formReserva.invalid) {
    this.formReserva.markAllAsTouched();

    alert('Completa todos los campos obligatorios antes de continuar.');

    return;
  }

  const solicitudMock = {
    espacio: this.espacioNombre,
    piso: this.piso,
    solicitante: this.formReserva.value.solicitante,
    fecha: this.formReserva.value.fecha,
    horaInicio: this.formReserva.value.horaInicio,
    horaFin: this.formReserva.value.horaFin,
    asistentes: this.formReserva.value.asistentes,
    tipoActividad: this.tipoActividad,
    proposito: this.formReserva.value.proposito
  };

  console.log('Solicitud creada:', solicitudMock);

  alert('Solicitud de reserva creada correctamente.');

  this.formReserva.reset();

  this.tipoActividad = 'Clase';

  this.cerrarModal();
}
}