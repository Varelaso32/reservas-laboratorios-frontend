import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import type { Cargo, Rol, Usuario } from '../../../../core/models/auth.models';
import type {
  ActualizarUsuarioRequest,
  CrearUsuarioRequest,
  UsuarioAdmin
} from '../../../../core/models/usuarios.model';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';

type FiltroUsuario = 'todos' | 'docentes' | 'estudiantes' | 'operadores';
type PerfilPresentacion = 'ESTUDIANTE' | 'DOCENTE' | 'DEPARTAMENTO' | 'OPERADOR' | 'ADMINISTRADOR';

interface FiltroOpcion {
  id: FiltroUsuario;
  etiqueta: string;
}

interface FormularioUsuario {
  nombre: string;
  email: string;
  password: string;
  perfil: PerfilPresentacion;
}

interface ConfiguracionPerfil {
  etiqueta: string;
  rol: Rol;
  cargo: Cargo;
  clase: string;
}

const PERFILES: Record<PerfilPresentacion, ConfiguracionPerfil> = {
  ESTUDIANTE: { etiqueta: 'Estudiante', rol: 'SOLICITANTE', cargo: 'ESTUDIANTE', clase: 'estudiante' },
  DOCENTE: { etiqueta: 'Docente', rol: 'SOLICITANTE', cargo: 'DOCENTE', clase: 'docente' },
  DEPARTAMENTO: { etiqueta: 'Departamento', rol: 'SOLICITANTE', cargo: 'ADMINISTRATIVO', clase: 'departamento' },
  OPERADOR: { etiqueta: 'Operador', rol: 'APROBADOR', cargo: 'ADMINISTRADOR_SALA', clase: 'operador' },
  ADMINISTRADOR: { etiqueta: 'Administrador', rol: 'ADMIN', cargo: 'ADMINISTRADOR_SISTEMA', clase: 'administrador' }
};


