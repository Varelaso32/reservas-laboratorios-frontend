import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AbstractControl } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { CampanaNotificacionesComponent } from '../../../../shared/components/campana-notificaciones/campana-notificaciones.component';
import { PosSidebarComponent } from '../../../../shared/components/pos-sidebar/pos-sidebar.component';
import { AuthService } from '../../../../core/services/auth.service';
import { SancionesService } from '../../../../core/services/sanciones.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { MiEstadoSancion, Strike } from '../../../../shared/models/sancion.model';

function confirmacionesCoinciden(grupo: AbstractControl): ValidationErrors | null {
  const claveNueva = grupo.get('claveNueva')?.value;
  const confirmacion = grupo.get('confirmacion')?.value;
  return claveNueva && confirmacion && claveNueva !== confirmacion
    ? { noCoincide: true }
    : null;
}

@Component({
  selector: 'app-configuracion',
  imports: [ReactiveFormsModule, FormsModule, Toast, PosSidebarComponent, CampanaNotificacionesComponent],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss'
})
export class ConfiguracionComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly sancionesService = inject(SancionesService);
  private readonly messageService = inject(MessageService);

  readonly usuario = this.authService.obtenerUsuarioActual();

  get inicialesUsuario(): string {
    const nombre = this.usuario?.nombre ?? '';
    return nombre
      .split(' ')
      .filter(parte => parte.length > 0)
      .slice(0, 2)
      .map(parte => parte[0])
      .join('')
      .toUpperCase();
  }

  readonly guardandoDatos = signal(false);
  readonly guardandoClave = signal(false);

  estadoSancion: MiEstadoSancion | null = null;
  cargandoSancion = false;
  errorSancion: string | null = null;
  justificacionGeneral = '';
  justificacionesStrike: Partial<Record<number, string>> = {};
  enviandoReactivacion = false;

  readonly formularioDatos = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)]]
  });

  readonly formularioClave = this.formBuilder.nonNullable.group(
    {
      claveActual: ['', [Validators.required]],
      claveNueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmacion: ['', [Validators.required]]
    },
    { validators: confirmacionesCoinciden }
  );

  ngOnInit(): void {
    this.formularioDatos.patchValue({
      nombre: this.usuario?.nombre ?? '',
      email: this.usuario?.email ?? ''
    });
    this.cargarSancion();
  }

  get strikesActivos(): Strike[] {
    return (this.estadoSancion?.strikes ?? []).filter(strike => !strike.anulado);
  }

  cargarSancion(): void {
    this.cargandoSancion = true;
    this.errorSancion = null;
    this.sancionesService.consultarMiEstado().subscribe({
      next: estado => {
        this.estadoSancion = estado;
        this.cargandoSancion = false;
      },
      error: error => {
        this.estadoSancion = null;
        this.cargandoSancion = false;
        this.errorSancion = obtenerMensajeErrorApi(error) ?? 'No se pudo consultar tu estado de sanciones.';
      }
    });
  }

  formatearFechaSancion(fecha: string | null): string {
    if (!fecha) {
      return '—';
    }
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return fecha;
    }
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Bogota'
    }).format(valor);
  }

  pedirReactivacion(): void {
    if (this.enviandoReactivacion || !this.estadoSancion) {
      return;
    }
    const justificacion = this.justificacionGeneral.trim();
    if (justificacion.length < 10) {
      this.notificar('info', 'Revisa la justificación', 'Cuéntanos qué pasó (mínimo 10 caracteres).');
      return;
    }
    const strikes = this.strikesActivos;
    if (strikes.length === 0) {
      return;
    }
    const faltantes = strikes.filter(
      strike => (this.justificacionesStrike[strike.id] ?? '').trim().length < 5
    );
    if (faltantes.length > 0) {
      this.notificar(
        'info',
        'Faltan justificaciones',
        'Explica por qué no asististe a cada una de las reservas (mínimo 5 caracteres).'
      );
      return;
    }

    this.enviandoReactivacion = true;
    this.sancionesService.pedirReactivacion({
      justificacion,
      strikes: strikes.map(strike => ({
        strike_id: strike.id,
        justificacion: (this.justificacionesStrike[strike.id] ?? '').trim()
      }))
    }).subscribe({
      next: () => {
        this.enviandoReactivacion = false;
        this.justificacionGeneral = '';
        this.justificacionesStrike = {};
        this.notificar(
          'success',
          'Solicitud enviada',
          'El Administrador del Sistema revisará tu reactivación.'
        );
        this.cargarSancion();
      },
      error: error => {
        this.enviandoReactivacion = false;
        this.notificar(
          'error',
          'No se pudo enviar la solicitud',
          obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.'
        );
      }
    });
  }

  get confirmacionNoCoincide(): boolean {
    const confirmacion = this.formularioClave.get('confirmacion');
    return this.formularioClave.hasError('noCoincide') && Boolean(confirmacion?.touched);
  }

  guardarDatos(): void {
    if (this.formularioDatos.invalid || this.guardandoDatos()) {
      this.formularioDatos.markAllAsTouched();
      return;
    }

    const usuario = this.usuario;
    if (!usuario) {
      return;
    }

    const { nombre, email } = this.formularioDatos.getRawValue();
    const cambios: Record<string, string> = {};
    if (nombre !== usuario.nombre) {
      cambios['nombre'] = nombre;
    }
    if (email.toLocaleLowerCase() !== usuario.email.toLocaleLowerCase()) {
      cambios['email'] = email;
    }

    if (Object.keys(cambios).length === 0) {
      this.notificar('info', 'Sin cambios', 'Modifica algún dato antes de guardar.');
      return;
    }

    this.guardandoDatos.set(true);
    this.usuariosService.actualizarMiCuenta(cambios).subscribe({
      next: () => {
        // La sesión guarda nombre/correo: se refresca para el sidebar y el perfil.
        this.authService.consultarUsuarioActual().subscribe({
          next: () => {
            this.guardandoDatos.set(false);
            this.notificar('success', 'Datos actualizados', 'Tu nombre y correo quedaron guardados.');
          },
          error: () => {
            this.guardandoDatos.set(false);
            this.notificar('success', 'Datos actualizados', 'Vuelve a iniciar sesión para verlos en tu perfil.');
          }
        });
      },
      error: error => {
        this.guardandoDatos.set(false);
        const mensaje = obtenerMensajeErrorApi(error) ?? 'No se pudo actualizar tu cuenta.';
        this.notificar('error', 'No se guardó', mensaje);
      }
    });
  }

  guardarClave(): void {
    if (this.formularioClave.invalid || this.guardandoClave()) {
      this.formularioClave.markAllAsTouched();
      return;
    }

    this.guardandoClave.set(true);
    const { claveActual, claveNueva } = this.formularioClave.getRawValue();
    this.usuariosService.cambiarMiClave({ clave_actual: claveActual, clave_nueva: claveNueva }).subscribe({
      next: respuesta => {
        this.guardandoClave.set(false);
        this.formularioClave.reset();
        this.notificar('success', 'Clave actualizada', respuesta.mensaje);
      },
      error: error => {
        this.guardandoClave.set(false);
        const mensaje = obtenerMensajeErrorApi(error) ?? 'No se pudo restablecer tu clave.';
        this.notificar('error', 'No se guardó', mensaje);
      }
    });
  }

  private notificar(gravedad: 'success' | 'error' | 'info', resumen: string, detalle: string): void {
    this.messageService.add({ key: 'configuracion', severity: gravedad, summary: resumen, detail: detalle });
  }
}
