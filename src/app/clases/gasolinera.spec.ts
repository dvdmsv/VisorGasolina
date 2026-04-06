import { Gasolinera } from './gasolinera';

describe('Gasolinera', () => {
  it('should create an instance', () => {
    expect(new Gasolinera('Test', 'Madrid', 'Madrid', 'Calle Test', 1.5, 40.4, -3.7, 'Precio Gasoleo A', false)).toBeTruthy();
  });
});
