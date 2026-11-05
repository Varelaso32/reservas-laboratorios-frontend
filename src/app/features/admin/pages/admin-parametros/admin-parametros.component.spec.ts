/// <reference types="jasmine" />
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { AdminParametrosComponent } from './admin-parametros.component';
import { ReglasEspacio } from '../../../../shared/models/configuracion.model';
import { of } from 'rxjs';
import { NotificacionesService } from '../../../../core/services/notificaciones.service';

describe('AdminParametrosComponent', () => {
  let fixture: ComponentFixture<AdminParametrosComponent>;
  let component: AdminParametrosComponent;
  let httpTestingController: HttpTestingController;
  let seccion: 'reglas' | 'tipos-uso' | 'anticipacion' | 'historial';

  const espacioAdmin = {
    id: 1,
    nombre: 'Laboratorio de Redes',
    tipo: 'LABORATORIO' as const,
    capacidad: 25,
    ubicacion: 'Bloque A',
    activo: true
  };

  const reglas: ReglasEspacio = {
    espacio_id: 1,
    nombre: 'Laboratorio de Redes',
    tipo: 'LABORATORIO',
    capacidad: 25,
    activo: true,
    hora_apertura: '08:00:00',
    hora_cierre: '18:00:00',
    dias_operacion: [1, 2, 3, 4, 5],
    max_usos_dia: 4,
    duracion_maxima_min: 120,
    separacion_min: 15,
    ocupacion_minima: 5,
    requiere_responsable: true,
    admite_autorizacion_especial: true,
    tipos_uso: [
      { id: 5, nombre: 'Clase', activo: true },
      { id: 6, nombre: 'Examen', activo: true }
    ]
  };

  const tiposUso = [
    { id: 5, nombre: 'Clase', activo: true },
    { id: 6, nombre: 'Examen', activo: true },
    { id: 7, nombre: 'Evento', activo: false }
  ];

  function guardarSesionAdmin(): void {
    sessionStorage.setItem('access_token', 'token-admin');
    sessionStorage.setItem(
      'usuario',
      JSON.stringify({
        id: 1,
        nombre: 'Super Administrador',
        email: 'admin@reservas.test',
        rol: 'ADMIN',
        cargo: 'ADMINISTRADOR_SISTEMA'
      })
    );
  }

  function crearComponente(): void {
    fixture = TestBed.createComponent(AdminParametrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function responderEspacios(): void {
    httpTestingController
      .expectOne(`${API_BASE_URL}/espacios/admin`)
      .flush([espacioAdmin]);
    fixture.detectChanges();
  }

  function responderTiposUso(): void {
    httpTestingController
      .expectOne(
        request =>
          request.method === 'GET' &&
          request.url === `${API_BASE_URL}/configuracion/tipos-uso` &&
          request.params.get('incluir_inactivos') === 'true'
      )
      .flush(tiposUso);
    fixture.detectChanges();
  }

  function responderReglas(): void {
    httpTestingController
      .expectOne(`${API_BASE_URL}/configuracion/espacios/1`)
      .flush(reglas);
    fixture.detectChanges();
  }

  function prepararReglas(): void {
    responderEspacios();
    responderTiposUso();
    responderReglas();
  }

  beforeEach(async () => {
    sessionStorage.clear();
    guardarSesionAdmin();
    seccion = 'reglas';

    await TestBed.configureTestingModule({
      imports: [AdminParametrosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
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
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                get seccion() {
                  return seccion;
                }
              }
            }
          }
        }
      ]
    }).compileComponents();
  });

  afterEach(() => httpTestingController.verify());

  it('carga las reglas del primer espacio activo en la sección de reglas', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    crearComponente();
    prepararReglas();

    expect(component.seccion).toBe('reglas');
    expect(component.espacioSeleccionadoId).toBe(1);
    expect(component.reglas?.nombre).toBe('Laboratorio de Redes');
    expect(fixture.nativeElement.querySelector('#titulo-reglas-espacio')).toBeTruthy();
  });

  it('abre el grupo Parámetros por defecto para mostrar la pantalla activa', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    crearComponente();
    prepararReglas();

    expect(component.parametrosAbierto).toBeTrue();
    const padre = fixture.nativeElement.querySelector('.menu-item.grupo') as HTMLButtonElement;
    expect(padre.getAttribute('aria-expanded')).toBe('true');

    const submenu = fixture.nativeElement.querySelector('#submenu-parametros') as HTMLElement;
    expect(submenu).toBeTruthy();
    const enlaces = submenu.querySelectorAll('a.submenu-item');
    expect(enlaces.length).toBe(6);
    expect(enlaces[0].textContent).toContain('Reglas de reserva');
    expect(
      Array.from(enlaces).some(enlace => (enlace.textContent ?? '').includes('Sanciones'))
    ).toBeTrue();
    expect(
      Array.from(enlaces).some(enlace => (enlace.textContent ?? '').includes('Recursos'))
    ).toBeTrue();
  });

  it('cierra el grupo Parámetros al hacer clic en el padre y lo vuelve a abrir', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    crearComponente();
    prepararReglas();

    const padre = fixture.nativeElement.querySelector('.menu-item.grupo') as HTMLButtonElement;
    padre.click();
    fixture.detectChanges();

    expect(component.parametrosAbierto).toBeFalse();
    expect(fixture.nativeElement.querySelector('#submenu-parametros')).toBeNull();

    padre.click();
    fixture.detectChanges();

    expect(component.parametrosAbierto).toBeTrue();
    expect(fixture.nativeElement.querySelector('#submenu-parametros')).toBeTruthy();
  });

  it('guarda las reglas del espacio con los días y tipos seleccionados', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    crearComponente();
    prepararReglas();

    component.alternarDia(7);
    component.alternarTipoUso(6);
    component.guardarReglas();

    const put = httpTestingController.expectOne(`${API_BASE_URL}/configuracion/espacios/1`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.dias_operacion).toEqual([1, 2, 3, 4, 5, 7]);
    expect(put.request.body.tipos_uso_ids).toEqual([5]);
    expect(put.request.body.requiere_responsable).toBeTrue();
    expect(put.request.body.admite_autorizacion_especial).toBeTrue();
    put.flush({ ...reglas, dias_operacion: [1, 2, 3, 4, 5, 7] });

    expect(component.guardandoReglas).toBeFalse();
  });

  it('avisa cuando la franja de operación queda incompleta', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    crearComponente();
    prepararReglas();

    component.formulario.horaApertura = '08:00';
    component.formulario.horaCierre = '';
    component.guardarReglas();

    httpTestingController.expectNone(`${API_BASE_URL}/configuracion/espacios/1`);
  });

  it('lista los tipos de uso en su propia sección', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    seccion = 'tipos-uso';
    crearComponente();
    responderTiposUso();

    expect(component.tituloSeccion).toBe('Tipos de uso');
    expect(component.tiposUso.length).toBe(3);
    const items = fixture.nativeElement.querySelectorAll('.lista-tipos li');
    expect(items.length).toBe(3);
    expect(items[2].textContent).toContain('Evento');
    expect(items[2].classList.contains('inactivo')).toBeTrue();
  });

  it('crea un tipo de uso y recarga el catálogo', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    seccion = 'tipos-uso';
    crearComponente();
    responderTiposUso();

    component.nuevoTipoUso = 'Sustentación';
    component.crearTipoUso();

    const post = httpTestingController.expectOne(`${API_BASE_URL}/configuracion/tipos-uso`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ nombre: 'Sustentación' });
    post.flush({ id: 9, nombre: 'Sustentación', activo: true });

    responderTiposUso();
    expect(component.nuevoTipoUso).toBe('');
  });

  it('activa y desactiva un tipo de uso', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    seccion = 'tipos-uso';
    crearComponente();
    responderTiposUso();

    component.alternarActivoTipoUso(component.tiposUso[0]);

    const patch = httpTestingController.expectOne(`${API_BASE_URL}/configuracion/tipos-uso/5`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ activo: false });
    patch.flush({ id: 5, nombre: 'Clase', activo: false });

    expect(component.tiposUso[0].activo).toBeFalse();
  });

  it('guarda la anticipación de un rol', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    seccion = 'anticipacion';
    crearComponente();

    httpTestingController
      .expectOne(`${API_BASE_URL}/configuracion/anticipacion`)
      .flush([
        { rol: 'ESTUDIANTE', dias_maximos: 15 },
        { rol: 'DOCENTE', dias_maximos: 30 }
      ]);
    fixture.detectChanges();

    const estudiante = component.anticipacion[0];
    estudiante.dias_maximos = 20;
    component.guardarAnticipacion(estudiante);

    const put = httpTestingController.expectOne(
      `${API_BASE_URL}/configuracion/anticipacion/ESTUDIANTE`
    );
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ dias_maximos: 20 });
    put.flush({ rol: 'ESTUDIANTE', dias_maximos: 20 });

    expect(component.anticipacion[0].dias_maximos).toBe(20);
  });

  it('rechaza una anticipación que no es entero positivo', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    seccion = 'anticipacion';
    crearComponente();

    httpTestingController
      .expectOne(`${API_BASE_URL}/configuracion/anticipacion`)
      .flush([{ rol: 'ESTUDIANTE', dias_maximos: 15 }]);
    fixture.detectChanges();

    const estudiante = component.anticipacion[0];
    estudiante.dias_maximos = 0;
    component.guardarAnticipacion(estudiante);

    httpTestingController.expectNone(`${API_BASE_URL}/configuracion/anticipacion/ESTUDIANTE`);
  });

  it('muestra el historial con el nombre del espacio', () => {
    httpTestingController = TestBed.inject(HttpTestingController);
    seccion = 'historial';
    crearComponente();
    responderEspacios();

    httpTestingController
      .expectOne(
        request =>
          request.method === 'GET' &&
          request.url === `${API_BASE_URL}/configuracion/historial` &&
          request.params.get('limite') === '20'
      )
      .flush([
        {
          id: 1,
          entidad: 'REGLAS',
          espacio_id: 1,
          usuario: 'Super Administrador',
          detalle: 'Franja 08:00 a 18:00',
          fecha: '2026-10-20T14:30:00-05:00'
        }
      ]);
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.lista-historial li') as HTMLElement;
    expect(item.textContent).toContain('Laboratorio de Redes');
    expect(item.textContent).toContain('Franja 08:00 a 18:00');
    expect(item.textContent).toContain('Super Administrador');
  });

  it('no pide datos ni muestra el formulario si el usuario no es administrador', () => {
    sessionStorage.setItem(
      'usuario',
      JSON.stringify({
        id: 8,
        nombre: 'Operador',
        email: 'operador@reservas.test',
        rol: 'APROBADOR',
        cargo: 'ADMINISTRADOR_SALA'
      })
    );

    httpTestingController = TestBed.inject(HttpTestingController);
    crearComponente();

    httpTestingController.expectNone(() => true);
    const aviso = fixture.nativeElement.querySelector('.aviso-permiso') as HTMLElement;
    expect(aviso.textContent).toContain('Solo el Administrador del Sistema');
  });
});
