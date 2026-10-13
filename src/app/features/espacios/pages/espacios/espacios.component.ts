import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SolicitudReservaComponent } from '../../../reservas/pages/solicitud-reserva/solicitud-reserva.component';
import { Espacio } from '../../../../shared/models/espacio.model';
import { EspaciosService } from '../../../../core/services/espacios.service';
import { AuthService } from '../../../../core/services/auth.service';
import { obtenerMensajeErrorApi } from '../../../../core/utils/api-error.util';
import { obtenerColorIdentificadorEspacio } from '../../../../shared/utils/espacio-color.util';
import { PosSidebarComponent } from '../../../../shared/components/pos-sidebar/pos-sidebar.component';
import { obtenerInicialesUsuario } from '../../../../shared/utils/usuario-iniciales.util';
import { filtrarEspaciosPorTermino } from '../../../../shared/utils/espacio-filtro.util';

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
    return obtenerInicialesUsuario(this.usuarioActual?.nombre);
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
    return filtrarEspaciosPorTermino(this.espacios, this.terminoBusqueda);
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
  }

  cerrarReserva(): void {
    this.modalReservaAbierto = false;
    this.espacioSeleccionado = null;
  }

}