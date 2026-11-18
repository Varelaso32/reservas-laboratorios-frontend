import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { NotificacionesService } from '../../../../core/services/notificaciones.service';
import { SancionesService } from '../../../../core/services/sanciones.service';
import { SolicitudesService } from '../../../../core/services/solicitudes.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { ConfiguracionComponent } from './configuracion.component';

describe('ConfiguracionComponent', () => {
  let component: ConfiguracionComponent;
  let fixture: ComponentFixture<ConfiguracionComponent>;
  let usuariosServiceSpy: jasmine.SpyObj<UsuariosService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;
  let sancionesServiceSpy: jasmine.SpyObj<SancionesService>;

  const usuario = {
    id: 4,
    nombre: 'Estudiante de Prueba',
    email: 'estudiante@reservas.test',
    rol: 'SOLICITANTE' as const,
    cargo: 'ESTUDIANTE' as const
  };

  beforeEach(async () => {
    usuariosServiceSpy = jasmine.createSpyObj<UsuariosService>('UsuariosService', [
      'actualizarMiCuenta',
      'cambiarMiClave'
    ]);
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'obtenerUsuarioActual',
      'consultarUsuarioActual',
      'tieneSesionActiva'
    ]);
    authServiceSpy.tieneSesionActiva.and.returnValue(true);

    authServiceSpy.obtenerUsuarioActual.and.returnValue(usuario);

    sancionesServiceSpy = jasmine.createSpyObj<SancionesService>('SancionesService', [
      'consultarMiEstado',
      'pedirReactivacion'
    ]);
    sancionesServiceSpy.consultarMiEstado.and.returnValue(of({
      bloqueado: false,
      strikes_activos: 0,
      max_strikes: 3,
      tolerancia_minutos: 10,
      aviso_minutos: 5,
      strikes: [],
      reactivacion: null
    }));

    await TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [
        { provide: UsuariosService, useValue: usuariosServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SancionesService, useValue: sancionesServiceSpy },
        MessageService,
        {
          provide: NotificacionesService,
          useValue: {
            resumen: () => of({ no_leidas: 0 }),
            listar: () => of([]),
            marcarTodasLeidas: () => of({ actualizadas: 0 }),
            marcarLeida: () => of(null)
          }
        },
        { provide: SolicitudesService, useValue: { decidirCesion: () => of({ mensaje: '' }) } },
        provideRouter([]),
        provideNoopAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionComponent);
    component = fixture.componentInstance;
    messageServiceSpy = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    spyOn(messageServiceSpy, 'add');
    fixture.detectChanges();
  });

  it('debe crearse con los datos del usuario precargados', () => {
    expect(component).toBeTruthy();
    expect(component.formularioDatos.get('nombre')?.value).toBe('Estudiante de Prueba');
    expect(component.formularioDatos.get('email')?.value).toBe('estudiante@reservas.test');
  });

  it('no llama a la API si los datos no cambiaron', () => {
    component.guardarDatos();

    expect(usuariosServiceSpy.actualizarMiCuenta).not.toHaveBeenCalled();
    expect(messageServiceSpy.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'info', summary: 'Sin cambios' })
    );
  });

  it('envia solo los campos cambiados y refresca la sesion', () => {
    authServiceSpy.consultarUsuarioActual.and.returnValue({
      subscribe: (manejadores: { next: () => void }) => {
        manejadores.next();
        return { unsubscribe: () => undefined } as never;
      }
    } as never);
    usuariosServiceSpy.actualizarMiCuenta.and.returnValue({
      subscribe: (manejadores: { next: () => void }) => {
        manejadores.next();
        return { unsubscribe: () => undefined } as never;
      }
    } as never);

    component.formularioDatos.patchValue({ nombre: 'Nombre Nuevo' });
    component.guardarDatos();

    expect(usuariosServiceSpy.actualizarMiCuenta).toHaveBeenCalledWith({ nombre: 'Nombre Nuevo' });
    expect(authServiceSpy.consultarUsuarioActual).toHaveBeenCalled();
    expect(messageServiceSpy.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'success', summary: 'Datos actualizados' })
    );
  });

  it('valida que la clave nueva y su confirmacion coincidan', () => {
    component.formularioClave.setValue({
      claveActual: 'Reservas2026*',
      claveNueva: 'NuevaClave2026*',
      confirmacion: 'OtraClave2026*'
    });

    expect(component.formularioClave.hasError('noCoincide')).toBeTrue();

    component.formularioClave.patchValue({ confirmacion: 'NuevaClave2026*' });
    expect(component.formularioClave.hasError('noCoincide')).toBeFalse();
  });

  it('envia la clave actual y la nueva al restablecer', () => {
    usuariosServiceSpy.cambiarMiClave.and.returnValue({
      subscribe: (manejadores: { next: (valor: { mensaje: string }) => void }) => {
        manejadores.next({ mensaje: 'Clave actualizada.' });
        return { unsubscribe: () => undefined } as never;
      }
    } as never);

    component.formularioClave.setValue({
      claveActual: 'Reservas2026*',
      claveNueva: 'NuevaClave2026*',
      confirmacion: 'NuevaClave2026*'
    });
    component.guardarClave();

    expect(usuariosServiceSpy.cambiarMiClave).toHaveBeenCalledWith({
      clave_actual: 'Reservas2026*',
      clave_nueva: 'NuevaClave2026*'
    });
    expect(messageServiceSpy.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'success', summary: 'Clave actualizada' })
    );
  });

  it('muestra el mensaje del backend si la clave actual no es correcta', () => {
    usuariosServiceSpy.cambiarMiClave.and.returnValue({
      subscribe: (manejadores: { error: (e: unknown) => void }) => {
        manejadores.error(new HttpErrorResponse({ status: 422, error: { detail: 'La clave actual no es correcta' } }));
        return { unsubscribe: () => undefined } as never;
      }
    } as never);

    component.formularioClave.setValue({
      claveActual: 'Incorrecta2026*',
      claveNueva: 'NuevaClave2026*',
      confirmacion: 'NuevaClave2026*'
    });
    component.guardarClave();

    expect(messageServiceSpy.add).toHaveBeenCalledWith(
      jasmine.objectContaining({
        severity: 'error',
        summary: 'No se guardó',
        detail: 'La clave actual no es correcta'
      })
    );
  });
});
