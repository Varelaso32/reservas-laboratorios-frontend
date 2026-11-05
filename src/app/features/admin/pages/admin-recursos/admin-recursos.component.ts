import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { AuthService } from '../../../../core/services/auth.service';
import { RecursosService } from '../../../../core/services/recursos.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import {
  EstadoRecurso,
  PrestamoRecurso,
  SolicitudRecurso,
  TipoRecurso
} from '../../../../shared/models/recurso.model';
import {
  fechaReservaColombia,
  horaReservaColombia
} from '../../../../shared/utils/fecha-colombia.util';
import { obtenerInicialesUsuario } from '../../../../shared/utils/usuario-iniciales.util';
import { CampanaNotificacionesComponent } from '../../../../shared/components/campana-notificaciones/campana-notificaciones.component';

type SeccionRecursos = 'catalogo' | 'solicitudes' | 'prestamos';

interface FormularioTipo {
  nombre: string;
  descripcion: string;
  cantidad: number;
}

interface DecisionEnCurso {
  solicitud: SolicitudRecurso;
  aprobando: boolean;
  motivo: string;
}

interface DevolucionEnCurso {
  prestamo: PrestamoRecurso;
  estado: EstadoRecurso;
  comentario: string;
}

/**
 * Catálogo de recursos con stock, solicitudes y préstamos (HU-43 a HU-46).
 * Vive dentro de Parámetros → Recursos. Solo para el Administrador del Sistema.
 */
