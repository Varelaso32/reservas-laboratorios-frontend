export function obtenerInicialesUsuario(nombre?: string | null): string {
  const nombreLimpio = nombre?.trim();
  if (!nombreLimpio) {
    return '';
  }

  const partes = nombreLimpio.split(/\s+/).filter(Boolean);
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toLocaleUpperCase();
  }

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toLocaleUpperCase();
}

