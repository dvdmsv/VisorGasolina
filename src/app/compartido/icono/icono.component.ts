import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Iconos de Bootstrap Icons embebidos como SVG.
 *
 * La app solo usa un puñado, así que incluir la fuente completa (unos 100 kB de CSS más
 * los ficheros de fuente) no compensa.
 */
const ICONOS = {
  geo: 'M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6',
  luna: 'M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278',
  mas: 'M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4',
  papelera: 'M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0',
  surtidor: 'M3 2.5A1.5 1.5 0 0 1 4.5 1h3A1.5 1.5 0 0 1 9 2.5v10.795l.036-.037.098-.099.278-.28a288 288 0 0 1 3.792-3.72l.048-.046.014-.013.001-.001L13 8.5l.267.6a.5.5 0 0 1-.13.818l-.618.309a.5.5 0 0 0-.276.447v1.826a1.5 1.5 0 0 0 3 0V7.5a.5.5 0 0 1 1 0v4.5a2.5 2.5 0 0 1-5 0v-1.826c0-.026.002-.052.005-.078L9 13.5V15h.5a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1H3zM4.5 2a.5.5 0 0 0-.5.5V6h4V2.5a.5.5 0 0 0-.5-.5z',
  velocimetro: 'M8 2a.5.5 0 0 1 .5.5V4a.5.5 0 0 1-1 0V2.5A.5.5 0 0 1 8 2M3.732 3.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707M2 8a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 8m9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5m.754-4.246a.39.39 0 0 0-.527-.02L7.547 7.31A.91.91 0 1 0 8.85 8.569l3.434-4.297a.39.39 0 0 0-.029-.518z',
  cruz: 'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16'
} as const;

export type NombreIcono = keyof typeof ICONOS;

@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="tamano()" [attr.height]="tamano()"
         fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path [attr.d]="ruta()" />
      @if (nombre() === 'cruz') {
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
      }
    </svg>
  `,
  styles: ':host { display: inline-flex; align-items: center; }'
})
export class IconoComponent {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input<number>(16);

  protected readonly ruta = computed(() => ICONOS[this.nombre()]);
}
