import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DieselComponent } from '../inicio/InicioComponent';

describe('DieselComponent', () => {
  let component: DieselComponent;
  let fixture: ComponentFixture<DieselComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DieselComponent]
    });
    fixture = TestBed.createComponent(DieselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
