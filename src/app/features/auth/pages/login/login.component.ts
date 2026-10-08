import { Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';

const passwordsMatchValidator = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmarPassword')?.value;
  return !confirmation || password === confirmation ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  vista: 'login' | 'registro' = 'login';
  mostrarPasswordLogin = false;
  mostrarPasswordRegistro = false;
  mostrarConfirmacionRegistro = false;

  readonly formLogin = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  readonly formRegistro = new FormGroup(
    {
      nombre: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email]
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)]
      }),
      confirmarPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      })
    },
    { validators: [passwordsMatchValidator] }
  );

  cargando = false;
  cargandoRegistro = false;
  mensajeError: string | null = null;
  mensajeRegistro: string | null = null;
  errorRegistro: string | null = null;

  cambiarVista(vista: 'login' | 'registro'): void {
    this.vista = vista;
    this.mensajeError = null;
    this.mensajeRegistro = null;
    this.errorRegistro = null;
  }

  iniciarSesion(): void {
    this.mensajeError = null;
    if (this.formLogin.invalid) {
      this.formLogin.markAllAsTouched();
      return;
    }

    this.cargando = true;
    const { email, password } = this.formLogin.getRawValue();

    this.authService.login(email, password).subscribe({
      next: () => {
        this.cargando = false;
        void this.router.navigateByUrl('/espacios');
      },
      error: error => {
        this.cargando = false;
        this.mensajeError = obtenerMensajeErrorApi(error);
      }
    });
  }

  solicitarAcceso(): void {
    this.mensajeRegistro = null;
    this.errorRegistro = null;
    if (this.formRegistro.invalid) {
      this.formRegistro.markAllAsTouched();
      return;
    }

    this.cargandoRegistro = true;
    const { nombre, email, password } = this.formRegistro.getRawValue();

    this.authService.registro({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      clave: password
    }).subscribe({
      next: () => {
        this.authService.login(email.trim().toLowerCase(), password).subscribe({
          next: () => {
            this.cargandoRegistro = false;
            void this.router.navigateByUrl('/espacios');
          },
          error: () => {
            this.cargandoRegistro = false;
            this.formLogin.patchValue({ email: email.trim().toLowerCase(), password });
            this.cambiarVista('login');
            this.mensajeRegistro = '¡Cuenta creada con éxito! Inicia sesión con tus credenciales.';
          }
        });
      },
      error: error => {
        this.cargandoRegistro = false;
        this.errorRegistro = obtenerMensajeErrorApi(error) ??
          'No se pudo crear la cuenta. Verifica que el correo pertenezca a @ecci.edu.co.';
      }
    });
  }
}