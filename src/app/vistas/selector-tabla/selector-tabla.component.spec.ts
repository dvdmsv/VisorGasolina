import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectorTablaComponent } from './selector-tabla.component';

describe('SelectorTablaComponent', () => {
  let component: SelectorTablaComponent;
  let fixture: ComponentFixture<SelectorTablaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectorTablaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelectorTablaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
