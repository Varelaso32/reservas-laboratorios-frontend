const COLORES_IDENTIFICADORES = [
  '#7758e5',
  '#5b8def',
  '#d88945',
  '#3c9b88',
  '#c66b88'
];

export function obtenerColorIdentificadorEspacio(espacioId: number): string {
  const indice = Math.abs(espacioId) % COLORES_IDENTIFICADORES.length;
  return COLORES_IDENTIFICADORES[indice];
}
