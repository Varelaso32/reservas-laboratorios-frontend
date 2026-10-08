import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { EspaciosService } from '../../../../core/services/espacios.service';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { Espacio, EspacioActualizar, EspacioMetrica, TipoEspacio } from '../../../../shared/models/espacio.model';
import { obtenerColorIdentificadorEspacio } from '../../../../shared/utils/espacio-color.util';
import { EstadoDetalleSolicitud, SolicitudPendiente, SolicitudResuelta } from '../../../../shared/models/solicitud.model';
import { SolicitudesEspacioModalComponent } from '../../../solicitudes/components/solicitudes-espacio-modal/solicitudes-espacio-modal.component';
import { fechaColombia, fechaReservaColombia } from '../../../../shared/utils/fecha-colombia.util';

@Component({
  selector: 'app-admin-espacios',
  imports: [FormsModule, RouterLink, Toast, SolicitudesEspacioModalComponent],
  templateUrl: './admin-espacios.component.html',
  styleUrl: './admin-espacios.component.scss'
})
export class AdminEspaciosComponent implements OnDestroy, OnInit {
  private readonly authService = inject(AuthService);
  private readonly espaciosService = inject(EspaciosService);
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private detalleSubscription = new Subscription();
  private aprobacionSubscription: Subscription | null = null;

  readonly columnas = 8;
  espacios: Espacio[] = [];
  cargandoEspacios = false;
  errorEspacios: string | null = null;
  metricas = new Map<number, EspacioMetrica>();
  cargandoMetricas = false;
  errorMetricas: string | null = null;
  readonly fechaMetricas = fechaColombia(new Date());
  estadosEspacios = new Map<number, boolean>();
  estadosPersonalizadosEspacios = new Map<number, string>();
  conteosPendientes = new Map<number, number>();
  cargandoConteos = false;
  errorConteos = false;
  espacioSeleccionado: Espacio | null = null;
  solicitudes: SolicitudPendiente[] = [];
  cargandoSolicitudes = false;
  errorSolicitudes: string | null = null;
  detallesSolicitudes = new Map<number, EstadoDetalleSolicitud>();
  aprobandoSolicitudId: number | null = null;
  solicitudRechazoId: number | null = null;
  rechazandoSolicitudId: number | null = null;
  private rechazoSubscription: Subscription | null = null;
  espacioEnEdicion: Espacio | null = null;
  formularioEspacio = this.formularioVacio();
  guardandoEspacio = false;
  espacioCambioEstado: Espacio | null = null;
  actualizandoEstadoId: number | null = null;
  solicitudesResueltas: SolicitudResuelta[] = [];
  cargandoResueltas = false;
  errorResueltas: string | null = null;
  readonly paletaColoresFigma = [
    '#3b82f6', // azul
    '#22c55e', // verde
    '#a855f7', // morado
    '#f97316', // naranja
    '#ef4444', // rojo
    '#06b6d4', // cian
    '#8b5cf6', // violeta
    '#84cc16', // lima
    '#f59e0b', // ambar
    '#ec4899'  // rosa
  ];

  readonly amenidadesFigma = [
    'Proyector', 'Pizarra', 'TV', 'Videoconf.', 'Café', 'AC', 'Micrófono', 'GPU', 'Wifi'
  ];

  codigoEspacioVisual = '';
  edificioEspacioVisual = 'A';
  pisoEspacioVisual = 'Piso 1';
  estadoEspacioVisual: 'Activo' | 'Mantenimiento' = 'Activo';
  colorSeleccionadoVisual = '#3b82f6';
  amenidadesSeleccionadasVisual: string[] = ['Proyector', 'Pizarra', 'TV'];

  modalCrearEspacioAbierto = false;
  creandoEspacio = false;
  formularioNuevoEspacio = {
    codigo: '',
    edificio: 'A',
    nombre: '',
    piso: 'Piso 1',
    capacidad: 20,
    estado: 'Activo' as 'Activo' | 'Mantenimiento'
  };
  colorNuevoEspacioVisual = '#3b82f6';
  amenidadesNuevoEspacioVisual: string[] = [];

  filtrosHistorial: { estado?: 'APROBADA' | 'RECHAZADA'; fecha_desde?: string; fecha_hasta?: string } = {};

  get usuarioActual() {
    return this.authService.obtenerUsuarioActual();
  }

