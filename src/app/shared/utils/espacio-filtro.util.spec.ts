import { Espacio } from '../models/espacio.model';
import { filtrarEspaciosPorTermino } from './espacio-filtro.util';

describe('espacio-filtro.util', () => {
  const mockEspacios: Espacio[] = [
    {
      id: 1,
      nombre: 'Laboratorio de Redes',
      tipo: 'LABORATORIO',
      capacidad: 25,
      ubicacion: 'Piso 2'
    },
    {
      id: 2,
      nombre: 'Sala de Cómputo A',
      tipo: 'SALA',
      capacidad: 30,
      ubicacion: null
    }
  ];

  it('retorna la lista completa si el termino esta vacio o solo espacios', () => {
    expect(filtrarEspaciosPorTermino(mockEspacios, '').length).toBe(2);
    expect(filtrarEspaciosPorTermino(mockEspacios, '   ').length).toBe(2);
  });

  it('filtra por nombre ignorando mayusculas', () => {
    const resultado = filtrarEspaciosPorTermino(mockEspacios, 'redes');
    expect(resultado.length).toBe(1);
    expect(resultado[0].nombre).toBe('Laboratorio de Redes');
  });

  it('filtra por tipo de espacio', () => {
    const resultado = filtrarEspaciosPorTermino(mockEspacios, 'sala');
    expect(resultado.length).toBe(1);
    expect(resultado[0].id).toBe(2);
  });

  it('filtra por ubicacion y maneja ubicacion null sin error', () => {
    const resultado = filtrarEspaciosPorTermino(mockEspacios, 'piso 2');
    expect(resultado.length).toBe(1);
    expect(resultado[0].id).toBe(1);
  });

  it('filtra por capacidad numerica', () => {
    const resultado = filtrarEspaciosPorTermino(mockEspacios, '25');
    expect(resultado.length).toBe(1);
    expect(resultado[0].id).toBe(1);
  });

  it('filtra por codigo calculado (ej. l101)', () => {
    const resultado = filtrarEspaciosPorTermino(mockEspacios, 'l102');
    expect(resultado.length).toBe(1);
    expect(resultado[0].id).toBe(2);
  });

  it('retorna array vacio si no hay coincidencias', () => {
    const resultado = filtrarEspaciosPorTermino(mockEspacios, 'quimica');
    expect(resultado.length).toBe(0);
  });
});

