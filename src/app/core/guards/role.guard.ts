import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Rol } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

const ROLES_VALIDOS: Rol[] = ['SOLICITANTE', 'APROBADOR', 'ADMIN'];

export const roleGuard: CanActivateFn = route => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.tieneSesionActiva()) {
    return router.createUrlTree(['/login']);
  }

  const rolesPermitidos: unknown = route.data['roles'];
  const rolActual = authService.obtenerUsuarioActual()?.rol;
  const rolesValidos = Array.isArray(rolesPermitidos)
    ? rolesPermitidos.filter((rol): rol is Rol =>
        typeof rol === 'string' && ROLES_VALIDOS.includes(rol as Rol)
      )
    : [];

  return rolActual && rolesValidos.includes(rolActual)
    ? true
    : router.createUrlTree(['/espacios']);
};