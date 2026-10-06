const ZONA_HORARIA_COLOMBIA = 'America/Bogota';

function interpretarFechaReserva(valor: string): Date {
  const contieneZonaHoraria = /(?:z|[+-]\d{2}:?\d{2})$/i.test(valor);
  return new Date(contieneZonaHoraria ? valor : `${valor}-05:00`);
}

function obtenerPartesFecha(fecha: Date, zonaHoraria = ZONA_HORARIA_COLOMBIA): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaHoraria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(fecha).map(parte => [parte.type, parte.value])
  );
}

export function fechaColombia(fecha: Date): string {
  const partes = obtenerPartesFecha(fecha);
  return `${partes['year']}-${partes['month']}-${partes['day']}`;
}

export function horaColombia(fecha: Date): string {
  const partes = obtenerPartesFecha(fecha);
  return `${partes['hour']}:${partes['minute']}`;
}

export function fechaReservaColombia(valor: string): string {
  return fechaColombia(interpretarFechaReserva(valor));
}

export function horaReservaColombia(valor: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: ZONA_HORARIA_COLOMBIA
  }).format(interpretarFechaReserva(valor));
}

export function instanteReservaColombia(valor: string): number {
  return interpretarFechaReserva(valor).getTime();
}

export function fechaActualLargaColombia(fecha: Date): string {
  const texto = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA_HORARIA_COLOMBIA
  }).format(fecha);
  return texto.charAt(0).toLocaleUpperCase() + texto.slice(1);
}

export function sumarDiasFecha(fecha: string, cantidad: number): string {
  const [year, month, day] = fecha.split('-').map(Number);
  const resultado = new Date(Date.UTC(year, month - 1, day + cantidad));
  return [
    resultado.getUTCFullYear(),
    String(resultado.getUTCMonth() + 1).padStart(2, '0'),
    String(resultado.getUTCDate()).padStart(2, '0')
  ].join('-');
}

export function obtenerInicioSemana(fecha: string): string {
  const [year, month, day] = fecha.split('-').map(Number);
  const diaSemana = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const diasDesdeLunes = (diaSemana + 6) % 7;
  return sumarDiasFecha(fecha, -diasDesdeLunes);
}

export function fechaDesdeClaveColombia(fecha: string): Date {
  return new Date(`${fecha}T12:00:00Z`);
}

export function obtenerRangoDisponibilidadActual(ahora: Date): {
  fecha: string;
  horaInicio: string;
  horaFin: string;
} | null {
  const inicio = new Date(ahora);
  inicio.setUTCSeconds(0, 0);
  if (inicio.getTime() <= ahora.getTime()) {
    inicio.setUTCMinutes(inicio.getUTCMinutes() + 1);
  }
  const fin = new Date(inicio.getTime() + 60_000);
  const fecha = fechaColombia(inicio);
  if (fechaColombia(fin) !== fecha) {
    return null;
  }

  return {
    fecha,
    horaInicio: horaColombia(inicio),
    horaFin: horaColombia(fin)
  };
}
