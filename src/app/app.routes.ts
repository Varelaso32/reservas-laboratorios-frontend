import type { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { EspaciosComponent } from './features/espacios/pages/espacios/espacios.component';
import { SolicitudReservaComponent } from './features/reservas/pages/solicitud-reserva/solicitud-reserva.component';
import { SolicitudesPendientesComponent } from './features/solicitudes/pages/solicitudes-pendientes/solicitudes-pendientes.component';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'espacios',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'espacios',
    component: EspaciosComponent,
    canActivate: [authGuard]
  },
  {
    path: 'solicitud-reserva',
    component: SolicitudReservaComponent
  },
  {
    path: 'solicitudes-pendientes',
    component: SolicitudesPendientesComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['APROBADOR'] }
  }
];