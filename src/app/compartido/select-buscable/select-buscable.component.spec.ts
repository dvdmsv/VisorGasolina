import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SelectBuscableComponent } from './select-buscable.component';

interface Opcion {
  nombre: string;
}

@Component({
  imports: [SelectBuscableComponent],
  template: `
    <app-select-buscable
      [opciones]="opciones()"
      [etiqueta]="nombreDe"
      marcador="Provincia"
      (seleccion)="elegida.set($event)" />
  `
})
class AnfitrionDePrueba {
  readonly opciones = signal<Opcion[]>([
    { nombre: 'Madrid' },
    { nombre: 'Barcelona' },
    { nombre: 'Badajoz' },
    { nombre: 'Ágreda' },
    { nombre: 'A Coruña' }
  ]);
  readonly elegida = signal<Opcion | null>(null);
  readonly nombreDe = (opcion: Opcion) => opcion.nombre;
}

describe('SelectBuscableComponent', () => {
  let fixture: ComponentFixture<AnfitrionDePrueba>;
  let anfitrion: AnfitrionDePrueba;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [AnfitrionDePrueba] }).compileComponents();
    fixture = TestBed.createComponent(AnfitrionDePrueba);
    anfitrion = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra el marcador mientras no hay selección', () => {
    expect(boton().textContent).toContain('Provincia');
  });

  it('no despliega las opciones hasta que se pulsa', () => {
    expect(opciones()).toHaveLength(0);

    abrir();

    expect(opciones().map(o => o.textContent?.trim())).toEqual(['Madrid', 'Barcelona', 'Badajoz', 'Ágreda', 'A Coruña']);
  });

  it('filtra las opciones por el texto buscado', () => {
    abrir();
    buscar('bad');

    expect(opciones().map(o => o.textContent?.trim())).toEqual(['Badajoz']);
  });

  it('ignora mayúsculas al buscar', () => {
    abrir();
    buscar('MADRID');

    expect(opciones()).toHaveLength(1);
  });

  it('encuentra los nombres con tilde aunque se escriban sin ella', () => {
    // Media España lleva tilde y nadie la teclea al buscar.
    abrir();
    buscar('agreda');

    expect(opciones().map(o => o.textContent?.trim())).toEqual(['Ágreda']);
  });

  it('encuentra la eñe escrita como ene', () => {
    abrir();
    buscar('coruna');

    expect(opciones().map(o => o.textContent?.trim())).toEqual(['A Coruña']);
  });

  it('también encuentra escribiendo la tilde', () => {
    abrir();
    buscar('Ágreda');

    expect(opciones()).toHaveLength(1);
  });

  it('avisa cuando ninguna opción coincide', () => {
    abrir();
    buscar('zzz');

    expect(opciones()).toHaveLength(0);
    expect(elemento().textContent).toContain('Sin resultados');
  });

  it('emite la opción elegida, la muestra y cierra el panel', () => {
    abrir();
    opciones()[1].click();
    fixture.detectChanges();

    expect(anfitrion.elegida()?.nombre).toBe('Barcelona');
    expect(boton().textContent).toContain('Barcelona');
    expect(opciones()).toHaveLength(0);
  });

  it('reinicia el filtro tras elegir', () => {
    abrir();
    buscar('bad');
    opciones()[0].click();
    fixture.detectChanges();

    abrir();
    expect(opciones()).toHaveLength(5);
  });

  describe('cuando cambian las opciones', () => {
    it('olvida la elegida si ya no está en la lista', () => {
      abrir();
      opciones()[0].click();
      fixture.detectChanges();
      expect(boton().textContent).toContain('Madrid');

      // Es lo que pasa al cambiar de provincia: llegan otras localidades.
      anfitrion.opciones.set([{ nombre: 'Soria' }, { nombre: 'Ágreda' }]);
      fixture.detectChanges();

      expect(boton().textContent).toContain('Provincia');
      expect(boton().textContent).not.toContain('Madrid');
    });

    it('mantiene la elegida si sigue estando', () => {
      abrir();
      opciones()[0].click();
      fixture.detectChanges();

      const madrid = anfitrion.opciones()[0];
      anfitrion.opciones.set([madrid, { nombre: 'Soria' }]);
      fixture.detectChanges();

      expect(boton().textContent).toContain('Madrid');
    });

    it('una opción nueva con el mismo nombre no se da por elegida', () => {
      abrir();
      opciones()[0].click();
      fixture.detectChanges();

      // Misma etiqueta pero otro dato: al recargar la provincia se remapea todo.
      anfitrion.opciones.set([{ nombre: 'Madrid' }]);
      fixture.detectChanges();

      expect(boton().textContent).toContain('Provincia');
    });
  });

  describe('teclado', () => {
    it('recorre las opciones con las flechas y elige con Enter', () => {
      abrir();
      pulsar('ArrowDown');
      pulsar('Enter');

      expect(anfitrion.elegida()?.nombre).toBe('Barcelona');
    });

    it('vuelve al principio al pasar de la última opción', () => {
      abrir();
      for (let i = 0; i < anfitrion.opciones().length; i++) {
        pulsar('ArrowDown');
      }

      expect(resaltada()?.textContent?.trim()).toBe('Madrid');
    });

    it('Home y End saltan a los extremos', () => {
      abrir();
      pulsar('End');
      expect(resaltada()?.textContent?.trim()).toBe('A Coruña');

      pulsar('Home');
      expect(resaltada()?.textContent?.trim()).toBe('Madrid');
    });

    it('Escape cierra sin elegir', () => {
      abrir();
      pulsar('Escape');

      expect(opciones()).toHaveLength(0);
      expect(anfitrion.elegida()).toBeNull();
    });

    it('elige sobre la lista ya filtrada', () => {
      abrir();
      buscar('bar');
      pulsar('Enter');

      expect(anfitrion.elegida()?.nombre).toBe('Barcelona');
    });
  });

  function pulsar(key: string) {
    const entrada = elemento().querySelector('input') as HTMLInputElement;
    entrada.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  }

  function resaltada(): HTMLElement | null {
    return elemento().querySelector('.opcion-resaltada');
  }

  function elemento(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function boton(): HTMLButtonElement {
    return elemento().querySelector('.form-select') as HTMLButtonElement;
  }

  function abrir() {
    boton().click();
    fixture.detectChanges();
  }

  function buscar(texto: string) {
    const entrada = elemento().querySelector('input') as HTMLInputElement;
    entrada.value = texto;
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function opciones(): HTMLButtonElement[] {
    return Array.from(elemento().querySelectorAll('.opcion'));
  }
});
