import type { Routes } from '@angular/router';
import { EspaciosComponent } from './features/espacios/pages/espacios/espacios.component';
import { SolicitudReservaComponent } from './features/reservas/pages/solicitud-reserva/solicitud-reserva.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'espacios',
    pathMatch: 'full'
  },
  {
    path: 'espacios',
    component: EspaciosComponent
  },
  {
    path: 'solicitud-reserva',
    component: SolicitudReservaComponent
  }
];