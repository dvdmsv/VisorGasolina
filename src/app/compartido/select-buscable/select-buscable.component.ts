import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';

/**
 * Pasa a minúsculas y quita los acentos, para que «agreda» encuentre «Ágreda» y
 * «coruna» encuentre «A Coruña». Media España se escribe con tilde y nadie la teclea
 * al buscar.
 */
function paraBuscar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

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
    '(document:click)': 'alClicarFuera($event)'
  }
})
export class SelectBuscableComponent<T> {
  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly campoBusqueda = viewChild<ElementRef<HTMLInputElement>>('busqueda');

  readonly opciones = input.required<readonly T[]>();
  readonly etiqueta = input.required<(opcion: T) => string>();
  readonly marcador = input<string>('Selecciona');
  readonly textoBusqueda = input<string>('Buscar...');
  readonly deshabilitado = input<boolean>(false);

  readonly seleccion = output<T>();

  protected readonly abierto = signal(false);
  protected readonly filtro = signal('');
  protected readonly seleccionada = signal<T | null>(null);
  /** Opción bajo el cursor del teclado. */
  protected readonly resaltada = signal(0);

  protected readonly opcionesFiltradas = computed(() => {
    const busqueda = paraBuscar(this.filtro().trim());
    const etiquetaDe = this.etiqueta();
    if (busqueda === '') {
      return this.opciones();
    }
    return this.opciones().filter(opcion => paraBuscar(etiquetaDe(opcion)).includes(busqueda));
  });

  /**
   * La opción elegida solo sigue valiendo mientras esté en la lista. Al cambiar de
   * provincia las localidades se reemplazan por completo, y la que estuviera elegida
   * dejaría de corresponderse con los datos que se muestran.
   */
  protected readonly seleccionVigente = computed(() => {
    const opcion = this.seleccionada();
    return opcion !== null && this.opciones().includes(opcion) ? opcion : null;
  });

  protected readonly textoSeleccion = computed(() => {
    const opcion = this.seleccionVigente();
    return opcion === null ? this.marcador() : this.etiqueta()(opcion);
  });

  constructor() {
    // Al abrir, el foco va al buscador: es lo primero que se quiere usar.
    effect(() => {
      if (this.abierto()) {
        queueMicrotask(() => this.campoBusqueda()?.nativeElement.focus());
      }
    });
  }

  protected alternar() {
    if (this.deshabilitado()) {
      return;
    }
    this.abierto.update(abierto => !abierto);
    this.resaltada.set(0);
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
    this.resaltada.set(0);
  }

  protected alTeclear(evento: KeyboardEvent) {
    const total = this.opcionesFiltradas().length;

    switch (evento.key) {
      case 'Escape':
        this.cerrar();
        return;
      case 'ArrowDown':
        evento.preventDefault();
        this.resaltada.update(i => (total === 0 ? 0 : (i + 1) % total));
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.resaltada.update(i => (total === 0 ? 0 : (i - 1 + total) % total));
        break;
      case 'Home':
        evento.preventDefault();
        this.resaltada.set(0);
        break;
      case 'End':
        evento.preventDefault();
        this.resaltada.set(Math.max(0, total - 1));
        break;
      case 'Enter': {
        evento.preventDefault();
        const opcion = this.opcionesFiltradas()[this.resaltada()];
        if (opcion !== undefined) {
          this.elegir(opcion);
        }
        return;
      }
      default:
        return;
    }

    this.desplazarHastaResaltada();
  }

  protected alClicarFuera(evento: MouseEvent) {
    if (this.abierto() && !this.elemento.nativeElement.contains(evento.target as Node)) {
      this.cerrar();
    }
  }

  private desplazarHastaResaltada() {
    queueMicrotask(() => {
      const opcion = this.elemento.nativeElement.querySelector('.opcion-resaltada');
      // scrollIntoView no existe en todos los entornos (jsdom no lo implementa), y el
      // desplazamiento es una comodidad: nunca debe romper la navegación por teclado.
      opcion?.scrollIntoView?.({ block: 'nearest' });
    });
  }
}
