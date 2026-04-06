import { HttpClient, HttpEventType } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, NgZone, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CookieService } from 'ngx-cookie-service';
import { Gasolinera } from 'src/app/clases/gasolinera';
import { Localidad } from 'src/app/clases/localidad';
import { Provincia } from 'src/app/clases/provincia';
import { LocalidadApi, ProvinciaApi, RespuestaGasolineras, RespuestaLocalidades } from 'src/app/interfaces/api-gasolineras.interface';
import { ApiGasolinerasService } from 'src/app/servicios/api-gasolineras.service';
import { FavoritosService } from 'src/app/servicios/favoritos.service';
import Swal from 'sweetalert2';
import { ThemeService } from '../../servicios/theme.service';


@Component({
  selector: 'app-selector-tabla',
  templateUrl: './selector-tabla.component.html',
  styleUrl: './selector-tabla.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectorTablaComponent {

  private readonly destroyRef = inject(DestroyRef);

  // VARIABLES CALCULADORA AHORRO
  modoCalculadora: boolean = false;
  consumo: number = 6.5;
  litros: number = 40;

  // Variables para el filtrado de los selectores
  filtroProvinciaSelect: string = '';
  filtroLocalidadSelect: string = '';

  // Copias filtradas para mostrar en el HTML
  arrProvinciasFiltradas: Provincia[] = [];
  arrLocalidadesFiltradas: Localidad[] = [];

  arrGasolineras: Gasolinera[] = [];

  precioTotal: number = 0;
  precioMedio: number = 0;

  datosCargados: boolean = true;
  sinDatos: boolean = true;

  columnasGasolinera: string[] = ['gasolinera', 'direccion', 'precio'];

  fechaActualizacion: string = "";
  nombreLocalidad: string = "";

  arrProvincias: Provincia[] = [];
  arrLocalidades: Localidad[] = [];
  arrLocalidadesUnicas: Localidad[] = [];

  pagina: number = 1;
  selectedPageSize: number = 10;

  gasolina = this.getCookie("gasolina");
  darkMode = this.themeService.darkMode;

  filtroNombre: string = "";
  busquedaPorUbicacion: boolean = false;
  progresoCarga: number = 0;
  mostrandoBarra: boolean = false;

  constructor(
    private http: HttpClient,
    private apiGasolina: ApiGasolinerasService,
    private cookie: CookieService,
    private themeService: ThemeService,
    private favoritosService: FavoritosService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.getProvincias();

    if (this.getCookie("IDMunicipio") != "") {
      this.getGasolinerasLocalidad(this.getCookie("IDMunicipio"));
    } else {
      this.getGasolinerasProvincia(this.getCookie("IDProvincia"));
    }
    this.nombreLocalidad = this.getCookie("Localidad");

    if (this.arrGasolineras.length == 0) {
      this.sinDatos = true;
    }
  }

  private get swalTheme() {
    return {
      background: this.darkMode() ? '#2d3436' : '#fff',
      color: this.darkMode() ? '#dfe6e9' : '#545454'
    };
  }

  calcularCostes() {
    if (!this.modoCalculadora) {
      if (this.busquedaPorUbicacion) {
        this.arrGasolineras.sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0));
      } else {
        this.arrGasolineras.sort((a, b) => a.precio - b.precio);
      }
      return;
    }

    this.arrGasolineras.forEach(gas => {
      const costeRepostaje = this.litros * gas.precio;
      const litrosGastadosViaje = ((gas.distancia ?? 0) * 2) * (this.consumo / 100);
      const costeViaje = litrosGastadosViaje * gas.precio;
      gas.costeTotal = costeRepostaje + costeViaje;
    });

    this.arrGasolineras.sort((a, b) => (a.costeTotal || 0) - (b.costeTotal || 0));

    if (this.arrGasolineras.length > 0) {
      const mejorPrecioTotal = this.arrGasolineras[0].costeTotal || 0;
      this.arrGasolineras.forEach(gas => {
        gas.ahorro = (gas.costeTotal || 0) - mejorPrecioTotal;
      });
    }
  }

  filtrarProvinciasSelect() {
    const busqueda = this.filtroProvinciaSelect.toLowerCase();
    this.arrProvinciasFiltradas = this.arrProvincias.filter(p =>
      p.Provincia.toLowerCase().includes(busqueda)
    );
  }

  filtrarLocalidadesSelect() {
    const busqueda = this.filtroLocalidadSelect.toLowerCase();
    this.arrLocalidadesFiltradas = this.arrLocalidadesUnicas.filter(l =>
      l.Localidad.toLowerCase().includes(busqueda)
    );
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onPageChange(event: number) {
    this.pagina = event;
    this.scrollToTop();
  }

  filtrarGasolineras() {
    this.paginacion();
  }

  vaciarFiltroNombre() {
    this.filtroNombre = "";
    this.paginacion();
  }

  paginacion() {
    this.pagina = 1;
    this.calcularCostes();
  }

  scroll() {
    this.scrollToTop();
  }

  getProvincias() {
    this.apiGasolina.getProvincias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          const provincias = result as ProvinciaApi[];
          this.arrProvincias = provincias.map(p => new Provincia(p.CCAA, p.IDCCAA, p.IDPovincia, p.Provincia));
          this.arrProvinciasFiltradas = this.arrProvincias;
        },
        error: () => {
          Swal.fire({ icon: 'error', title: 'Error al cargar provincias', text: 'No se pudo obtener el listado de provincias.', ...this.swalTheme });
        }
      });
  }

  getLocalidades(provincia: Provincia) {
    this.setCookie("IDMunicipio", "");
    this.setCookie("IDProvincia", provincia.IDProvincia);
    this.getGasolinerasProvincia(provincia.IDProvincia);

    this.apiGasolina.getLocalidades(provincia.IDProvincia)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          const respuesta = result as RespuestaLocalidades;
          this.arrLocalidades = respuesta.ListaEESSPrecio.map((l: LocalidadApi) =>
            new Localidad(l.CCAA, l.IDCCAA, l.IDMunicipio, l.IDPovincia, l.Municipio, l.Provincia)
          );
          this.arrLocalidadesUnicas = this.arrLocalidades.filter((loc, i, self) =>
            self.findIndex(l => l.IDMunicipio === loc.IDMunicipio) === i
          );
          this.arrLocalidadesFiltradas = this.arrLocalidadesUnicas;
        },
        error: () => {
          Swal.fire({ icon: 'error', title: 'Error al cargar localidades', text: 'No se pudo obtener el listado de localidades.', ...this.swalTheme });
        }
      });
  }

  getGasolinerasProvincia(IDPovincia: string) {
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.datosCargados = false;
    this.sinDatos = false;
    this.busquedaPorUbicacion = false;

    this.apiGasolina.getGasolinerasProvincia(IDPovincia)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          const respuesta = result as RespuestaGasolineras;
          this.fechaActualizacion = respuesta.Fecha;
          this.arrGasolineras = [];

          for (const g of respuesta.ListaEESSPrecio) {
            const precioStr = g[this.cookie.get("gasolina")];
            if (g.IDProvincia == IDPovincia && precioStr && !Number.isNaN(parseFloat(precioStr.replace(",", ".")))) {
              this.arrGasolineras.push(new Gasolinera(
                g['Rótulo'], g.Localidad, g.Provincia, g['Dirección'],
                parseFloat(precioStr.replace(",", ".")),
                parseFloat(g.Latitud.replace(",", ".")),
                parseFloat(g["Longitud (WGS84)"].replace(",", ".")),
                this.cookie.get("gasolina"), false
              ));
            }
            this.setCookie('Localidad', g.Localidad);
            this.nombreLocalidad = g.Provincia;
          }

          this.arrGasolineras.sort((a, b) => a.precio - b.precio);
          this.datosCargados = true;
          this.sinDatos = false;

          if (this.arrGasolineras.length > 0) {
            const total = this.arrGasolineras.reduce((acc, g) => acc + g.precio, 0);
            this.precioMedio = parseFloat((total / this.arrGasolineras.length).toFixed(3));
          }
        },
        error: () => {
          this.datosCargados = true;
          this.sinDatos = true;
          Swal.fire({ icon: 'error', title: 'Error al cargar gasolineras', text: 'No se pudieron obtener los datos de la provincia.', ...this.swalTheme });
        }
      });
  }

  getGasolinerasLocalidad(IDMunicipio: string) {
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.datosCargados = false;
    this.sinDatos = false;
    this.busquedaPorUbicacion = false;

    this.apiGasolina.getGasolinerasLocalidad(IDMunicipio)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          const respuesta = result as RespuestaGasolineras;
          this.fechaActualizacion = respuesta.Fecha;
          this.arrGasolineras = [];

          for (const g of respuesta.ListaEESSPrecio) {
            const precioStr = g[this.cookie.get("gasolina")];
            if (g.IDMunicipio == IDMunicipio && precioStr && !Number.isNaN(parseFloat(precioStr.replace(",", ".")))) {
              this.arrGasolineras.push(new Gasolinera(
                g['Rótulo'], g.Localidad, g.Provincia, g['Dirección'],
                parseFloat(precioStr.replace(",", ".")),
                parseFloat(g.Latitud.replace(",", ".")),
                parseFloat(g["Longitud (WGS84)"].replace(",", ".")),
                this.cookie.get("gasolina"), false
              ));
            }
            this.setCookie('Localidad', g.Localidad);
            this.nombreLocalidad = g.Localidad;
          }

          this.arrGasolineras.sort((a, b) => a.precio - b.precio);
          this.datosCargados = true;
          this.sinDatos = false;

          if (this.arrGasolineras.length > 0) {
            const total = this.arrGasolineras.reduce((acc, g) => acc + g.precio, 0);
            this.precioMedio = parseFloat((total / this.arrGasolineras.length).toFixed(3));
          }

          this.setCookie('IDMunicipio', IDMunicipio);
        },
        error: () => {
          this.datosCargados = true;
          this.sinDatos = true;
          Swal.fire({ icon: 'error', title: 'Error al cargar gasolineras', text: 'No se pudieron obtener los datos de la localidad.', ...this.swalTheme });
        }
      });
  }

  guardar(gasolinera: Gasolinera) {
    if (!this.favoritosService.comprobarExiste(gasolinera)) {
      gasolinera.favorito = true;
      this.favoritosService.setFavoritos(gasolinera);
      Swal.fire({ icon: "success", title: `${gasolinera.rotulo} guardada en favoritos`, showConfirmButton: false, timer: 1300, ...this.swalTheme });
    } else {
      Swal.fire({ icon: "info", title: `${gasolinera.rotulo} ya está en favoritos`, showConfirmButton: false, timer: 1300, ...this.swalTheme });
    }
  }

  setCookie(nombreCookie: string, datosCookie: string) {
    this.cookie.set(nombreCookie, datosCookie, 30);
  }

  getCookie(nombreCookie: string): string {
    return this.cookie.get(nombreCookie);
  }

  obtenerUbicacion() {
    if (!navigator.geolocation) {
      Swal.fire({ icon: 'error', title: 'No disponible', text: 'Tu navegador no soporta geolocalización.', ...this.swalTheme });
      return;
    }

    this.datosCargados = false;
    this.sinDatos = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          this.busquedaPorUbicacion = true;
          this.getGasolinerasCercanas(position.coords.latitude, position.coords.longitude);
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.datosCargados = true;
          this.sinDatos = true;

          let mensaje = 'Error desconocido.';
          switch (error.code) {
            case error.PERMISSION_DENIED:   mensaje = 'El usuario denegó el permiso de ubicación.'; break;
            case error.POSITION_UNAVAILABLE: mensaje = 'La ubicación no está disponible.'; break;
            case error.TIMEOUT:              mensaje = 'Se ha agotado el tiempo de espera.'; break;
          }

          Swal.fire({ icon: 'warning', title: 'No pudimos localizarte', text: mensaje + ' Revisa los permisos de tu navegador.', ...this.swalTheme });
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  getGasolinerasCercanas(latUsuario: number, lonUsuario: number) {
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.mostrandoBarra = true;
    this.progresoCarga = 0;
    this.datosCargados = false;
    this.sinDatos = false;

    this.cdr.markForCheck();

    this.apiGasolina.getGasolinera()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.DownloadProgress) {
            this.progresoCarga = event.total ? Math.round(100 * event.loaded / event.total) : 0;
          } else if (event.type === HttpEventType.Response) {
            this.mostrandoBarra = false;

            const respuesta = event.body as RespuestaGasolineras;
            this.fechaActualizacion = respuesta.Fecha;
            this.arrGasolineras = [];

            const tipoGasolinaKey = this.cookie.get("gasolina");
            const rango = 0.25;
            const minLat = latUsuario - rango, maxLat = latUsuario + rango;
            const minLon = lonUsuario - rango, maxLon = lonUsuario + rango;

            const tempGasolineras: Gasolinera[] = [];
            const lista = respuesta.ListaEESSPrecio;

            for (let i = 0; i < lista.length; i++) {
              const g = lista[i];
              const precioStr = g[tipoGasolinaKey];
              if (!precioStr) continue;

              const latGas = parseFloat(g.Latitud.replace(",", "."));
              if (latGas < minLat || latGas > maxLat) continue;

              const lonGas = parseFloat(g["Longitud (WGS84)"].replace(",", "."));
              if (lonGas < minLon || lonGas > maxLon) continue;

              const precioGas = parseFloat(precioStr.replace(",", "."));
              if (isNaN(precioGas)) continue;

              const distanciaKm = this.calcularDistancia(latUsuario, lonUsuario, latGas, lonGas);
              if (distanciaKm < 20) {
                const nuevaGas = new Gasolinera(g['Rótulo'], g.Localidad, g.Provincia, g['Dirección'], precioGas, latGas, lonGas, tipoGasolinaKey, false);
                nuevaGas.distancia = parseFloat(distanciaKm.toFixed(2));
                tempGasolineras.push(nuevaGas);
              }
            }

            tempGasolineras.sort((a, b) => (a.distancia || 0) - (b.distancia || 0));
            this.arrGasolineras = tempGasolineras.slice(0, 50);

            if (this.arrGasolineras.length > 0) {
              const total = this.arrGasolineras.reduce((acc, g) => acc + g.precio, 0);
              this.precioMedio = parseFloat((total / this.arrGasolineras.length).toFixed(3));
            }

            this.nombreLocalidad = "Ubicación actual (Radio 20km)";
            this.datosCargados = true;
            this.sinDatos = this.arrGasolineras.length === 0;
            this.filtroNombre = "";
            this.paginacion();
            this.scroll();
          }
        },
        error: () => {
          this.mostrandoBarra = false;
          this.datosCargados = true;
          this.sinDatos = true;
          Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No se pudieron descargar los datos del Ministerio.', ...this.swalTheme });
        }
      });
  }

  trackByProvincia(_index: number, p: Provincia): string { return p.IDProvincia; }
  trackByLocalidad(_index: number, l: Localidad): string { return l.IDMunicipio; }
  trackByGasolinera(_index: number, g: Gasolinera): string { return `${g.latitud}_${g.longitud}`; }

  calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
