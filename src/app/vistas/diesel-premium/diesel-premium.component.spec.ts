import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DieselPremiumComponent } from './diesel-premium.component';

describe('DieselPremiumComponent', () => {
  let component: DieselPremiumComponent;
  let fixture: ComponentFixture<DieselPremiumComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DieselPremiumComponent]
    });
    fixture = TestBed.createComponent(DieselPremiumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
