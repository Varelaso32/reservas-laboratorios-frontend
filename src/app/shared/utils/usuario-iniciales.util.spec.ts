import { obtenerInicialesUsuario } from './usuario-iniciales.util';

describe('usuario-iniciales.util', () => {
  it('retorna string vacio si el nombre es nulo, indefinido o espacios', () => {
    expect(obtenerInicialesUsuario(null)).toBe('');
    expect(obtenerInicialesUsuario(undefined)).toBe('');
    expect(obtenerInicialesUsuario('')).toBe('');
    expect(obtenerInicialesUsuario('   ')).toBe('');
  });

  it('retorna las primeras dos letras si solo hay una palabra', () => {
    expect(obtenerInicialesUsuario('Admin')).toBe('AD');
    expect(obtenerInicialesUsuario('Ana')).toBe('AN');
  });

  it('retorna inicial del primer y ultimo nombre en mayusculas', () => {
    expect(obtenerInicialesUsuario('Julian Gonzalez')).toBe('JG');
    expect(obtenerInicialesUsuario('Ana Maria Gomez Perez')).toBe('AP');
  });

  it('maneja espacios multiples correctamente', () => {
    expect(obtenerInicialesUsuario('   Carlos   Lopez   ')).toBe('CL');
  });
});

