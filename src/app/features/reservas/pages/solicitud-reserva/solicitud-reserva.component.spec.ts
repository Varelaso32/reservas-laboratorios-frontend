import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitudReservaComponent } from './solicitud-reserva.component';

describe('SolicitudReservaComponent', () => {
  let component: SolicitudReservaComponent;
  let fixture: ComponentFixture<SolicitudReservaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudReservaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolicitudReservaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
