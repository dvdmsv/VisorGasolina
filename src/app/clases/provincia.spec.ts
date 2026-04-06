import { Provincia } from './provincia';

describe('Provincia', () => {
  it('should create an instance', () => {
    expect(new Provincia('Madrid', '13', '28', 'Madrid')).toBeTruthy();
  });
});