@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [FormsModule, RouterLink, Toast],
  templateUrl: './admin-usuarios.component.html',
  styleUrl: './admin-usuarios.component.scss'
})
export class AdminUsuariosComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  readonly filtros: FiltroOpcion[] = [
    { id: 'todos', etiqueta: 'Todos' },
    { id: 'docentes', etiqueta: 'Docentes' },
    { id: 'estudiantes', etiqueta: 'Estudiantes' },
    { id: 'operadores', etiqueta: 'Operadores' }
  ];
  readonly perfiles: PerfilPresentacion[] = ['ESTUDIANTE', 'DOCENTE', 'DEPARTAMENTO', 'OPERADOR', 'ADMINISTRADOR'];
  readonly tamanoPagina = 10;

  usuarios: UsuarioAdmin[] = [];
  totalUsuarios = 0;
  paginaActual = 0;
  filtroActual: FiltroUsuario = 'todos';
  cargando = false;
  errorCarga = '';
  modalAbierto = false;
  guardando = false;
  cargandoDetalle = false;
  usuarioEditandoId: number | null = null;
  menuUsuarioAbiertoId: number | null = null;
  estadoUsuarioVisual: 'Activo' | 'Inactivo' | 'Suspendido' = 'Activo';
  formulario: FormularioUsuario = this.formularioVacio();
  private usuariosFiltrados: UsuarioAdmin[] = [];
  private cargoUsuarioEditando: Cargo | null = null;
  private activoOriginalUsuario: boolean | null = null;

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  get usuarioActual(): Usuario | null {
    return this.authService.obtenerUsuarioActual();
  }

  get inicialesUsuario(): string {
    const nombre = this.usuarioActual?.nombre.trim();
    if (!nombre) {
      return '';
    }

    const partes = nombre.split(/\s+/).filter(Boolean);
    return partes.length === 1
      ? partes[0].slice(0, 2).toLocaleUpperCase()
      : `${partes[0][0]}${partes[partes.length - 1][0]}`.toLocaleUpperCase();
  }

  get primeraFila(): number {
    return this.totalUsuarios === 0 ? 0 : this.paginaActual * this.tamanoPagina + 1;
  }

  get ultimaFila(): number {
    return Math.min((this.paginaActual + 1) * this.tamanoPagina, this.totalUsuarios);
  }

  get hayPaginaAnterior(): boolean {
    return this.paginaActual > 0;
  }

  get hayPaginaSiguiente(): boolean {
    return this.ultimaFila < this.totalUsuarios;
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.errorCarga = '';

    if (this.filtroActual === 'todos') {
      this.usuariosService.listar({
        skip: this.paginaActual * this.tamanoPagina,
        limit: this.tamanoPagina
      }).subscribe({
        next: respuesta => {
          this.usuarios = respuesta.items;
          this.totalUsuarios = respuesta.total;
          this.cargando = false;
        },
        error: error => this.manejarErrorCarga(error)
      });
      return;
    }

    const rol = this.rolDeFiltroApi();
    this.usuariosService.listarTodas(rol).subscribe({
      next: usuarios => {
        this.usuariosFiltrados = usuarios.filter(usuario => this.coincideConFiltro(usuario));
        this.totalUsuarios = this.usuariosFiltrados.length;
        this.paginaActual = Math.min(
          this.paginaActual,
          Math.max(0, Math.ceil(this.totalUsuarios / this.tamanoPagina) - 1)
        );
        this.actualizarPaginaFiltrada();
        this.cargando = false;
      },
      error: error => this.manejarErrorCarga(error)
    });
  }

  seleccionarFiltro(filtro: FiltroUsuario): void {
    if (this.filtroActual === filtro) {
      return;
    }
    this.filtroActual = filtro;
    this.paginaActual = 0;
    this.cargarUsuarios();
  }

  irPaginaAnterior(): void {
    if (!this.hayPaginaAnterior || this.cargando) {
      return;
    }
    this.paginaActual--;
    this.cargarPaginaSeleccionada();
  }

  irPaginaSiguiente(): void {
    if (!this.hayPaginaSiguiente || this.cargando) {
      return;
    }
    this.paginaActual++;
    this.cargarPaginaSeleccionada();
  }

  abrirCrear(): void {
    this.usuarioEditandoId = null;
    this.cargoUsuarioEditando = null;
    this.activoOriginalUsuario = null;
    this.estadoUsuarioVisual = 'Activo';
    this.formulario = this.formularioVacio();
    this.modalAbierto = true;
  }

  abrirEditar(usuario: UsuarioAdmin): void {
    this.menuUsuarioAbiertoId = null;
    this.cargandoDetalle = true;
    this.usuariosService.obtenerPorId(usuario.id).subscribe({
      next: detalle => {
        this.usuarioEditandoId = detalle.id;
        this.cargoUsuarioEditando = detalle.cargo;
        this.activoOriginalUsuario = detalle.activo;
        this.estadoUsuarioVisual = detalle.activo ? 'Activo' : 'Inactivo';
        this.formulario = {
          nombre: detalle.nombre,
          email: detalle.email,
          password: '',
          perfil: this.perfilDeUsuario(detalle.rol, detalle.cargo)
        };
        this.modalAbierto = true;
        this.cargandoDetalle = false;
      },
      error: error => {
        this.cargandoDetalle = false;
        this.mostrarToast('error', 'No se pudo cargar el usuario', this.mensajeDeError(error));
      }
    });
  }

  cerrarModal(): void {
    if (!this.guardando) {
      this.modalAbierto = false;
    }
  }

  actualizarPerfil(perfil: PerfilPresentacion): void {
    this.formulario.perfil = perfil;
  }

  guardar(form: NgForm): void {
    if (!form.valid || this.guardando) {
      form.control.markAllAsTouched();
      return;
    }

    const perfil = PERFILES[this.formulario.perfil];
    const cargo = this.formulario.perfil === 'OPERADOR' &&
      (this.cargoUsuarioEditando === 'COORDINADOR_LABORATORIOS' ||
        this.cargoUsuarioEditando === 'ADMINISTRADOR_SALA')
      ? this.cargoUsuarioEditando
      : perfil.cargo;
    this.guardando = true;
    if (this.usuarioEditandoId === null) {
      if (!this.formulario.password.trim()) {
        this.guardando = false;
        form.control.markAllAsTouched();
        return;
      }
      const request: CrearUsuarioRequest = {
        nombre: this.formulario.nombre.trim(),
        email: this.formulario.email.trim(),
        clave: this.formulario.password,
        rol: perfil.rol,
        cargo
      };
      this.usuariosService.crear(request).subscribe({
        next: () => this.guardarFinalizado('Usuario creado correctamente.'),
        error: error => this.guardarFallido(error)
      });
      return;
    }

    const request: ActualizarUsuarioRequest = {
      nombre: this.formulario.nombre.trim(),
      email: this.formulario.email.trim(),
      rol: perfil.rol,
      cargo
    };
    const usuarioId = this.usuarioEditandoId;
    const nuevoActivo = this.estadoUsuarioVisual === 'Activo';
    const cambioEstado = this.activoOriginalUsuario !== null
      ? this.activoOriginalUsuario !== nuevoActivo
      : (this.usuarios.find(u => u.id === usuarioId)?.activo !== nuevoActivo);

    this.usuariosService.actualizar(usuarioId, request).subscribe({
      next: () => {
        if (cambioEstado) {
          this.usuariosService.cambiarEstado(usuarioId, { activo: nuevoActivo }).subscribe({
            next: () => this.guardarFinalizado('Usuario actualizado correctamente.'),
            error: () => this.guardarFinalizado('Usuario actualizado correctamente.')
          });
        } else {
          this.guardarFinalizado('Usuario actualizado correctamente.');
        }
      },
      error: (error: unknown) => this.guardarFallido(error)
    });
  }

  cambiarEstado(usuario: UsuarioAdmin): void {
    this.menuUsuarioAbiertoId = null;
    const nuevoEstado = !usuario.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    if (!window.confirm(`¿Deseas ${accion} a ${usuario.nombre}?`)) {
      return;
    }

    this.usuariosService.cambiarEstado(usuario.id, { activo: nuevoEstado }).subscribe({
      next: () => {
        this.mostrarToast('success', 'Estado actualizado', `El usuario fue ${nuevoEstado ? 'activado' : 'desactivado'}.`);
        this.cargarUsuarios();
      },
      error: error => this.mostrarToast('error', 'No se pudo cambiar el estado', this.mensajeDeError(error))
    });
  }

  etiquetaPerfil(rol: Rol, cargo: Cargo | null): string {
    return PERFILES[this.perfilDeUsuario(rol, cargo)].etiqueta;
  }

  etiquetaPerfilDePresentacion(perfil: PerfilPresentacion): string {
    return PERFILES[perfil].etiqueta;
  }

  clasePerfil(rol: Rol, cargo: Cargo | null): string {
    return `rol-${PERFILES[this.perfilDeUsuario(rol, cargo)].clase}`;
  }

  inicialesNombre(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length < 2) {
      return (partes[0] ?? '').slice(0, 2).toLocaleUpperCase();
    }
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toLocaleUpperCase();
  }

  alternarMenu(usuarioId: number): void {
    this.menuUsuarioAbiertoId = this.menuUsuarioAbiertoId === usuarioId ? null : usuarioId;
  }

  cerrarMenu(): void {
    this.menuUsuarioAbiertoId = null;
  }

  private perfilDeUsuario(rol: Rol, cargo: Cargo | null): PerfilPresentacion {
    if (rol === 'ADMIN') {
      return 'ADMINISTRADOR';
    }
    if (rol === 'APROBADOR') {
      return 'OPERADOR';
    }
    switch (cargo) {
      case 'DOCENTE':
        return 'DOCENTE';
      case 'ADMINISTRATIVO':
        return 'DEPARTAMENTO';
      default:
        return 'ESTUDIANTE';
    }
  }


  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  private cargarPaginaSeleccionada(): void {
    if (this.filtroActual === 'todos') {
      this.cargarUsuarios();
      return;
    }
    this.actualizarPaginaFiltrada();
  }

  private actualizarPaginaFiltrada(): void {
    const inicio = this.paginaActual * this.tamanoPagina;
    this.usuarios = this.usuariosFiltrados.slice(inicio, inicio + this.tamanoPagina);
  }

  private coincideConFiltro(usuario: UsuarioAdmin): boolean {
    switch (this.filtroActual) {
      case 'docentes':
        return usuario.rol === 'SOLICITANTE' && usuario.cargo === 'DOCENTE';
      case 'estudiantes':
        return usuario.rol === 'SOLICITANTE' && usuario.cargo === 'ESTUDIANTE';
      case 'operadores':
        return usuario.rol === 'APROBADOR';
      case 'todos':
        return true;
    }
  }

  private formularioVacio(): FormularioUsuario {
    return {
      nombre: '',
      email: '',
      password: '',
      perfil: 'ESTUDIANTE'
    };
  }

  private rolDeFiltroApi(): Rol | undefined {
    switch (this.filtroActual) {
      case 'docentes':
      case 'estudiantes':
        return 'SOLICITANTE';
      case 'operadores':
        return 'APROBADOR';
      case 'todos':
        return undefined;
    }
  }

  private guardarFinalizado(mensaje: string): void {
    this.guardando = false;
    this.modalAbierto = false;
    this.mostrarToast('success', 'Usuarios', mensaje);
    this.cargarUsuarios();
  }

  private guardarFallido(error: unknown): void {
    this.guardando = false;
    this.mostrarToast('error', 'No se pudo guardar el usuario', this.mensajeDeError(error));
  }

  private manejarErrorCarga(error: unknown): void {
    this.cargando = false;
    this.usuarios = [];
    this.totalUsuarios = 0;
    this.errorCarga = this.mensajeDeError(error);
    this.mostrarToast('error', 'No se pudieron cargar los usuarios', this.errorCarga);
  }

  private mensajeDeError(error: unknown): string {
    const apiMsg = obtenerMensajeErrorApi(error);
    if (apiMsg) {
      return apiMsg;
    }
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No fue posible conectar con el servidor.';
      }
    }
    return 'Inténtalo de nuevo.';
  }

  private mostrarToast(severity: 'success' | 'error', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail });
  }

}
