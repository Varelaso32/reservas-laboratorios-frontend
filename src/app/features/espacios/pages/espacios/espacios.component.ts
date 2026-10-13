import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SolicitudReservaComponent } from '../../../reservas/pages/solicitud-reserva/solicitud-reserva.component';
import { Espacio } from '../../../../shared/models/espacio.model';
import { EspaciosService } from '../../../../core/services/espacios.service';
import { AuthService } from '../../../../core/services/auth.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { obtenerColorIdentificadorEspacio } from '../../../../shared/utils/espacio-color.util';
import { PosSidebarComponent } from '../../../../shared/components/pos-sidebar/pos-sidebar.component';

@Component({
  selector: 'app-espacios',
  imports: [FormsModule, SolicitudReservaComponent, PosSidebarComponent],
  templateUrl: './espacios.component.html',
  styleUrl: './espacios.component.scss'
})
export class EspaciosComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly espaciosService = inject(EspaciosService);

  modalReservaAbierto = false;
  cargando = false;
  errorCarga: string | null = null;
  espacios: Espacio[] = [];
  espacioSeleccionado: Espacio | null = null;
  terminoBusqueda = '';

  get usuarioActual() {
    return this.authService.tieneSesionActiva()
      ? this.authService.obtenerUsuarioActual()
      : null;
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

  obtenerColorEspacio(espacioId: number): string {
    return obtenerColorIdentificadorEspacio(espacioId);
  }

  ngOnInit(): void {
    this.cargarEspacios();
  }

  cargarEspacios(): void {
    this.cargando = true;
    this.errorCarga = null;

    this.espaciosService.listar().subscribe({
      next: espacios => {
        this.espacios = espacios;
        this.cargando = false;
      },
      error: error => {
        this.errorCarga =
          obtenerMensajeErrorApi(error) ?? 'No se pudieron cargar los espacios. Intenta nuevamente.';
        this.cargando = false;
      }
    });
  }

  abrirReserva(espacio: Espacio): void {
    this.espacioSeleccionado = espacio;
    this.modalReservaAbierto = true;
  }

  get espaciosFiltrados(): Espacio[] {
    const termino = this.terminoBusqueda.trim().toLowerCase();
    if (!termino) {
      return this.espacios;
    }
    return this.espacios.filter(espacio => {
      const nombre = espacio.nombre.toLowerCase();
      const tipo = espacio.tipo.toLowerCase();
      const ubicacion = (espacio.ubicacion ?? '').toLowerCase();
      const capacidad = String(espacio.capacidad);
      const codigo = `l10${espacio.id}`;
      return (
        nombre.includes(termino) ||
        tipo.includes(termino) ||
        ubicacion.includes(termino) ||
        capacidad.includes(termino) ||
        codigo.includes(termino)
      );
    });
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
  }

  cerrarReserva(): void {
    this.modalReservaAbierto = false;
    this.espacioSeleccionado = null;
  }

}