  get puedeConsultarSolicitudes(): boolean {
    return this.usuarioActual?.rol === 'APROBADOR';
  }

  get esAdministrador(): boolean {
    return this.usuarioActual?.rol === 'ADMIN';
  }

  get esCoordinador(): boolean {
    return this.usuarioActual?.rol === 'APROBADOR';
  }

  get tienePermisoAdminPanel(): boolean {
    return this.esAdministrador || this.esCoordinador;
  }

  get puedeVerHistorial(): boolean {
    return this.puedeConsultarSolicitudes || this.esAdministrador;
  }

  get inicialesUsuario(): string {
    const nombre = this.usuarioActual?.nombre.trim();
    if (!nombre) {
      return '';
    }

    const partes = nombre.split(/\s+/).filter(Boolean);
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toLocaleUpperCase();
    }

    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toLocaleUpperCase();
  }

  ngOnInit(): void {
    this.cargarEspacios();
    if (this.esAdministrador) {
      this.cargarMetricas();
    }
    if (this.puedeConsultarSolicitudes) {
      this.cargarConteosPendientes();
    }
  }

  cargarEspacios(): void {
    this.cargandoEspacios = true;
    this.errorEspacios = null;
    const solicitud = this.esAdministrador
      ? this.espaciosService.listarAdmin()
      : this.espaciosService.listar();
    solicitud.subscribe({
      next: espacios => {
        this.espacios = espacios;
        this.estadosEspacios = new Map(espacios.map(espacio => [
          espacio.id,
          'activo' in espacio && typeof espacio.activo === 'boolean' ? espacio.activo : true
        ]));
        this.cargandoEspacios = false;
      },
      error: error => {
        this.errorEspacios = obtenerMensajeErrorApi(error) ??
          'No se pudieron cargar los espacios. Intenta nuevamente.';
        this.cargandoEspacios = false;
      }
    });
  }

  cargarMetricas(): void {
    if (!this.esAdministrador) {
      return;
    }
    this.cargandoMetricas = true;
    this.errorMetricas = null;
    this.espaciosService.consultarMetricas(this.fechaMetricas).subscribe({
      next: metricas => {
        this.metricas = new Map(metricas.map(metrica => [metrica.id, metrica]));
        this.estadosEspacios = new Map(metricas.map(metrica => [metrica.id, metrica.activo]));
        this.cargandoMetricas = false;
      },
      error: error => {
        this.cargandoMetricas = false;
        this.errorMetricas = obtenerMensajeErrorApi(error) ??
          'No se pudieron cargar las métricas. Intenta nuevamente.';
      }
    });
  }

  obtenerMetrica(espacioId: number): EspacioMetrica | undefined {
    return this.metricas.get(espacioId);
  }

  obtenerReservasHoy(espacioId: number): string | number {
    if (this.cargandoMetricas) {
      return '…';
    }
    const metrica = this.obtenerMetrica(espacioId);
    return metrica?.reservas_dia ?? 0;
  }

  obtenerOcupacion(espacioId: number): string {
    if (this.cargandoMetricas) {
      return '…';
    }
    if (!this.estaActivo(espacioId)) {
      return '—';
    }
    const porcentaje = this.obtenerMetrica(espacioId)?.porcentaje_ocupacion;
    return porcentaje === null || porcentaje === undefined ? '0%' : `${porcentaje}%`;
  }

  ocupacionNoDisponible(espacioId: number): boolean {
    return !this.estaActivo(espacioId);
  }

  obtenerAnchoOcupacion(espacioId: number): string | null {
    if (!this.estaActivo(espacioId)) {
      return null;
    }
    const porcentaje = this.obtenerMetrica(espacioId)?.porcentaje_ocupacion;
    return porcentaje === null || porcentaje === undefined
      ? '0%'
      : `${Math.max(0, Math.min(100, porcentaje))}%`;
  }

  estaActivo(espacioId: number): boolean {
    return this.estadosEspacios.get(espacioId) ?? true;
  }

  etiquetaEstadoEspacio(espacioId: number): string {
    const personalizado = this.estadosPersonalizadosEspacios.get(espacioId);
    if (personalizado) {
      return personalizado;
    }
    const activo = this.estaActivo(espacioId);
    return activo ? 'Activo' : 'Inactivo';
  }

  cargarConteosPendientes(): void {
    if (!this.puedeConsultarSolicitudes) {
      return;
    }

    this.cargandoConteos = true;
    this.errorConteos = false;
    this.solicitudesService.consultarPendientes().subscribe({
      next: solicitudes => {
        const conteos = new Map<number, number>();
        for (const solicitud of solicitudes) {
          if (solicitud.estado === 'PENDIENTE') {
            const espacioId = solicitud.espacio.id;
            conteos.set(espacioId, (conteos.get(espacioId) ?? 0) + 1);
          }
        }
        this.conteosPendientes = conteos;
        this.cargandoConteos = false;
      },
      error: () => {
        this.conteosPendientes = new Map();
        this.errorConteos = true;
        this.cargandoConteos = false;
      }
    });
  }

  obtenerConteoPendientes(espacioId: number): number {
    return this.conteosPendientes.get(espacioId) ?? 0;
  }

  obtenerColorEspacio(espacioId: number): string {
    return obtenerColorIdentificadorEspacio(espacioId);
  }

  verSolicitudes(espacio: Espacio): void {
    if (!this.puedeVerHistorial && !this.puedeConsultarSolicitudes) {
      return;
    }

    this.cancelarCargasDetalle();
    this.espacioSeleccionado = espacio;
    this.solicitudes = [];
    this.solicitudesResueltas = [];
    this.errorSolicitudes = null;
    this.errorResueltas = null;
    this.filtrosHistorial = {};
    this.cargandoSolicitudes = this.puedeConsultarSolicitudes;
    if (this.puedeVerHistorial) {
      this.cargarSolicitudesResueltas(espacio.id);
    }

    if (!this.puedeConsultarSolicitudes) {
      return;
    }
    this.solicitudesService.consultarPendientes(espacio.id).subscribe({
      next: solicitudes => {
        this.solicitudes = solicitudes.filter(
          solicitud => solicitud.espacio.id === espacio.id && solicitud.estado === 'PENDIENTE'
        );
        this.cargandoSolicitudes = false;
        this.aprobandoSolicitudId = null;
        this.cargarDetallesSolicitudes(this.solicitudes);
      },
      error: error => {
        this.errorSolicitudes = obtenerMensajeErrorApi(error) ??
          (error.status === 403
            ? 'No tienes permiso para consultar estas solicitudes.'
            : 'No se pudieron cargar las solicitudes pendientes. Intenta nuevamente.');
        this.cargandoSolicitudes = false;
        this.aprobandoSolicitudId = null;
      }
    });
  }

  cambiarFiltrosHistorial(filtros: { estado?: 'APROBADA' | 'RECHAZADA'; fecha_desde?: string; fecha_hasta?: string }): void {
    this.filtrosHistorial = filtros;
    if (this.espacioSeleccionado) {
      this.cargarSolicitudesResueltas(this.espacioSeleccionado.id);
    }
  }

  private cargarSolicitudesResueltas(espacioId: number): void {
    if (!this.puedeVerHistorial) {
      return;
    }
    this.cargandoResueltas = true;
    this.errorResueltas = null;
    this.solicitudesService.consultarResueltas(espacioId, this.filtrosHistorial).subscribe({
      next: solicitudes => {
        this.solicitudesResueltas = solicitudes.filter(solicitud =>
          solicitud.estado === 'APROBADA' || solicitud.estado === 'RECHAZADA'
        );
        this.cargandoResueltas = false;
      },
      error: error => {
        this.errorResueltas = obtenerMensajeErrorApi(error) ??
          (error.status === 403
            ? 'No tienes permiso para consultar el historial de este espacio.'
            : 'No se pudo cargar el historial. Intenta nuevamente.');
        this.cargandoResueltas = false;
      }
    });
  }

  abrirEdicion(espacio: Espacio): void {
    if (!this.tienePermisoAdminPanel || this.guardandoEspacio) {
      return;
    }
    this.espacioEnEdicion = espacio;
    this.formularioEspacio = {
      nombre: espacio.nombre,
      tipo: espacio.tipo,
      capacidad: espacio.capacidad,
      ubicacion: espacio.ubicacion ?? ''
    };
    this.codigoEspacioVisual = `L10${espacio.id}`;
    this.colorSeleccionadoVisual = this.obtenerColorEspacio(espacio.id);
    const estaActivoEspacio = this.estaActivo(espacio.id);
    const estadoGuardado = this.estadosPersonalizadosEspacios.get(espacio.id);
    this.estadoEspacioVisual = estadoGuardado === 'Mantenimiento' || (!estadoGuardado && estaActivoEspacio === false)
      ? 'Mantenimiento'
      : 'Activo';

    // Parsear o inferir edificio y piso desde la ubicación si contiene texto tipo "Bloque A, piso 2" o "Ed. A - Piso 1"
    const ubicacion = espacio.ubicacion ?? '';
    const matchEdificio = ubicacion.match(/(?:Ed\.|Bloque|Edificio)\s*([A-Za-z0-9]+)/i);
    this.edificioEspacioVisual = matchEdificio ? matchEdificio[1].toUpperCase() : 'A';
    const matchPiso = ubicacion.match(/(?:Piso|piso)\s*([0-9]+)/i);
    this.pisoEspacioVisual = matchPiso ? `Piso ${matchPiso[1]}` : 'Piso 1';
  }

  alternarAmenidadVisual(amenidad: string): void {
    if (this.amenidadesSeleccionadasVisual.includes(amenidad)) {
      this.amenidadesSeleccionadasVisual = this.amenidadesSeleccionadasVisual.filter(a => a !== amenidad);
    } else {
      this.amenidadesSeleccionadasVisual = [...this.amenidadesSeleccionadasVisual, amenidad];
    }
  }

  seleccionarColorVisual(color: string): void {
    this.colorSeleccionadoVisual = color;
  }

  cancelarEdicion(): void {
    if (!this.guardandoEspacio) {
      this.espacioEnEdicion = null;
    }
  }

  abrirCrearEspacio(): void {
    if (!this.tienePermisoAdminPanel) {
      return;
    }
    this.formularioNuevoEspacio = {
      codigo: '',
      edificio: 'A',
      nombre: '',
      piso: 'Piso 1',
      capacidad: 20,
      estado: 'Activo'
    };
    this.colorNuevoEspacioVisual = '#3b82f6';
    this.amenidadesNuevoEspacioVisual = [];
    this.modalCrearEspacioAbierto = true;
  }

  cerrarCrearEspacio(): void {
    if (!this.creandoEspacio) {
      this.modalCrearEspacioAbierto = false;
    }
  }

  seleccionarColorNuevoEspacio(color: string): void {
    this.colorNuevoEspacioVisual = color;
  }

  alternarAmenidadNuevoEspacio(amenidad: string): void {
    if (this.amenidadesNuevoEspacioVisual.includes(amenidad)) {
      this.amenidadesNuevoEspacioVisual = this.amenidadesNuevoEspacioVisual.filter(a => a !== amenidad);
    } else {
      this.amenidadesNuevoEspacioVisual = [...this.amenidadesNuevoEspacioVisual, amenidad];
    }
  }

  guardarNuevoEspacio(): void {
    if (!this.tienePermisoAdminPanel || this.creandoEspacio) {
      return;
    }
    const nombre = this.formularioNuevoEspacio.nombre.trim();
    const capacidad = this.formularioNuevoEspacio.capacidad;
    if (!nombre || !Number.isInteger(capacidad) || capacidad < 1) {
      this.messageService.add({
        key: 'admin-espacios',
        severity: 'warn',
        summary: 'Revisa los datos',
        detail: 'El nombre es obligatorio y la capacidad debe ser un número entero mayor que cero.',
        life: 5000
      });
      return;
    }

    this.creandoEspacio = true;
    const payload = {
      nombre,
      tipo: 'LABORATORIO' as TipoEspacio,
      capacidad,
      ubicacion: `Ed. ${this.formularioNuevoEspacio.edificio} - ${this.formularioNuevoEspacio.piso}`
    };

    this.espaciosService.crear(payload).subscribe({
      next: espacioCreado => {
        this.creandoEspacio = false;
        this.modalCrearEspacioAbierto = false;
        if (this.formularioNuevoEspacio.estado === 'Mantenimiento' && espacioCreado?.id) {
          this.estadosPersonalizadosEspacios.set(espacioCreado.id, 'Mantenimiento');
        }
        this.messageService.add({
          key: 'admin-espacios',
          severity: 'success',
          summary: 'Espacio creado',
          detail: 'El espacio fue creado correctamente.',
          life: 5000
        });
        this.recargarDatosAdmin();
      },
      error: error => {
        this.creandoEspacio = false;
        const mensajeBackend = obtenerMensajeErrorApi(error);
        const detalle = error.status === 405 || error.status === 404
          ? 'El backend no soporta la creación de espacios en el contrato actual (POST /api/v1/espacios/).'
          : mensajeBackend ?? 'No se pudo crear el espacio. Intenta nuevamente.';
        this.messageService.add({
          key: 'admin-espacios',
          severity: error.status === 405 || error.status === 404 ? 'warn' : 'error',
          summary: error.status === 405 || error.status === 404 ? 'Acción no soportada en backend' : 'Error al crear espacio',
          detail: detalle,
          life: 6000
        });
      }
    });
  }

  guardarEdicion(): void {
    const actual = this.espacioEnEdicion;
    if (!this.tienePermisoAdminPanel || !actual || this.guardandoEspacio) {
      return;
    }
    const cambios: EspacioActualizar = {};
    const nombre = this.formularioEspacio.nombre.trim();
    const ubicacion = this.formularioEspacio.ubicacion.trim() || null;
    if (!nombre || !Number.isInteger(this.formularioEspacio.capacidad) || this.formularioEspacio.capacidad < 1) {
      this.messageService.add({
        key: 'admin-espacios',
        severity: 'warn',
        summary: 'Revisa los datos',
        detail: 'El nombre es obligatorio y la capacidad debe ser un número entero mayor que cero.',
        life: 5000
      });
      return;
    }
    if (nombre !== actual.nombre) cambios.nombre = nombre;
    if (this.formularioEspacio.tipo !== actual.tipo) cambios.tipo = this.formularioEspacio.tipo;
    if (this.formularioEspacio.capacidad !== actual.capacidad) cambios.capacidad = this.formularioEspacio.capacidad;
    if (ubicacion !== actual.ubicacion) cambios.ubicacion = ubicacion;
    const activoActual = this.estaActivo(actual.id);
    const nuevoActivo = this.estadoEspacioVisual === 'Activo';
    const cambioEstado = activoActual !== null && activoActual !== nuevoActivo;
    const estadoAnterior = this.estadosPersonalizadosEspacios.get(actual.id) ?? (activoActual === false ? 'Inactivo' : 'Activo');
    const cambioVisual = estadoAnterior !== this.estadoEspacioVisual;

    if (Object.keys(cambios).length === 0 && !cambioEstado && !cambioVisual) {
      this.espacioEnEdicion = null;
      return;
    }

    this.guardandoEspacio = true;

    const finalizarExito = () => {
      this.guardandoEspacio = false;
      this.estadosPersonalizadosEspacios.set(actual.id, this.estadoEspacioVisual);
      this.espacioEnEdicion = null;
      this.messageService.add({
        key: 'admin-espacios',
        severity: 'success',
        summary: 'Espacio actualizado',
        detail: 'Los cambios se guardaron correctamente.',
        life: 5000
      });
      this.recargarDatosAdmin();
    };

    if (Object.keys(cambios).length > 0) {
      this.espaciosService.actualizar(actual.id, cambios).subscribe({
        next: () => {
          if (cambioEstado) {
            this.espaciosService.actualizarEstado(actual.id, { activo: nuevoActivo }).subscribe({
              next: () => finalizarExito(),
              error: () => finalizarExito()
            });
          } else {
            finalizarExito();
          }
        },
        error: error => {
          const estado = error.status;
          this.guardandoEspacio = false;
          this.messageService.add({
            key: 'admin-espacios',
            severity: estado === 409 ? 'warn' : 'error',
            summary: estado === 404
              ? 'Espacio no encontrado'
              : estado === 409
                ? 'No se pueden guardar los cambios'
                : 'Error al actualizar el espacio',
            detail: estado === 404
              ? 'El espacio ya no existe.'
              : obtenerMensajeErrorApi(error) ??
                (estado === 409
                  ? 'El nombre ya está en uso o la capacidad no es compatible.'
                  : estado === 422
                    ? 'Verifica los datos ingresados.'
                    : 'No se pudo actualizar el espacio. Intenta nuevamente.'),
            life: 5000
          });
        }
      });
    } else if (cambioEstado) {
      this.espaciosService.actualizarEstado(actual.id, { activo: nuevoActivo }).subscribe({
        next: () => finalizarExito(),
        error: error => {
          this.guardandoEspacio = false;
          this.messageService.add({
            key: 'admin-espacios',
            severity: 'error',
            summary: 'Error al cambiar estado',
            detail: obtenerMensajeErrorApi(error) ?? 'No se pudo actualizar el estado del espacio.',
            life: 5000
          });
        }
      });
    } else if (cambioVisual) {
      finalizarExito();
    }
  }

  abrirConfirmacionEstado(espacio: Espacio): void {
    if (this.tienePermisoAdminPanel && this.actualizandoEstadoId === null) {
      this.espacioCambioEstado = espacio;
    }
  }

  cerrarConfirmacionEstado(): void {
    if (this.actualizandoEstadoId === null) {
      this.espacioCambioEstado = null;
    }
  }

  confirmarCambioEstado(): void {
    const espacio = this.espacioCambioEstado;
    const activo = this.estaActivo(espacio?.id ?? -1);
    if (!this.tienePermisoAdminPanel || !espacio || activo === null || this.actualizandoEstadoId !== null) {
      return;
    }
    const nuevoEstado = !activo;
    this.actualizandoEstadoId = espacio.id;
    this.espaciosService.actualizarEstado(espacio.id, { activo: nuevoEstado }).subscribe({
      next: () => {
        this.actualizandoEstadoId = null;
        this.espacioCambioEstado = null;
        this.estadosPersonalizadosEspacios.delete(espacio.id);
        this.messageService.add({
          key: 'admin-espacios',
          severity: 'success',
          summary: nuevoEstado ? 'Espacio activado' : 'Espacio desactivado',
          detail: nuevoEstado
            ? 'El espacio está disponible para nuevas solicitudes.'
            : 'El espacio ya no acepta nuevas solicitudes; las reservas existentes se conservan.',
          life: 5000
        });
        this.recargarDatosAdmin();
      },
      error: error => {
        this.actualizandoEstadoId = null;
        this.messageService.add({
          key: 'admin-espacios',
          severity: 'error',
          summary: 'Error al cambiar el estado',
          detail: obtenerMensajeErrorApi(error) ?? 'No se pudo cambiar el estado del espacio.',
          life: 5000
        });
      }
    });
  }

  private recargarDatosAdmin(): void {
    this.cargarEspacios();
    this.cargarMetricas();
  }

  private formularioVacio(): { nombre: string; tipo: TipoEspacio; capacidad: number; ubicacion: string } {
    return { nombre: '', tipo: 'LABORATORIO', capacidad: 1, ubicacion: '' };
  }

  aprobarSolicitud(solicitudId: number): void {
    if (
      !this.puedeConsultarSolicitudes ||
      this.aprobandoSolicitudId !== null ||
      !this.solicitudes.some(solicitud => solicitud.id === solicitudId && solicitud.estado === 'PENDIENTE')
    ) {
      return;
    }

    const espacio = this.espacioSeleccionado;
    if (!espacio) {
      return;
    }

    this.aprobandoSolicitudId = solicitudId;
    this.aprobacionSubscription = this.solicitudesService.aprobarSolicitud(solicitudId).subscribe({
      next: () => {
        this.messageService.add({
          key: 'solicitudes-acciones',
          severity: 'success',
          summary: 'Reserva aprobada',
          detail: 'La solicitud fue aprobada correctamente.',
          life: 5000
        });
        this.cargarConteosPendientes();
        if (this.espacioSeleccionado?.id === espacio.id) {
          this.verSolicitudes(espacio);
        } else {
          this.aprobandoSolicitudId = null;
        }
        this.aprobacionSubscription = null;
      },
      error: error => {
        const conflicto = error instanceof HttpErrorResponse && error.status === 409;
        const mensaje = obtenerMensajeErrorApi(error) ??
          (conflicto
            ? 'La solicitud ya no puede aprobarse.'
            : 'No se pudo aprobar la solicitud. Intenta nuevamente.');
        this.messageService.add({
          key: 'solicitudes-acciones',
          severity: conflicto ? 'warn' : 'error',
          summary: conflicto ? 'No se pudo aprobar la solicitud' : 'Error al aprobar la solicitud',
          detail: mensaje,
          life: 5000
        });
        this.aprobandoSolicitudId = null;
        this.aprobacionSubscription = null;
      }
    });
  }

  abrirDialogoRechazo(solicitudId: number): void {
    if (
      this.puedeConsultarSolicitudes &&
      this.rechazandoSolicitudId === null &&
      this.solicitudes.some(solicitud => solicitud.id === solicitudId && solicitud.estado === 'PENDIENTE')
    ) {
      this.solicitudRechazoId = solicitudId;
    }
  }

  cancelarRechazo(): void {
    if (this.rechazandoSolicitudId === null) {
      this.solicitudRechazoId = null;
    }
  }

  rechazarSolicitud(solicitudId: number, motivo: string): void {
    if (
      !this.puedeConsultarSolicitudes ||
      this.rechazandoSolicitudId !== null ||
      this.solicitudRechazoId !== solicitudId ||
      !this.solicitudes.some(solicitud => solicitud.id === solicitudId && solicitud.estado === 'PENDIENTE')
    ) {
      return;
    }

    const espacio = this.espacioSeleccionado;
    const motivoLimpio = motivo.trim();
    if (!espacio || !motivoLimpio || motivoLimpio.length > 500) {
      return;
    }

    this.rechazandoSolicitudId = solicitudId;
    this.rechazoSubscription = this.solicitudesService.rechazarSolicitud(solicitudId, motivoLimpio).subscribe({
      next: () => {
        this.messageService.add({
          key: 'solicitudes-acciones',
          severity: 'success',
          summary: 'Solicitud rechazada',
          detail: 'La solicitud fue rechazada correctamente.',
          life: 5000
        });
        this.solicitudRechazoId = null;
        this.rechazandoSolicitudId = null;
        this.cargarConteosPendientes();
        if (this.espacioSeleccionado?.id === espacio.id) {
          this.verSolicitudes(espacio);
        }
        this.rechazoSubscription = null;
      },
      error: error => {
        const conflicto = error instanceof HttpErrorResponse && error.status === 409;
        const mensaje = obtenerMensajeErrorApi(error) ??
          (conflicto
            ? 'La solicitud ya no está pendiente.'
            : 'No se pudo rechazar la solicitud. Intenta nuevamente.');
        this.messageService.add({
          key: 'solicitudes-acciones',
          severity: conflicto ? 'warn' : 'error',
          summary: conflicto ? 'No se pudo rechazar la solicitud' : 'Error al rechazar la solicitud',
          detail: mensaje,
          life: 5000
        });
        this.rechazandoSolicitudId = null;
        this.rechazoSubscription = null;
      }
    });
  }

  cerrarSolicitudes(): void {
    this.cancelarCargasDetalle();
    this.cancelarRechazo();
    this.espacioSeleccionado = null;
    this.solicitudes = [];
    this.errorSolicitudes = null;
  }

  ngOnDestroy(): void {
    this.cancelarCargasDetalle();
    this.aprobacionSubscription?.unsubscribe();
    this.rechazoSubscription?.unsubscribe();
  }

  private cargarDetallesSolicitudes(solicitudes: SolicitudPendiente[]): void {
    this.cancelarCargasDetalle();
    this.detallesSolicitudes = new Map(solicitudes.map(solicitud => [
      solicitud.id,
      { detalle: null, cargando: true, error: null }
    ]));

    for (const solicitud of solicitudes) {
      const subscription = this.solicitudesService.obtenerDetalle(solicitud.id).subscribe({
        next: detalle => {
          this.actualizarEstadoDetalle(solicitud.id, {
            detalle,
            cargando: false,
            error: null
          });
        },
        error: error => {
          const mensaje = obtenerMensajeErrorApi(error) ??
            'No se pudo cargar el detalle de la solicitud.';
          this.actualizarEstadoDetalle(solicitud.id, {
            detalle: null,
            cargando: false,
            error: mensaje
          });
          this.messageService.add({
            severity: 'error',
            summary: 'Error al cargar una solicitud',
            detail: mensaje,
            life: 5000
          });
        }
      });
      this.detalleSubscription.add(subscription);
    }
  }

  private actualizarEstadoDetalle(solicitudId: number, estado: EstadoDetalleSolicitud): void {
    this.detallesSolicitudes = new Map(this.detallesSolicitudes).set(solicitudId, estado);
  }

  private cancelarCargasDetalle(): void {
    this.detalleSubscription.unsubscribe();
    this.detalleSubscription = new Subscription();
    this.detallesSolicitudes = new Map();
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}