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
    { nombre: 'Badajoz' }
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

    expect(opciones().map(o => o.textContent?.trim())).toEqual(['Madrid', 'Barcelona', 'Badajoz']);
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
    expect(opciones()).toHaveLength(3);
  });

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
