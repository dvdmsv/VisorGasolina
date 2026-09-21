import { describe, expect, it } from 'vitest';
import { aNumero, comoNombrePropio, mapearGasolineras, mapearLocalidades, mapearProvincias, precioMedio } from './mapeo';
import { EstacionApi, RespuestaEstaciones } from './respuesta-api';

/** Estación con la forma exacta en la que responde el Ministerio. */
function estacion(parcial: Partial<EstacionApi> = {}): EstacionApi {
  return {
    'Rótulo': 'REPSOL',
    'Dirección': 'AVENIDA DE LA PAZ, 12',
    Localidad: 'MADRID',
    Municipio: 'Madrid',
    Provincia: 'MADRID',
    IDMunicipio: '4276',
    IDProvincia: '28',
    IDPovincia: '28',
    IDCCAA: '13',
    CCAA: 'Madrid, Comunidad de',
    Latitud: '40,416775',
    'Longitud (WGS84)': '-3,703790',
    'Precio Gasoleo A': '1,459',
    'Precio Gasolina 95 E5': '1,529',
    ...parcial
  } as EstacionApi;
}

describe('aNumero', () => {
  it('convierte el texto con coma decimal de la API', () => {
    expect(aNumero('1,459')).toBe(1.459);
  });

  it('devuelve null con la cadena vacía, que es como llega un combustible no servido', () => {
    expect(aNumero('')).toBeNull();
    expect(aNumero('   ')).toBeNull();
  });

  it('devuelve null con valores ausentes o no numéricos', () => {
    expect(aNumero(undefined)).toBeNull();
    expect(aNumero(null)).toBeNull();
    expect(aNumero('sin datos')).toBeNull();
  });

  it('admite coordenadas negativas', () => {
    expect(aNumero('-3,703790')).toBeCloseTo(-3.70379, 6);
  });
});

describe('mapearGasolineras', () => {
  it('lee los campos con tilde y convierte los números', () => {
    const [gasolinera] = mapearGasolineras([estacion()], 'Precio Gasoleo A');

    // El rótulo es una marca y se respeta; el resto llega en mayúsculas y se hace legible.
    expect(gasolinera.rotulo).toBe('REPSOL');
    expect(gasolinera.direccion).toBe('Avenida de la Paz, 12');
    expect(gasolinera.localidad).toBe('Madrid');
    expect(gasolinera.precio).toBe(1.459);
    expect(gasolinera.latitud).toBeCloseTo(40.416775, 6);
    expect(gasolinera.longitud).toBeCloseTo(-3.70379, 6);
  });

  it('descarta las estaciones que no sirven ese combustible', () => {
    const sinPremium = estacion({ 'Precio Gasoleo Premium': '' });

    expect(mapearGasolineras([sinPremium], 'Precio Gasoleo Premium')).toEqual([]);
  });

  it('descarta las estaciones si el campo de combustible no existe', () => {
    expect(mapearGasolineras([estacion()], 'Precio Inventado')).toEqual([]);
  });

  it('aplica el filtro recibido', () => {
    const estaciones = [estacion(), estacion({ IDMunicipio: '9999', 'Rótulo': 'CEPSA' })];

    const resultado = mapearGasolineras(estaciones, 'Precio Gasoleo A', e => e.IDMunicipio === '9999');

    expect(resultado.map(g => g.rotulo)).toEqual(['CEPSA']);
  });

  it('tolera una lista ausente', () => {
    expect(mapearGasolineras(null, 'Precio Gasoleo A')).toEqual([]);
    expect(mapearGasolineras(undefined, 'Precio Gasoleo A')).toEqual([]);
  });
});

describe('mapearProvincias', () => {
  it('lee IDPovincia, que es como lo escribe la API', () => {
    const [provincia] = mapearProvincias([
      { IDPovincia: '28', IDCCAA: '13', Provincia: 'MADRID', CCAA: 'Madrid, Comunidad de' }
    ]);

    expect(provincia.IDProvincia).toBe('28');
    expect(provincia.Provincia).toBe('Madrid');
  });
});

describe('mapearLocalidades', () => {
  it('devuelve cada municipio una sola vez y ordenado', () => {
    const respuesta: RespuestaEstaciones = {
      Fecha: '21/09/2026 9:00:00',
      ResultadoConsulta: 'OK',
      ListaEESSPrecio: [
        estacion({ IDMunicipio: '2', Municipio: 'Zamora' }),
        estacion({ IDMunicipio: '1', Municipio: 'Alcalá' }),
        estacion({ IDMunicipio: '2', Municipio: 'Zamora' })
      ]
    };

    expect(mapearLocalidades(respuesta).map(l => l.Localidad)).toEqual(['Alcalá', 'Zamora']);
  });

  it('tolera una respuesta vacía', () => {
    expect(mapearLocalidades(null)).toEqual([]);
  });
});

describe('comoNombrePropio', () => {
  it('convierte el texto en mayúsculas de la API en algo legible', () => {
    expect(comoNombrePropio('SORIA')).toBe('Soria');
    expect(comoNombrePropio('BURGO DE OSMA (EL)')).toBe('Burgo de Osma (El)');
  });

  it('deja en minúscula las palabras de enlace salvo al principio', () => {
    expect(comoNombrePropio('AVENIDA DE LA PAZ, 12')).toBe('Avenida de la Paz, 12');
    expect(comoNombrePropio('DE LA FUENTE')).toBe('De la Fuente');
  });

  it('respeta las tildes y la eñe', () => {
    expect(comoNombrePropio('ALCALÁ DE HENARES')).toBe('Alcalá de Henares');
    expect(comoNombrePropio('A CORUÑA')).toBe('A Coruña');
  });

  it('tolera un valor ausente', () => {
    expect(comoNombrePropio(null)).toBe('');
    expect(comoNombrePropio(undefined)).toBe('');
  });
});

describe('precioMedio', () => {
  it('redondea a tres decimales', () => {
    const gasolineras = mapearGasolineras(
      [estacion({ 'Precio Gasoleo A': '1,50' }), estacion({ 'Precio Gasoleo A': '1,60' })],
      'Precio Gasoleo A'
    );

    expect(precioMedio(gasolineras)).toBe(1.55);
  });

  it('devuelve cero sin gasolineras, en lugar de NaN', () => {
    expect(precioMedio([])).toBe(0);
  });
});
