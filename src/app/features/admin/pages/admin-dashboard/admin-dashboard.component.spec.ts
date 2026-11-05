/// <reference types="jasmine" />
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { routes } from '../../../../app.routes';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { NotificacionesService } from '../../../../core/services/notificaciones.service';
import { DashboardAdmin } from '../../../../shared/models/reporte.model';
import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let componente: AdminDashboardComponent;
  let httpTestingController: HttpTestingController;

  const datos: DashboardAdmin = {
    reservas_hoy: 3,
    pendientes: 2,
    no_shows_mes: 1,
    ocupacion_hoy: 24.5,
    usuarios_activos: 7,
    espacios_activos: 5,
    recursos_pendientes: 1,
    proximas_reservas: [
      {
        id: 20,
        espacio: 'Laboratorio de Software',
        usuario: 'Samuel Varela',
        inicio: '09:35',
        fin: '10:35',
        estado: 'ACTIVA'
      }
    ],
    serie_semanal: [
      {
        fecha: '2026-11-03',
        dia: 'Mar',
        reservas: 4,
        cancelaciones: 0,
        no_shows: 0,
        tasa_ocupacion: 12
      },
      {
        fecha: '2026-11-04',
        dia: 'Mié',
        reservas: 2,
        cancelaciones: 1,
        no_shows: 1,
        tasa_ocupacion: 8
      }
    ],
    top_espacios: [{ espacio: 'Laboratorio de Redes', reservas: 6 }]
  };

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        MessageService,
        {
          provide: NotificacionesService,
          useValue: {
            resumen: () => of({ no_leidas: 0 }),
            listar: () => of([]),
            marcarTodasLeidas: () => of({ actualizadas: 0 }),
            marcarLeida: () => of(null)
          }
        }
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);

    sessionStorage.setItem('access_token', 'spec-session-token');
    sessionStorage.setItem(
      'usuario',
      JSON.stringify({
        id: 2,
        nombre: 'Samuel Admin',
        email: 'admin@reservas.test',
        rol: 'ADMIN',
        cargo: 'ADMINISTRADOR_SISTEMA'
      })
    );

    fixture = TestBed.createComponent(AdminDashboardComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  function responderTablero(): void {
    httpTestingController.expectOne(`${API_BASE_URL}/reportes/dashboard`).flush(datos);
    fixture.detectChanges();
  }

  it('debe pintar los indicadores del día', () => {
    responderTablero();

    expect(componente.cargando).toBeFalse();
    expect(componente.totalReservasSemana).toBe(6);
    expect(componente.ocupacionPromedioSemana).toBe(10);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Reservas hoy');
    expect(texto).toContain('Solicitudes pendientes');
    expect(texto).toContain('No-shows del mes');
    expect(texto).toContain('24.5 %');
    expect(texto).toContain('Laboratorio de Software');
    expect(texto).toContain('Laboratorio de Redes');
  });

  it('debe calcular el ancho de las barras sin pasar del 100 %', () => {
    responderTablero();

    expect(componente.anchoBarra(3, 6)).toBe(50);
    expect(componente.anchoBarra(9, 6)).toBe(100);
  });

  it('debe mostrar el error cuando el tablero no responde', () => {
    httpTestingController
      .expectOne(`${API_BASE_URL}/reportes/dashboard`)
      .flush({ detail: 'Sin permisos' }, { status: 403, statusText: 'Forbidden' });

    expect(componente.cargando).toBeFalse();
    expect(componente.error).toBe('Sin permisos');
  });
});
