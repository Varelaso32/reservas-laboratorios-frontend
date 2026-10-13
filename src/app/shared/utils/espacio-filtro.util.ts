import { Espacio } from '../models/espacio.model';

export function filtrarEspaciosPorTermino(espacios: Espacio[], termino: string): Espacio[] {
  const query = termino.trim().toLowerCase();
  if (!query) {
    return espacios;
  }
  return espacios.filter(espacio => {
    const nombre = espacio.nombre.toLowerCase();
    const tipo = espacio.tipo.toLowerCase();
    const ubicacion = (espacio.ubicacion ?? '').toLowerCase();
    const capacidad = String(espacio.capacidad);
    const codigo = `l10${espacio.id}`;
    return (
      nombre.includes(query) ||
      tipo.includes(query) ||
      ubicacion.includes(query) ||
      capacidad.includes(query) ||
      codigo.includes(query)
    );
  });
}

