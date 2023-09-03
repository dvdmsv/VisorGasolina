import { TestBed } from '@angular/core/testing';

import { ApiGasolinerasService } from './api-gasolineras.service';

describe('ApiGasolinerasService', () => {
  let service: ApiGasolinerasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiGasolinerasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
