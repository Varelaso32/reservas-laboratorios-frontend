import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { AuthService } from '../../../../core/services/auth.service';
import { ConfiguracionService } from '../../../../core/services/configuracion.service';
import { EspaciosService } from '../../../../core/services/espacios.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import {
  AnticipacionRol,
  ReglasEspacio,
  ReglasEspacioActualizar,
  RegistroConfiguracion,
  TipoUso
} from '../../../../shared/models/configuracion.model';
import { EspacioAdmin, TipoEspacio } from '../../../../shared/models/espacio.model';
import { AccionNivel, AccionNivelSancion } from '../../../../shared/models/sancion.model';
import { SancionesService } from '../../../../core/services/sanciones.service';
import { obtenerInicialesUsuario } from '../../../../shared/utils/usuario-iniciales.util';
import { CampanaNotificacionesComponent } from '../../../../shared/components/campana-notificaciones/campana-notificaciones.component';

interface FormularioReglas {
  horaApertura: string;
  horaCierre: string;
  dias: number[];
  maxUsosDia: number | null;
  duracionMaximaMin: number | null;
  separacionMin: number;
  ocupacionMinima: number | null;
  requiereResponsable: boolean;
  admiteAutorizacionEspecial: boolean;
  tiposUsoIds: number[];
}

type SeccionParametros = 'reglas' | 'tipos-uso' | 'anticipacion' | 'sanciones' | 'recursos' | 'historial';

interface FormularioSancion {
  toleranciaMinutos: number;
  avisoMinutos: number;
  minutosPorStrike: number;
  maxStrikes: number;
  acciones: AccionNivel[];
}

interface EnlaceParametros {
  seccion: SeccionParametros;
  etiqueta: string;
  ruta: string;
  icono: string;
}

/**
 * Parámetros del sistema (HU-21, HU-22, HU-32, HU-35, HU-36 y HU-37).
 * Cada pantalla de parametrización es una ruta propia dentro de /admin/parametros.
 * Solo para el Administrador del Sistema.
 */
