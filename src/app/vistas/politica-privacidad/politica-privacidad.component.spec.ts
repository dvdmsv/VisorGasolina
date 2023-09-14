import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoliticaPrivacidadComponent } from './politica-privacidad.component';

describe('PoliticaPrivacidadComponent', () => {
  let component: PoliticaPrivacidadComponent;
  let fixture: ComponentFixture<PoliticaPrivacidadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PoliticaPrivacidadComponent]
    });
    fixture = TestBed.createComponent(PoliticaPrivacidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
