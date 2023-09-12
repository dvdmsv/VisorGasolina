import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Gasolina98Component } from './gasolina98.component';

describe('Gasolina98Component', () => {
  let component: Gasolina98Component;
  let fixture: ComponentFixture<Gasolina98Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Gasolina98Component]
    });
    fixture = TestBed.createComponent(Gasolina98Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
