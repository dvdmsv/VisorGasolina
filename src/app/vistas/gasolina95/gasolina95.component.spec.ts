import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Gasolina95Component } from './gasolina95.component';

describe('Gasolina95Component', () => {
  let component: Gasolina95Component;
  let fixture: ComponentFixture<Gasolina95Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Gasolina95Component]
    });
    fixture = TestBed.createComponent(Gasolina95Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
