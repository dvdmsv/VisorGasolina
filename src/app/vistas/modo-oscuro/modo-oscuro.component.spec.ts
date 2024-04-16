import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModoOscuroComponent } from './modo-oscuro.component';

describe('ModoOscuroComponent', () => {
  let component: ModoOscuroComponent;
  let fixture: ComponentFixture<ModoOscuroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModoOscuroComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ModoOscuroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
