import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ReportesService } from './reportes.service';
import { API_BASE_URL } from '../config/api.config';
import { DashboardAdmin, ResumenDia } from '../../shared/models/reporte.model';

describe('ReportesService', () => {
  let service: ReportesService;
  let httpTesting: HttpTestingController;

  const resumen: ResumenDia[] = [
    {
      fecha: '2026-11-04',
      dia: 'Mié',
      reservas: 3,
      cancelaciones: 1,
      no_shows: 0,
      tasa_ocupacion: 12.5
    }
  ];

  const dashboard: DashboardAdmin = {
    reservas_hoy: 2,
    pendientes: 1,
    no_shows_mes: 0,
    ocupacion_hoy: 8.4,
    usuarios_activos: 7,
    espacios_activos: 5,
    recursos_pendientes: 0,
    proximas_reservas: [],
    serie_semanal: resumen,
    top_espacios: [{ espacio: 'Laboratorio de Redes', reservas: 4 }]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ReportesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe consultar el tablero con GET /reportes/dashboard', () => {
    service.dashboard().subscribe(res => expect(res).toEqual(dashboard));

    const req = httpTesting.expectOne(`${API_BASE_URL}/reportes/dashboard`);
    expect(req.request.method).toBe('GET');
    req.flush(dashboard);
  });

  it('debe enviar el periodo como desde y hasta en el resumen', () => {
    service.resumen({ desde: '2026-10-29', hasta: '2026-11-04' }).subscribe(res =>
      expect(res).toEqual(resumen)
    );

    const req = httpTesting.expectOne(
      `${API_BASE_URL}/reportes/resumen?desde=2026-10-29&hasta=2026-11-04`
    );
    expect(req.request.method).toBe('GET');
    req.flush(resumen);
  });

  it('debe consultar cada reporte en su endpoint', () => {
    service.ocupacion().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/reportes/ocupacion`).flush([]);

    service.actividad().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/reportes/actividad`).flush([]);

    service.noShows().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/reportes/no-shows`).flush([]);

    service.picos().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/reportes/picos`).flush({ por_dia: [], por_franja: [] });

    service.auditoria().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/reportes/auditoria`).flush([]);
  });

  it('debe descargar la exportación como Blob con el formato pedido', () => {
    service.exportar('resumen', 'pdf', { desde: '2026-11-01', hasta: '2026-11-04' }).subscribe(blob => {
      expect(blob).toBeInstanceOf(Blob);
    });

    const req = httpTesting.expectOne(
      `${API_BASE_URL}/reportes/resumen/export?desde=2026-11-01&hasta=2026-11-04&formato=pdf`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  });

  it('debe construir el nombre del archivo con el mismo patrón del backend', () => {
    expect(service.nombreArchivo('no-shows', 'csv', new Date(2026, 10, 4, 9, 5))).toBe(
      'reporte-no-shows-20261104-0905.csv'
    );
  });
});
