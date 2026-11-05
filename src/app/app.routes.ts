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
    path: 'admin/dashboard',
    loadComponent: () => import('./features/admin/pages/admin-dashboard/admin-dashboard.component')
      .then(modulo => modulo.AdminDashboardComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'admin/reportes',
    loadComponent: () => import('./features/admin/pages/admin-reportes/admin-reportes.component')
      .then(modulo => modulo.AdminReportesComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'admin/espacios',
    component: AdminEspaciosComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['APROBADOR', 'ADMIN'] }
  },
  {
    path: 'admin/usuarios',
    loadComponent: () => import('./features/admin/pages/admin-usuarios/admin-usuarios.component')
      .then(modulo => modulo.AdminUsuariosComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'admin/parametros',
    pathMatch: 'full',
    redirectTo: 'admin/parametros/reglas'
  },
  {
    path: 'admin/parametros/reglas',
    loadComponent: () => import('./features/admin/pages/admin-parametros/admin-parametros.component')
      .then(modulo => modulo.AdminParametrosComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'], seccion: 'reglas' }
  },
  {
    path: 'admin/parametros/tipos-uso',
    loadComponent: () => import('./features/admin/pages/admin-parametros/admin-parametros.component')
      .then(modulo => modulo.AdminParametrosComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'], seccion: 'tipos-uso' }
  },
  {
    path: 'admin/parametros/anticipacion',
    loadComponent: () => import('./features/admin/pages/admin-parametros/admin-parametros.component')
      .then(modulo => modulo.AdminParametrosComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'], seccion: 'anticipacion' }
  },
  {
    path: 'admin/parametros/sanciones',
    loadComponent: () => import('./features/admin/pages/admin-parametros/admin-parametros.component')
      .then(modulo => modulo.AdminParametrosComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'], seccion: 'sanciones' }
  },
  {
    path: 'admin/sanciones',
    loadComponent: () => import('./features/admin/pages/admin-sanciones/admin-sanciones.component')
      .then(modulo => modulo.AdminSancionesComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'admin/parametros/recursos',
    loadComponent: () => import('./features/admin/pages/admin-recursos/admin-recursos.component')
      .then(modulo => modulo.AdminRecursosComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'admin/parametros/historial',
    loadComponent: () => import('./features/admin/pages/admin-parametros/admin-parametros.component')
      .then(modulo => modulo.AdminParametrosComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'], seccion: 'historial' }
  },
  {
    path: 'autorizaciones',
    loadComponent: () => import('./features/solicitudes/pages/autorizaciones/autorizaciones.component')
      .then(modulo => modulo.AutorizacionesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'solicitud-reserva',
    component: SolicitudReservaComponent
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./features/configuracion/pages/configuracion/configuracion.component')
      .then(modulo => modulo.ConfiguracionComponent),
    canActivate: [authGuard]
  },
  {
    path: 'notificaciones',
    loadComponent: () => import('./features/notificaciones/pages/notificaciones/notificaciones.component')
      .then(modulo => modulo.NotificacionesComponent),
    canActivate: [authGuard]
  }
];