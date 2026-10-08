import { obtenerColorIdentificadorEspacio } from './espacio-color.util';

describe('espacio-color.util', () => {
  it('debe retornar un color hexadecimal valido para un id positivo', () => {
    const color = obtenerColorIdentificadorEspacio(1);
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('debe ser determinista para el mismo id de espacio', () => {
    const color1 = obtenerColorIdentificadorEspacio(42);
    const color2 = obtenerColorIdentificadorEspacio(42);
    expect(color1).toBe(color2);
  });

  it('debe manejar ids negativos usando su valor absoluto', () => {
    const colorPositivo = obtenerColorIdentificadorEspacio(3);
    const colorNegativo = obtenerColorIdentificadorEspacio(-3);
    expect(colorNegativo).toBe(colorPositivo);
  });

  it('debe rotar ciclicamente entre los colores de la paleta', () => {
    const color0 = obtenerColorIdentificadorEspacio(0);
    const color5 = obtenerColorIdentificadorEspacio(5);
    expect(color0).toBe(color5);
  });
});

