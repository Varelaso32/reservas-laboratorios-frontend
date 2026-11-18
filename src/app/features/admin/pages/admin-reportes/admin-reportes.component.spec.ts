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
import { AdminReportesComponent } from './admin-reportes.component';

describe('AdminReportesComponent', () => {
  let fixture: ComponentFixture<AdminReportesComponent>;
  let componente: AdminReportesComponent;
  let httpTestingController: HttpTestingController;
  let messageService: MessageService;

  const resumen = [
    {
      fecha: '2026-11-03',
      dia: 'Mar',
      reservas: 4,
      cancelaciones: 1,
      no_shows: 1,
      tasa_ocupacion: 18.5
    },
    {
      fecha: '2026-11-04',
      dia: 'Mié',
      reservas: 2,
      cancelaciones: 0,
      no_shows: 0,
      tasa_ocupacion: 9.25
    }
  ];
  const ocupacion = [
    {
      espacio_id: 1,
      espacio: 'Laboratorio de Redes',
      tipo: 'LABORATORIO',
      reservas: 3,
      horas_reservadas: 6,
      horas_disponibles: 15,
      tasa_ocupacion: 40
    }
  ];
  const actividad = [
    {
      usuario_id: 7,
      nombre: 'Samuel Varela',
      email: 'samuel@ecci.edu.co',
      rol: 'SOLICITANTE',
      reservas: 3,
      cancelaciones: 1,
      no_shows: 0
    }
  ];
  const noShows = [
    {
      reserva_id: 19,
      fecha: '2026-11-04',
      inicio: '08:00',
      fin: '10:00',
      espacio: 'Laboratorio de Redes',
      usuario: 'Docente de Prueba',
      estado: 'NO_ASISTIO'
    }
  ];
  const picos = {
    por_dia: [{ dia: 'Miércoles', reservas: 2 }],
    por_franja: [{ franja: '07:00 – 09:00', reservas: 2 }]
  };
  const auditoria = [
    {
      fecha: '2026-11-04T13:27:04Z',
      usuario: 'Docente de Prueba',
      origen: 'SOLICITUD',
      accion: 'APROBADA',
      entidad: 'Solicitud #44',
      detalle: null
    }
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminReportesComponent],
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
    messageService = TestBed.inject(MessageService);
    spyOn(messageService, 'add');

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

    fixture = TestBed.createComponent(AdminReportesComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify({ ignoreCancelled: true });
    sessionStorage.clear();
  });

  function responderCarga(): void {
    httpTestingController
      .expectOne(request => request.url === `${API_BASE_URL}/reportes/resumen`)
      .flush(resumen);
    httpTestingController
      .expectOne(request => request.url === `${API_BASE_URL}/reportes/ocupacion`)
      .flush(ocupacion);
    httpTestingController
      .expectOne(request => request.url === `${API_BASE_URL}/reportes/actividad`)
      .flush(actividad);
    httpTestingController
      .expectOne(request => request.url === `${API_BASE_URL}/reportes/no-shows`)
      .flush(noShows);
    httpTestingController
      .expectOne(request => request.url === `${API_BASE_URL}/reportes/picos`)
      .flush(picos);
    httpTestingController
      .expectOne(request => request.url === `${API_BASE_URL}/reportes/auditoria`)
      .flush(auditoria);
    fixture.detectChanges();
  }

  it('debe cargar los seis reportes del periodo por defecto', () => {
    responderCarga();

    expect(componente.cargando).toBeFalse();
    expect(componente.resumen).toEqual(resumen);
    expect(componente.totalReservas).toBe(6);
    expect(componente.totalCancelaciones).toBe(1);
    expect(componente.totalNoShows).toBe(1);
    expect(componente.ocupacionPromedio).toBe(13.9);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Reporte de ocupación');
    expect(texto).toContain('Auditoría del sistema');
    expect(texto).toContain('Resumen semanal');
    expect(texto).toContain('Laboratorio de Redes');
  });

  it('debe descargar el PDF con el nombre del reporte y avisar al usuario', () => {
    responderCarga();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:reporte');
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.stub();

    componente.exportar('ocupacion', 'pdf');

    const peticion = httpTestingController.expectOne(
      request =>
        request.url === `${API_BASE_URL}/reportes/ocupacion/export` &&
        request.params.get('formato') === 'pdf'
    );
    peticion.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reporte');
    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'success', summary: 'Reporte descargado' })
    );
    expect(componente.exportando).toBeNull();
  });

  it('debe rechazar un periodo con la fecha inicial posterior a la final', () => {
    responderCarga();
    componente.desde = '2026-11-05';
    componente.hasta = '2026-11-01';

    componente.aplicarPeriodo();

    httpTestingController.expectNone(request => request.url.includes('/reportes/resumen'));
    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'warn', summary: 'Periodo inválido' })
    );
  });

  it('debe mostrar el mensaje de error cuando la carga falla', () => {
    httpTestingController
      .expectOne(request => request.url === `${API_BASE_URL}/reportes/resumen`)
      .flush({ detail: 'Sin permisos' }, { status: 403, statusText: 'Forbidden' });

    expect(componente.cargando).toBeFalse();
    expect(componente.error).toContain('permiso');
  });
});