@Component({
  selector: 'app-admin-parametros',
  imports: [FormsModule, RouterLink, RouterLinkActive, Toast, CampanaNotificacionesComponent],
  templateUrl: './admin-parametros.component.html',
  styleUrl: './admin-parametros.component.scss'
})
export class AdminParametrosComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly espaciosService = inject(EspaciosService);
  private readonly sancionesService = inject(SancionesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly enlacesParametros: EnlaceParametros[] = [
    { seccion: 'reglas', etiqueta: 'Reglas de reserva', ruta: '/admin/parametros/reglas', icono: 'pi-calendar-times' },
    { seccion: 'tipos-uso', etiqueta: 'Tipos de uso', ruta: '/admin/parametros/tipos-uso', icono: 'pi-tags' },
    { seccion: 'anticipacion', etiqueta: 'Anticipación', ruta: '/admin/parametros/anticipacion', icono: 'pi-clock' },
    { seccion: 'sanciones', etiqueta: 'Sanciones', ruta: '/admin/parametros/sanciones', icono: 'pi-shield' },
    { seccion: 'recursos', etiqueta: 'Recursos', ruta: '/admin/parametros/recursos', icono: 'pi-box' },
    { seccion: 'historial', etiqueta: 'Historial', ruta: '/admin/parametros/historial', icono: 'pi-history' }
  ];

  readonly diasSemana = [
    { valor: 1, nombre: 'Lun' },
    { valor: 2, nombre: 'Mar' },
    { valor: 3, nombre: 'Mié' },
    { valor: 4, nombre: 'Jue' },
    { valor: 5, nombre: 'Vie' },
    { valor: 6, nombre: 'Sáb' },
    { valor: 7, nombre: 'Dom' }
  ];

  readonly nombresRol: Record<string, string> = {
    ESTUDIANTE: 'Estudiante',
    DOCENTE: 'Docente',
    COORDINADOR: 'Coordinador',
    DIRECTOR: 'Director'
  };

  readonly seccion: SeccionParametros;
  /**
   * Este componente solo se monta dentro de /admin/parametros/*, así que el grupo
   * arranca abierto para que se vea en qué pantalla de parámetros está el usuario.
   */
  parametrosAbierto = true;

  espacios: EspacioAdmin[] = [];
  cargandoEspacios = false;
  errorEspacios: string | null = null;

  espacioSeleccionadoId: number | null = null;
  reglas: ReglasEspacio | null = null;
  cargandoReglas = false;
  errorReglas: string | null = null;
  guardandoReglas = false;
  aplicandoPorTipo = false;

  formulario: FormularioReglas = this.formularioVacio();

  tiposUso: TipoUso[] = [];
  cargandoTiposUso = false;
  nuevoTipoUso = '';
  creandoTipoUso = false;
  tipoUsoEnEdicionId: number | null = null;

  anticipacion: AnticipacionRol[] = [];
  cargandoAnticipacion = false;
  guardandoRol: string | null = null;

  parametrosSancion: FormularioSancion = this.formularioSancionVacio();
  cargandoSancion = false;
  guardandoSancion = false;
  actualizadoSancionEn: string | null = null;

  historial: RegistroConfiguracion[] = [];
  cargandoHistorial = false;

  constructor() {
    const seccion = this.route.snapshot.data['seccion'] as SeccionParametros | undefined;
    this.seccion = seccion ?? 'reglas';
  }

  get usuarioActual() {
    return this.authService.obtenerUsuarioActual();
  }

  get inicialesUsuario(): string {
    return obtenerInicialesUsuario(this.usuarioActual?.nombre);
  }

  get esAdministrador(): boolean {
    return this.usuarioActual?.rol === 'ADMIN';
  }

  get espacioSeleccionado(): EspacioAdmin | undefined {
    return this.espacios.find(espacio => espacio.id === this.espacioSeleccionadoId);
  }

  get tituloSeccion(): string {
    switch (this.seccion) {
      case 'tipos-uso':
        return 'Tipos de uso';
      case 'anticipacion':
        return 'Anticipación por rol';
      case 'sanciones':
        return 'Tolerancia y sanciones';
      case 'recursos':
        return 'Recursos y amenidades';
      case 'historial':
        return 'Historial de cambios';
      default:
        return 'Reglas de reserva';
    }
  }

  get descripcionSeccion(): string {
    switch (this.seccion) {
      case 'tipos-uso':
        return 'Catálogo de actividades que se pueden asignar a cada espacio. Un tipo inactivo deja de ofrecerse en el formulario de solicitud.';
      case 'anticipacion':
        return 'Días máximos con los que cada nivel de usuario puede reservar hacia el futuro.';
      case 'sanciones':
        return 'Minutos de tolerancia para registrar la asistencia, aviso previo y strikes que bloquean nuevas solicitudes.';
      case 'recursos':
        return 'Catálogo de recursos con su stock: las unidades se instalan como amenidades en los espacios o se prestan a una reserva.';
      case 'historial':
        return 'Quién cambió qué y cuándo sobre la configuración del sistema.';
      default:
        return 'Horarios, límites y condiciones que se validan al crear cada solicitud. Los cambios aplican a las solicitudes nuevas.';
    }
  }

  get migaSeccion(): string {
    return `Parámetros · ${this.tituloSeccion}`;
  }

  ngOnInit(): void {
    if (!this.esAdministrador) {
      return;
    }

    if (this.seccion === 'reglas') {
      this.cargarEspacios();
      this.cargarTiposUso();
    } else if (this.seccion === 'tipos-uso') {
      this.cargarTiposUso();
    } else if (this.seccion === 'anticipacion') {
      this.cargarAnticipacion();
    } else if (this.seccion === 'sanciones') {
      this.cargarSanciones();
    } else {
      this.cargarEspacios();
      this.cargarHistorial();
    }
  }

  alternarParametros(): void {
    this.parametrosAbierto = !this.parametrosAbierto;
  }

  // ------------------------------------------------------------------------- //
  // Espacios y reglas
  // ------------------------------------------------------------------------- //
  cargarEspacios(): void {
    this.cargandoEspacios = true;
    this.errorEspacios = null;
    this.espaciosService.listarAdmin().subscribe({
      next: espacios => {
        this.espacios = espacios;
        this.cargandoEspacios = false;
        if (this.seccion !== 'reglas') {
          return;
        }
        const primero = espacios.find(espacio => espacio.activo) ?? espacios[0];
        if (primero) {
          this.seleccionarEspacio(primero.id);
        }
      },
      error: error => {
        this.errorEspacios =
          obtenerMensajeErrorApi(error) ?? 'No se pudieron cargar los espacios.';
        this.cargandoEspacios = false;
      }
    });
  }

  seleccionarEspacio(espacioId: number): void {
    if (this.guardandoReglas) {
      return;
    }
    this.espacioSeleccionadoId = espacioId;
    this.cargarReglas(espacioId);
  }

  cargarReglas(espacioId: number): void {
    this.cargandoReglas = true;
    this.errorReglas = null;
    this.configuracionService.consultarReglas(espacioId).subscribe({
      next: reglas => {
        this.reglas = reglas;
        this.formulario = {
          horaApertura: this.horaCorta(reglas.hora_apertura),
          horaCierre: this.horaCorta(reglas.hora_cierre),
          dias: [...reglas.dias_operacion],
          maxUsosDia: reglas.max_usos_dia,
          duracionMaximaMin: reglas.duracion_maxima_min,
          separacionMin: reglas.separacion_min,
          ocupacionMinima: reglas.ocupacion_minima,
          requiereResponsable: reglas.requiere_responsable,
          admiteAutorizacionEspecial: reglas.admite_autorizacion_especial,
          tiposUsoIds: reglas.tipos_uso.map(tipo => tipo.id)
        };
        this.cargandoReglas = false;
      },
      error: error => {
        this.reglas = null;
        this.errorReglas =
          obtenerMensajeErrorApi(error) ?? 'No se pudieron cargar las reglas del espacio.';
        this.cargandoReglas = false;
      }
    });
  }

  alternarDia(dia: number): void {
    this.formulario.dias = this.formulario.dias.includes(dia)
      ? this.formulario.dias.filter(valor => valor !== dia)
      : [...this.formulario.dias, dia].sort((a, b) => a - b);
  }

  alternarTipoUso(tipoId: number): void {
    this.formulario.tiposUsoIds = this.formulario.tiposUsoIds.includes(tipoId)
      ? this.formulario.tiposUsoIds.filter(valor => valor !== tipoId)
      : [...this.formulario.tiposUsoIds, tipoId];
  }

  guardarReglas(): void {
    const espacioId = this.espacioSeleccionadoId;
    if (!espacioId || this.guardandoReglas) {
      return;
    }
    const cuerpo = this.construirCuerpo();
    if (!cuerpo) {
      return;
    }

    this.guardandoReglas = true;
    this.configuracionService.actualizarReglas(espacioId, cuerpo).subscribe({
      next: reglas => {
        this.reglas = reglas;
        this.guardandoReglas = false;
        this.notificar('success', 'Reglas guardadas', 'Los cambios aplican a las solicitudes nuevas.');
      },
      error: error => {
        this.guardandoReglas = false;
        this.notificar(
          'error',
          'No se pudieron guardar las reglas',
          obtenerMensajeErrorApi(error) ?? 'Revisa los datos e intenta nuevamente.'
        );
      }
    });
  }

  aplicarAlTipo(): void {
    const espacio = this.espacioSeleccionado;
    if (!espacio || this.aplicandoPorTipo || this.guardandoReglas) {
      return;
    }
    const cuerpo = this.construirCuerpo();
    if (!cuerpo) {
      return;
    }

    this.aplicandoPorTipo = true;
    this.configuracionService.aplicarPorTipo(espacio.tipo as TipoEspacio, cuerpo).subscribe({
      next: reglas => {
        this.aplicandoPorTipo = false;
        this.notificar(
          'success',
          'Reglas aplicadas al tipo',
          `Se actualizaron ${reglas.length} espacio(s) de tipo ${espacio.tipo}.`
        );
        this.cargarReglas(espacio.id);
      },
      error: error => {
        this.aplicandoPorTipo = false;
        this.notificar(
          'error',
          'No se pudieron aplicar las reglas',
          obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.'
        );
      }
    });
  }

  private construirCuerpo(): ReglasEspacioActualizar | null {
    if (this.formulario.dias.length === 0) {
      this.notificar('warn', 'Revisa las reglas', 'Selecciona al menos un día de operación.');
      return null;
    }
    if (this.formulario.horaApertura && !this.formulario.horaCierre) {
      this.notificar('warn', 'Revisa las reglas', 'La franja necesita hora de apertura y de cierre.');
      return null;
    }
    if (this.formulario.horaCierre && !this.formulario.horaApertura) {
      this.notificar('warn', 'Revisa las reglas', 'La franja necesita hora de apertura y de cierre.');
      return null;
    }
    if (
      this.formulario.horaApertura &&
      this.formulario.horaCierre &&
      this.formulario.horaCierre <= this.formulario.horaApertura
    ) {
      this.notificar('warn', 'Revisa las reglas', 'La hora de cierre debe ser posterior a la de apertura.');
      return null;
    }

    return {
      hora_apertura: this.formulario.horaApertura || null,
      hora_cierre: this.formulario.horaCierre || null,
      dias_operacion: [...this.formulario.dias].sort((a, b) => a - b),
      max_usos_dia: this.formulario.maxUsosDia,
      duracion_maxima_min: this.formulario.duracionMaximaMin,
      separacion_min: this.formulario.separacionMin ?? 0,
      ocupacion_minima: this.formulario.ocupacionMinima,
      requiere_responsable: this.formulario.requiereResponsable,
      admite_autorizacion_especial: this.formulario.admiteAutorizacionEspecial,
      tipos_uso_ids: [...this.formulario.tiposUsoIds]
    };
  }

  // ------------------------------------------------------------------------- //
  // Tipos de uso (HU-22)
  // ------------------------------------------------------------------------- //
  cargarTiposUso(): void {
    this.cargandoTiposUso = true;
    this.configuracionService.listarTiposUso(true).subscribe({
      next: tipos => {
        this.tiposUso = tipos;
        this.cargandoTiposUso = false;
      },
      error: () => {
        this.tiposUso = [];
        this.cargandoTiposUso = false;
      }
    });
  }

  crearTipoUso(): void {
    const nombre = this.nuevoTipoUso.trim();
    if (!nombre || this.creandoTipoUso) {
      return;
    }
    this.creandoTipoUso = true;
    this.configuracionService.crearTipoUso({ nombre }).subscribe({
      next: () => {
        this.creandoTipoUso = false;
        this.nuevoTipoUso = '';
        this.notificar('success', 'Tipo de uso creado', `"${nombre}" ya se puede asignar a los espacios.`);
        this.cargarTiposUso();
      },
      error: error => {
        this.creandoTipoUso = false;
        this.notificar(
          'error',
          'No se pudo crear el tipo de uso',
          obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.'
        );
      }
    });
  }

  alternarActivoTipoUso(tipo: TipoUso): void {
    if (this.tipoUsoEnEdicionId !== null) {
      return;
    }
    this.tipoUsoEnEdicionId = tipo.id;
    this.configuracionService.actualizarTipoUso(tipo.id, { activo: !tipo.activo }).subscribe({
      next: actualizado => {
        this.tipoUsoEnEdicionId = null;
        this.tiposUso = this.tiposUso.map(item => (item.id === actualizado.id ? actualizado : item));
        this.notificar(
          'success',
          actualizado.activo ? 'Tipo de uso activado' : 'Tipo de uso desactivado',
          actualizado.activo
            ? 'Vuelve a aparecer en el formulario de solicitud.'
            : 'Deja de aparecer en el formulario; las solicitudes existentes lo conservan.'
        );
      },
      error: error => {
        this.tipoUsoEnEdicionId = null;
        this.notificar(
          'error',
          'No se pudo actualizar el tipo de uso',
          obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.'
        );
      }
    });
  }

  // ------------------------------------------------------------------------- //
  // Anticipación por rol (HU-37)
  // ------------------------------------------------------------------------- //
  cargarAnticipacion(): void {
    this.cargandoAnticipacion = true;
    this.configuracionService.consultarAnticipacion().subscribe({
      next: anticipacion => {
        this.anticipacion = anticipacion;
        this.cargandoAnticipacion = false;
      },
      error: () => {
        this.anticipacion = [];
        this.cargandoAnticipacion = false;
      }
    });
  }

  guardarAnticipacion(item: AnticipacionRol): void {
    if (this.guardandoRol !== null) {
      return;
    }
    const dias = item.dias_maximos === null || item.dias_maximos === undefined
      ? null
      : Number(item.dias_maximos);
    if (dias !== null && (!Number.isInteger(dias) || dias <= 0)) {
      this.notificar('warn', 'Revisa la anticipación', 'Debe ser un número entero mayor que cero.');
      return;
    }

    this.guardandoRol = item.rol;
    this.configuracionService.actualizarAnticipacion(item.rol, dias).subscribe({
      next: actualizado => {
        this.guardandoRol = null;
        this.anticipacion = this.anticipacion.map(valor =>
          valor.rol === actualizado.rol ? actualizado : valor
        );
        this.notificar(
          'success',
          'Anticipación actualizada',
          actualizado.dias_maximos === null
            ? `${this.nombresRol[actualizado.rol]} ya no tiene límite de anticipación.`
            : `${this.nombresRol[actualizado.rol]} puede reservar con ${actualizado.dias_maximos} días de anticipación.`
        );
      },
      error: error => {
        this.guardandoRol = null;
        this.notificar(
          'error',
          'No se pudo actualizar la anticipación',
          obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.'
        );
      }
    });
  }

  // ------------------------------------------------------------------------- //
  // Tolerancia y sanciones (HU-39, HU-40 y HU-41)
  // ------------------------------------------------------------------------- //
  cargarSanciones(): void {
    this.cargandoSancion = true;
    this.sancionesService.consultarParametros().subscribe({
      next: parametros => {
        this.parametrosSancion = {
          toleranciaMinutos: parametros.tolerancia_minutos,
          avisoMinutos: parametros.aviso_minutos,
          minutosPorStrike: parametros.minutos_por_strike,
          maxStrikes: parametros.max_strikes,
          acciones: parametros.acciones.map(accion => ({ ...accion }))
        };
        this.actualizadoSancionEn = parametros.actualizado_en;
        this.cargandoSancion = false;
      },
      error: error => {
        this.cargandoSancion = false;
        this.notificar(
          'error',
          'No se pudo cargar la política',
          obtenerMensajeErrorApi(error) ?? 'Intenta nuevamente.'
        );
      }
    });
  }

  agregarAccionSancion(): void {
    const nivel = this.parametrosSancion.acciones.length + 1;
    this.parametrosSancion.acciones = [
      ...this.parametrosSancion.acciones,
      { nivel, accion: 'ADVERTENCIA' }
    ];
  }

  quitarAccionSancion(indice: number): void {
    this.parametrosSancion.acciones = this.parametrosSancion.acciones.filter(
      (_, posicion) => posicion !== indice
    );
  }

  guardarSanciones(): void {
    if (this.guardandoSancion) {
      return;
    }
    const { toleranciaMinutos, avisoMinutos, minutosPorStrike, maxStrikes, acciones } =
      this.parametrosSancion;

    if (toleranciaMinutos <= 0 || minutosPorStrike <= 0 || maxStrikes <= 0) {
      this.notificar('warn', 'Revisa la política', 'Tolerancia, minutos por strike y máximo de strikes deben ser mayores que cero.');
      return;
    }
    if (avisoMinutos < 0 || avisoMinutos >= toleranciaMinutos) {
      this.notificar('warn', 'Revisa la política', 'Los minutos de aviso deben ser menores que la tolerancia.');
      return;
    }
    const niveles = acciones.map(accion => accion.nivel);
    if (new Set(niveles).size !== niveles.length) {
      this.notificar('warn', 'Revisa la política', 'No se puede repetir el nivel de strikes.');
      return;
    }
    if (niveles.some(nivel => nivel > maxStrikes || nivel < 1)) {
      this.notificar('warn', 'Revisa la política', 'Cada nivel debe estar entre 1 y el máximo de strikes.');
      return;
    }

    this.guardandoSancion = true;
    this.sancionesService.actualizarParametros({
      tolerancia_minutos: toleranciaMinutos,
      aviso_minutos: avisoMinutos,
      minutos_por_strike: minutosPorStrike,
      max_strikes: maxStrikes,
      acciones: acciones.map(accion => ({ ...accion }))
    }).subscribe({
      next: parametros => {
        this.guardandoSancion = false;
        this.actualizadoSancionEn = parametros.actualizado_en;
        this.notificar(
          'success',
          'Política actualizada',
          'Aplica a los retrasos futuros; los strikes ya registrados no cambian.'
        );
      },
      error: error => {
        this.guardandoSancion = false;
        this.notificar(
          'error',
          'No se pudo guardar la política',
          obtenerMensajeErrorApi(error) ?? 'Revisa los datos e intenta nuevamente.'
        );
      }
    });
  }

  accionLegible(accion: AccionNivelSancion): string {
    return accion === 'BLOQUEO' ? 'Bloqueo de solicitudes' : 'Solo advertencia';
  }

  // ------------------------------------------------------------------------- //
  // Historial (HU-36.8, HU-37.6)
  // ------------------------------------------------------------------------- //
  cargarHistorial(): void {
    this.cargandoHistorial = true;
    this.configuracionService.consultarHistorial(undefined, 20).subscribe({
      next: historial => {
        this.historial = historial;
        this.cargandoHistorial = false;
      },
      error: () => {
        this.historial = [];
        this.cargandoHistorial = false;
      }
    });
  }

  nombreRol(rol: string): string {
    return this.nombresRol[rol] ?? rol;
  }

  nombreEspacio(espacioId: number | null): string {
    if (espacioId === null) {
      return 'General';
    }
    return this.espacios.find(espacio => espacio.id === espacioId)?.nombre ?? `Espacio #${espacioId}`;
  }

  fechaHistorial(fecha: string): string {
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

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  private horaCorta(valor: string | null): string {
    return valor ? valor.slice(0, 5) : '';
  }

  private formularioVacio(): FormularioReglas {
    return {
      horaApertura: '',
      horaCierre: '',
      dias: [1, 2, 3, 4, 5, 6, 7],
      maxUsosDia: null,
      duracionMaximaMin: null,
      separacionMin: 0,
      ocupacionMinima: null,
      requiereResponsable: false,
      admiteAutorizacionEspecial: false,
      tiposUsoIds: []
    };
  }

  private formularioSancionVacio(): FormularioSancion {
    return {
      toleranciaMinutos: 10,
      avisoMinutos: 5,
      minutosPorStrike: 10,
      maxStrikes: 3,
      acciones: [
        { nivel: 1, accion: 'ADVERTENCIA' },
        { nivel: 2, accion: 'ADVERTENCIA' },
        { nivel: 3, accion: 'BLOQUEO' }
      ]
    };
  }

  private notificar(severity: 'success' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ key: 'admin-parametros', severity, summary, detail, life: 5000 });
  }
}
