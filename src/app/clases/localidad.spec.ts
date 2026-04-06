import { Localidad } from './localidad';

describe('Localidad', () => {
  it('should create an instance', () => {
    expect(new Localidad('Madrid', '13', '28079', '28', 'Madrid', 'Madrid')).toBeTruthy();
  });
});
