import { HttpErrorResponse } from '@angular/common/http';
import { obtenerMensajeErrorApi } from './api-error.util';

describe('api-error.util', () => {
  it('debe retornar null si el error no es una instancia de HttpErrorResponse', () => {
    expect(obtenerMensajeErrorApi(null)).toBeNull();
    expect(obtenerMensajeErrorApi(undefined)).toBeNull();
    expect(obtenerMensajeErrorApi(new Error('Error generico'))).toBeNull();
    expect(obtenerMensajeErrorApi('error en string')).toBeNull();
  });

  it('debe retornar el texto de detail si es un string directo', () => {
    const error = new HttpErrorResponse({
      error: { detail: 'Credenciales invalidas' },
      status: 401
    });

    expect(obtenerMensajeErrorApi(error)).toBe('Credenciales invalidas');
  });

  it('debe formatear errores de validacion en arreglo con ubicacion de campo', () => {
    const error = new HttpErrorResponse({
      error: {
        detail: [
          { loc: ['body', 'email'], msg: 'Formato de correo invalido' },
          { loc: ['body', 'capacidad'], msg: 'Debe ser mayor a 0' }
        ]
      },
      status: 422
    });

    const resultado = obtenerMensajeErrorApi(error);
    expect(resultado).toContain('email: Formato de correo invalido');
    expect(resultado).toContain('capacidad: Debe ser mayor a 0');
  });

  it('debe usar solo el mensaje si loc esta vacio o no existe', () => {
    const error = new HttpErrorResponse({
      error: {
        detail: [{ msg: 'Error general en payload' }]
      },
      status: 422
    });

    expect(obtenerMensajeErrorApi(error)).toBe('Error general en payload');
  });

  it('debe ignorar items sin msg valido y retornar null si no hay mensajes utiles', () => {
    const error = new HttpErrorResponse({
      error: {
        detail: [{ loc: ['body'], msg: 123 }, null]
      },
      status: 422
    });

    expect(obtenerMensajeErrorApi(error)).toBeNull();
  });

  it('debe retornar null si detail no es string ni arreglo', () => {
    const error = new HttpErrorResponse({
      error: { detail: { desconocido: true } },
      status: 500
    });

    expect(obtenerMensajeErrorApi(error)).toBeNull();
  });
});

