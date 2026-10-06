import type { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { EspaciosComponent } from './features/espacios/pages/espacios/espacios.component';
import { SolicitudReservaComponent } from './features/reservas/pages/solicitud-reserva/solicitud-reserva.component';
import { AdminEspaciosComponent } from './features/admin/pages/admin-espacios/admin-espacios.component';
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
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/pages/dashboard/dashboard.component')
      .then(modulo => modulo.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'calendario',
    loadComponent: () => import('./features/calendario/pages/calendario/calendario.component')
      .then(modulo => modulo.CalendarioComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin/espacios',
    component: AdminEspaciosComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['APROBADOR', 'ADMIN'] }
  },
  {
    path: 'solicitud-reserva',
    component: SolicitudReservaComponent
  }
];