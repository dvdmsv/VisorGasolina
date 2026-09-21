import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';

/**
 * Desplegable con buscador, equivalente al mat-select que se usaba antes pero sobre
 * Bootstrap y sin dependencias externas.
 *
 * Es genérico sobre el tipo de opción: recibe la función que extrae la etiqueta de cada una.
 */
@Component({
  selector: 'app-select-buscable',
  templateUrl: './select-buscable.component.html',
  styleUrl: './select-buscable.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'alClicarFuera($event)',
    '(keydown.escape)': 'cerrar()'
  }
})
export class SelectBuscableComponent<T> {
  private readonly elemento = inject(ElementRef<HTMLElement>);

  readonly opciones = input.required<readonly T[]>();
  readonly etiqueta = input.required<(opcion: T) => string>();
  readonly marcador = input<string>('Selecciona');
  readonly textoBusqueda = input<string>('Buscar...');
  readonly deshabilitado = input<boolean>(false);

  readonly seleccion = output<T>();

  protected readonly abierto = signal(false);
  protected readonly filtro = signal('');
  protected readonly seleccionada = signal<T | null>(null);

  protected readonly opcionesFiltradas = computed(() => {
    const busqueda = this.filtro().trim().toLowerCase();
    const etiquetaDe = this.etiqueta();
    if (busqueda === '') {
      return this.opciones();
    }
    return this.opciones().filter(opcion => etiquetaDe(opcion).toLowerCase().includes(busqueda));
  });

  protected readonly textoSeleccion = computed(() => {
    const opcion = this.seleccionada();
    return opcion === null ? this.marcador() : this.etiqueta()(opcion);
  });

  protected alternar() {
    if (this.deshabilitado()) {
      return;
    }
    this.abierto.update(abierto => !abierto);
  }

  protected cerrar() {
    this.abierto.set(false);
  }

  protected elegir(opcion: T) {
    this.seleccionada.set(opcion);
    this.cerrar();
    this.filtro.set('');
    this.seleccion.emit(opcion);
  }

  protected actualizarFiltro(evento: Event) {
    this.filtro.set((evento.target as HTMLInputElement).value);
  }

  protected alClicarFuera(evento: MouseEvent) {
    if (this.abierto() && !this.elemento.nativeElement.contains(evento.target as Node)) {
      this.cerrar();
    }
  }
}
