import {
  fechaColombia,
  fechaReservaColombia,
  horaColombia,
  horaReservaColombia,
  instanteReservaColombia,
  obtenerRangoDisponibilidadActual
} from './fecha-colombia.util';

describe('fecha-colombia.util', () => {
  it('rounds a current instant up to the next full minute for availability validation', () => {
    const ahora = new Date('2026-10-06T18:43:59.999Z');
    const rango = obtenerRangoDisponibilidadActual(ahora);

    expect(rango).toEqual({
      fecha: '2026-10-06',
      horaInicio: '13:44',
      horaFin: '13:45'
    });
  });

  it('does not produce an availability range across the Colombia day boundary', () => {
    const ahora = new Date('2026-10-07T04:58:59.999Z');
    expect(fechaColombia(ahora)).toBe('2026-10-06');
    expect(horaColombia(ahora)).toBe('23:58');
    expect(obtenerRangoDisponibilidadActual(ahora)).toBeNull();
  });

  it('interprets reservation timestamps without an offset as Colombia wall-clock time', () => {
    const conOffset = '2026-10-06T20:28:00-05:00';
    const sinOffset = '2026-10-06T20:28:00';
    const utcEquivalente = '2026-10-07T01:28:00Z';

    expect(horaReservaColombia(conOffset)).toBe('20:28');
    expect(horaReservaColombia(sinOffset)).toBe('20:28');
    expect(horaReservaColombia(utcEquivalente)).toBe('20:28');
    expect(fechaReservaColombia(sinOffset)).toBe('2026-10-06');
    expect(instanteReservaColombia(conOffset)).toBe(instanteReservaColombia(sinOffset));
    expect(instanteReservaColombia(conOffset)).toBe(instanteReservaColombia(utcEquivalente));
  });
});