@Component({
  selector: 'app-admin-recursos',
  imports: [FormsModule, RouterLink, RouterLinkActive, Toast, CampanaNotificacionesComponent],
  templateUrl: './admin-recursos.component.html',
  styleUrl: './admin-recursos.component.scss'
})
export class AdminRecursosComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly recursosService = inject(RecursosService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  seccion: SeccionRecursos = 'catalogo';
  cargando = true;
  error: string | null = null;
  procesando = false;
  parametrosAbierto = true;

  solicitudes: SolicitudRecurso[] = [];
  prestamos: PrestamoRecurso[] = [];
  tipos: TipoRecurso[] = [];

  filtroEstado = 'PENDIENTE';
  soloVigentes = true;

  // Diálogos
  decision: DecisionEnCurso | null = null;
  devolucion: DevolucionEnCurso | null = null;
  formularioTipo: FormularioTipo | null = null;
  tipoEnEdicion: TipoRecurso | null = null;
  guardando = false;

  ngOnInit(): void {
    this.cargar();
  }

  get inicialesUsuario(): string {
    return obtenerInicialesUsuario(this.authService.obtenerUsuarioActual()?.nombre);
  }

  get usuarioActual() {
    return this.authService.tieneSesionActiva()
      ? this.authService.obtenerUsuarioActual()
      : null;
  }

  alternarParametros(): void {
    this.parametrosAbierto = !this.parametrosAbierto;
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  get solicitudesFiltradas(): SolicitudRecurso[] {
    if (this.filtroEstado === 'TODAS') {
      return this.solicitudes;
    }
    return this.solicitudes.filter(solicitud => solicitud.estado === this.filtroEstado);
  }

  get pendientes(): number {
    return this.solicitudes.filter(solicitud => solicitud.estado === 'PENDIENTE').length;
  }

  get prestamosVigentes(): number {
    return this.prestamos.filter(
      prestamo => prestamo.estado === 'ASIGNADA' || prestamo.estado === 'ENTREGADA'
    ).length;
  }

  get unidadesActivas(): number {
    return this.tipos.reduce((total, tipo) => total + tipo.total, 0);
  }

  get unidadesInstaladas(): number {
    return this.tipos.reduce((total, tipo) => total + tipo.instalados, 0);
  }

  get prestamosFiltrados(): PrestamoRecurso[] {
    if (!this.soloVigentes) {
      return this.prestamos;
    }
    return this.prestamos.filter(
      prestamo => prestamo.estado === 'ASIGNADA' || prestamo.estado === 'ENTREGADA'
    );
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.recursosService.listarSolicitudes().subscribe({
      next: solicitudes => {
        this.solicitudes = solicitudes;
        this.cargando = false;
      },
      error: error => {
        this.cargando = false;
        this.error =
          obtenerMensajeErrorApi(error) ?? 'No se pudieron cargar las solicitudes de recursos.';
      }
    });
    this.cargarPrestamos();
    this.cargarTipos();
  }

  private cargarPrestamos(): void {
    this.recursosService.listarPrestamos().subscribe({
      next: prestamos => (this.prestamos = prestamos),
      error: () => undefined
    });
  }

  private cargarTipos(): void {
    this.recursosService.listarTipos().subscribe({
      next: tipos => (this.tipos = tipos),
      error: () => undefined
    });
  }

  cambiarSeccion(seccion: SeccionRecursos): void {
    this.seccion = seccion;
  }

  procesarRetrasos(): void {
    this.procesando = true;
    this.recursosService.procesarRetrasos().subscribe({
      next: resultado => {
        this.procesando = false;
        this.messageService.add({
          key: 'admin-recursos',
          severity: resultado.strikes > 0 ? 'warn' : 'success',
          summary: 'Barrido de devoluciones',
          detail:
            resultado.notificados === 0
              ? 'No hay devoluciones vencidas.'
              : `${resultado.notificados} devolución(es) tardía(s) y ${resultado.strikes} strike(s) generados.`
        });
        this.cargarPrestamos();
        this.cargarTipos();
      },
      error: error => {
        this.procesando = false;
        this.messageService.add({
          key: 'admin-recursos',
          severity: 'error',
          summary: 'No se pudo procesar',
          detail: obtenerMensajeErrorApi(error) ?? 'Intenta de nuevo.'
        });
      }
    });
  }

  /* ─── Decisiones de solicitudes (HU-45) ─── */
  abrirDecision(solicitud: SolicitudRecurso, aprobando: boolean): void {
    this.decision = { solicitud, aprobando, motivo: '' };
  }

  cerrarDecision(): void {
    this.decision = null;
  }

  confirmarDecision(): void {
    if (!this.decision || this.guardando) {
      return;
    }
    if (!this.decision.aprobando && !this.decision.motivo.trim()) {
      return;
    }
    const { solicitud, aprobando, motivo } = this.decision;
    this.guardando = true;
    this.recursosService
      .decidirSolicitud(solicitud.id, {
        aprobar: aprobando,
        motivo: aprobando ? null : motivo.trim()
      })
      .subscribe({
        next: actualizada => {
          this.guardando = false;
          this.decision = null;
          this.messageService.add({
            key: 'admin-recursos',
            severity: 'success',
            summary: aprobando ? 'Solicitud aprobada' : 'Solicitud rechazada',
            detail: `La solicitud #${actualizada.id} quedó ${this.nombreEstado(actualizada.estado).toLowerCase()}.`
          });
          this.reemplazarSolicitud(actualizada);
          this.cargarPrestamos();
          this.cargarTipos();
        },
        error: error => {
          this.guardando = false;
          this.messageService.add({
            key: 'admin-recursos',
            severity: 'error',
            summary: 'No se pudo decidir',
            detail: obtenerMensajeErrorApi(error) ?? 'Intenta de nuevo.'
          });
        }
      });
  }

  /* ─── Entrega y devolución (HU-46) ─── */
  registrarEntrega(prestamo: PrestamoRecurso): void {
    if (this.guardando) {
      return;
    }
    this.guardando = true;
    this.recursosService.registrarEntrega(prestamo.id).subscribe({
      next: solicitud => {
        this.guardando = false;
        this.messageService.add({
          key: 'admin-recursos',
          severity: 'success',
          summary: 'Entrega registrada',
          detail: `La unidad ${prestamo.codigo} salió del inventario.`
        });
        this.reemplazarSolicitud(solicitud);
        this.cargarPrestamos();
        this.cargarTipos();
      },
      error: error => {
        this.guardando = false;
        this.messageService.add({
          key: 'admin-recursos',
          severity: 'error',
          summary: 'No se pudo registrar la entrega',
          detail: obtenerMensajeErrorApi(error) ?? 'Intenta de nuevo.'
        });
      }
    });
  }

  abrirDevolucion(prestamo: PrestamoRecurso): void {
    this.devolucion = { prestamo, estado: 'EN_FUNCIONAMIENTO', comentario: '' };
  }

  cerrarDevolucion(): void {
    this.devolucion = null;
  }

  confirmarDevolucion(): void {
    if (!this.devolucion || this.guardando) {
      return;
    }
    const { prestamo, estado, comentario } = this.devolucion;
    this.guardando = true;
    this.recursosService
      .registrarDevolucion(prestamo.id, { estado, comentario: comentario.trim() || null })
      .subscribe({
        next: solicitud => {
          this.guardando = false;
          this.devolucion = null;
          this.messageService.add({
            key: 'admin-recursos',
            severity: 'success',
            summary: 'Devolución registrada',
            detail: `La unidad ${prestamo.codigo} volvió al inventario.`
          });
          this.reemplazarSolicitud(solicitud);
          this.cargarPrestamos();
          this.cargarTipos();
        },
        error: error => {
          this.guardando = false;
          this.messageService.add({
            key: 'admin-recursos',
            severity: 'error',
            summary: 'No se pudo registrar la devolución',
            detail: obtenerMensajeErrorApi(error) ?? 'Intenta de nuevo.'
          });
        }
      });
  }

  /* ─── Catálogo de recursos (HU-43) ─── */
  nuevoTipo(): void {
    this.tipoEnEdicion = null;
    this.formularioTipo = { nombre: '', descripcion: '', cantidad: 1 };
  }

  editarTipo(tipo: TipoRecurso): void {
    this.tipoEnEdicion = tipo;
    this.formularioTipo = {
      nombre: tipo.nombre,
      descripcion: tipo.descripcion ?? '',
      cantidad: tipo.total
    };
  }

  cerrarFormularioTipo(): void {
    this.formularioTipo = null;
    this.tipoEnEdicion = null;
  }

  guardarTipo(): void {
    const formulario = this.formularioTipo;
    if (!formulario || this.guardando || !formulario.nombre.trim()) {
      return;
    }
    if (!Number.isInteger(formulario.cantidad) || formulario.cantidad < 0) {
      this.messageService.add({
        key: 'admin-recursos',
        severity: 'warn',
        summary: 'Revisa la cantidad',
        detail: 'La cantidad debe ser un número entero igual o mayor que cero.'
      });
      return;
    }
    const datos = {
      nombre: formulario.nombre.trim(),
      descripcion: formulario.descripcion.trim() || null,
      cantidad: formulario.cantidad
    };
    const editando = this.tipoEnEdicion !== null;
    this.guardando = true;
    const peticion = this.tipoEnEdicion
      ? this.recursosService.actualizarTipo(this.tipoEnEdicion.id, datos)
      : this.recursosService.crearTipo(datos);
    peticion.subscribe({
      next: tipo => {
        this.guardando = false;
        this.formularioTipo = null;
        this.tipoEnEdicion = null;
        this.messageService.add({
          key: 'admin-recursos',
          severity: 'success',
          summary: editando ? 'Recurso actualizado' : 'Recurso creado',
          detail: `${tipo.nombre} · ${tipo.total} unidad(es)`
        });
        this.cargarTipos();
      },
      error: error => {
        this.guardando = false;
        this.messageService.add({
          key: 'admin-recursos',
          severity: 'error',
          summary: 'No se pudo guardar el recurso',
          detail: obtenerMensajeErrorApi(error) ?? 'Revisa los datos.'
        });
      }
    });
  }

  alternarActivoTipo(tipo: TipoRecurso): void {
    if (this.guardando) {
      return;
    }
    this.guardando = true;
    this.recursosService.actualizarTipo(tipo.id, { activo: !tipo.activo }).subscribe({
      next: actualizado => {
        this.guardando = false;
        this.messageService.add({
          key: 'admin-recursos',
          severity: 'success',
          summary: actualizado.activo ? 'Recurso activado' : 'Recurso desactivado',
          detail: actualizado.nombre
        });
        this.cargarTipos();
      },
      error: error => {
        this.guardando = false;
        this.messageService.add({
          key: 'admin-recursos',
          severity: 'error',
          summary: 'No se pudo cambiar el recurso',
          detail: obtenerMensajeErrorApi(error) ?? 'Intenta de nuevo.'
        });
      }
    });
  }

  /* ─── Utilidades de presentación ─── */
  private reemplazarSolicitud(actualizada: SolicitudRecurso): void {
    this.solicitudes = this.solicitudes.map(solicitud =>
      solicitud.id === actualizada.id ? actualizada : solicitud
    );
  }

  franja(inicio: string | null, fin: string | null): string {
    if (!inicio || !fin) {
      return '';
    }
    return (
      `${fechaReservaColombia(inicio)} · ` +
      `${horaReservaColombia(inicio)} a ${horaReservaColombia(fin)}`
    );
  }

  nombreEstado(estado: string): string {
    const nombres: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      APROBADA: 'Aprobada',
      RECHAZADA: 'Rechazada',
      CANCELADA: 'Cancelada',
      DEVUELTA: 'Devuelta'
    };
    return nombres[estado] ?? estado;
  }

  claseEstadoSolicitud(estado: string): string {
    return `badge-estado estado-${estado.toLowerCase()}`;
  }

  nombreEstadoPrestamo(estado: string): string {
    const nombres: Record<string, string> = {
      ASIGNADA: 'Asignada',
      ENTREGADA: 'Entregada',
      DEVUELTA: 'Devuelta',
      CANCELADA: 'Cancelada'
    };
    return nombres[estado] ?? estado;
  }

  claseEstadoPrestamo(estado: string): string {
    return `badge-estado estado-${estado.toLowerCase()}`;
  }

  vencido(prestamo: PrestamoRecurso): boolean {
    return (
      prestamo.estado === 'ENTREGADA' && new Date(prestamo.fin).getTime() < Date.now()
    );
  }
}
