import { HttpErrorResponse } from '@angular/common/http';

interface ErrorValidacion {
  loc?: unknown;
  msg?: unknown;
}

export function obtenerMensajeErrorApi(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  const detail: unknown = error.error?.detail;
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const mensajes = detail
      .map((item: ErrorValidacion) => {
        if (typeof item?.msg !== 'string') {
          return null;
        }

        const ubicacion = Array.isArray(item.loc)
          ? item.loc.filter((parte): parte is string | number => typeof parte === 'string' || typeof parte === 'number')
          : [];
        const campo = ubicacion.at(-1);
        return campo === undefined ? item.msg : `${campo}: ${item.msg}`;
      })
      .filter((mensaje): mensaje is string => mensaje !== null);

    return mensajes.length > 0 ? mensajes.join('\n') : null;
  }

  return null;
}