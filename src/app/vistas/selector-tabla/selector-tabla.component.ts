import { HttpClient, HttpEventType } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';
import { Gasolinera } from 'src/app/clases/gasolinera';
import { Localidad } from 'src/app/clases/localidad';
import { Provincia } from 'src/app/clases/provincia';
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
export class SelectorTablaComponent implements OnDestroy {

  private destroy$ = new Subject<void>();
  private filtroNombre$ = new Subject<string>();

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

  arrGasolinerasTemp: any = [];
  arrGasolineras: Gasolinera[] = [];
  arrGasolinerasFiltradasNombre: Gasolinera[] = [];

  precioTotal: number = 0;
  precioMedio: number = 0;

  datosCargados: boolean = true;
  sinDatos: boolean = true;

  columnasGasolinera: string[] = ['gasolinera', 'direccion', 'precio'];

  fechaActualizacion: string = "";
  nombreLocalidad: string = "";

  arrProvinciasTemp: any = [];
  arrProvincias: Provincia[] = [];

  arrLocalidadesTemp: any = [];
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
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.getProvincias();
    this.apiGasolina.getGasolinera().pipe(takeUntil(this.destroy$)).subscribe();

    if (this.getCookie("IDMunicipio") != "") {
      this.getGasolinerasLocalidad(this.getCookie("IDMunicipio"));
    } else if (this.getCookie("IDProvincia") != "") {
      this.getGasolinerasProvincia(this.getCookie("IDProvincia"));
    }
    this.nombreLocalidad = this.getCookie("Localidad");

    if (this.arrGasolineras.length == 0 && this.arrGasolinerasFiltradasNombre.length == 0) {
      this.sinDatos = true;
    }

    this.filtroNombre$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(valor => this.aplicarFiltroNombre(valor));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.filtroNombre$.next(this.filtroNombre);
  }

  private aplicarFiltroNombre(valor: string) {
    if (valor.trim() === "") {
      this.arrGasolinerasFiltradasNombre = this.arrGasolineras;
    } else {
      this.arrGasolinerasFiltradasNombre = this.arrGasolineras.filter(gasolinera =>
        gasolinera.rotulo.toLowerCase().includes(valor.toLowerCase()));
      this.paginacion();
    }
    this.cdr.markForCheck();
  }

  vaciarFiltroNombre() {
    this.filtroNombre = "";
    this.filtroNombre$.next("");
  }

  paginacion() {
    this.pagina = 1;
    this.calcularCostes();
  }

  scroll() {
    this.scrollToTop();
  }

  getProvincias() {
    this.apiGasolina.getProvincias().pipe(takeUntil(this.destroy$)).subscribe(result => {
      this.arrProvinciasTemp = result;
      this.arrProvincias = [];
      for (const provincia of this.arrProvinciasTemp) {
        this.arrProvincias.push(
          new Provincia(
            provincia.CCAA,
            provincia.IDCCAA,
            provincia.IDPovincia,
            provincia.Provincia
          )
        );
      }
      this.arrProvinciasFiltradas = this.arrProvincias;
      this.cdr.markForCheck();
    });
  }

  getLocalidades(provincia: Provincia) {
    this.setCookie("IDMunicipio", "");
    this.setCookie("IDProvincia", provincia.IDProvincia);
    this.getGasolinerasProvincia(provincia.IDProvincia);

    this.apiGasolina.getLocalidades(provincia.IDProvincia).pipe(takeUntil(this.destroy$)).subscribe(result => {
      this.arrLocalidadesTemp = result;
      this.arrLocalidades = [];

      for (const localidad of this.arrLocalidadesTemp.ListaEESSPrecio) {
        this.arrLocalidades.push(
          new Localidad(
            localidad.CCAA,
            localidad.IDCCAA,
            localidad.IDMunicipio,
            localidad.IDPovincia,
            localidad.Municipio,
            localidad.Provincia
          )
        );
      }

      this.arrLocalidadesUnicas = this.arrLocalidades.filter((localidad, index, self) =>
        self.findIndex((l) => l.IDMunicipio === localidad.IDMunicipio) === index);

      this.arrLocalidadesFiltradas = this.arrLocalidadesUnicas;
      this.cdr.markForCheck();
    });
  }

  getGasolinerasProvincia(IDPovincia: string) {
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.datosCargados = false;
    this.sinDatos = false;
    this.busquedaPorUbicacion = false;

    const tipoGasolina = this.cookie.get("gasolina");

    this.apiGasolina.getGasolinerasProvincia(IDPovincia).pipe(takeUntil(this.destroy$)).subscribe(result => {
      this.arrGasolinerasTemp = result;
      this.arrGasolineras = [];
      this.fechaActualizacion = this.arrGasolinerasTemp.Fecha;

      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if (gasolinera.IDProvincia == IDPovincia && !Number.isNaN(parseFloat(gasolinera[tipoGasolina].replace(",", ".")))) {
          this.arrGasolineras.push(
            new Gasolinera(
              gasolinera['Rótulo'],
              gasolinera.Localidad,
              gasolinera.Provincia,
              gasolinera['Dirección'],
              parseFloat(gasolinera[tipoGasolina].replace(",", ".")),
              parseFloat(gasolinera.Latitud.replace(",", ".")),
              parseFloat(gasolinera["Longitud (WGS84)"].replace(",", ".")),
              tipoGasolina,
              false
            )
          );
        }
      }

      this.arrGasolineras.sort((a, b) => a.precio - b.precio);
      this.datosCargados = true;
      this.sinDatos = false;

      const nombreProv = this.arrGasolineras[0]?.provincia ?? '';
      this.nombreLocalidad = nombreProv;
      this.setCookie('Localidad', nombreProv);

      for (const gasolinera of this.arrGasolineras) {
        this.precioTotal += gasolinera.precio;
      }
      this.precioTotal = this.precioTotal / this.arrGasolineras.length;
      this.precioMedio = parseFloat(this.precioTotal.toFixed(3));
      this.cdr.markForCheck();
    });
  }

  getGasolinerasLocalidad(IDMunicipio: string) {
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.datosCargados = false;
    this.sinDatos = false;
    this.busquedaPorUbicacion = false;

    const tipoGasolina = this.cookie.get("gasolina");

    this.apiGasolina.getGasolinerasLocalidad(IDMunicipio).pipe(takeUntil(this.destroy$)).subscribe(result => {
      this.arrGasolinerasTemp = result;
      this.arrGasolineras = [];
      this.fechaActualizacion = this.arrGasolinerasTemp.Fecha;

      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if (gasolinera.IDMunicipio == IDMunicipio && !Number.isNaN(parseFloat(gasolinera[tipoGasolina].replace(",", ".")))) {
          this.arrGasolineras.push(
            new Gasolinera(
              gasolinera['Rótulo'],
              gasolinera.Localidad,
              gasolinera.Provincia,
              gasolinera['Dirección'],
              parseFloat(gasolinera[tipoGasolina].replace(",", ".")),
              parseFloat(gasolinera.Latitud.replace(",", ".")),
              parseFloat(gasolinera["Longitud (WGS84)"].replace(",", ".")),
              tipoGasolina,
              false
            )
          );
        }
      }

      this.arrGasolineras.sort((a, b) => a.precio - b.precio);
      this.datosCargados = true;
      this.sinDatos = false;

      const nombreLoc = this.arrGasolineras[0]?.localidad ?? '';
      this.nombreLocalidad = nombreLoc;
      this.setCookie('Localidad', nombreLoc);
      this.setCookie('IDMunicipio', IDMunicipio);

      for (const gasolinera of this.arrGasolineras) {
        this.precioTotal += gasolinera.precio;
      }
      this.precioTotal = this.precioTotal / this.arrGasolineras.length;
      this.precioMedio = parseFloat(this.precioTotal.toFixed(3));
      this.cdr.markForCheck();
    });
  }

  guardar(gasolinera: Gasolinera) {
    const fondo = this.darkMode() ? '#2d3436' : '#fff';
    const texto = this.darkMode() ? '#dfe6e9' : '#545454';

    if (!this.favoritosService.comprobarExiste(gasolinera)) {
      gasolinera.favorito = true;
      this.favoritosService.setFavoritos(gasolinera);
      Swal.fire({
        icon: "success",
        title: `${gasolinera.rotulo} guardada en favoritos`,
        showConfirmButton: false,
        timer: 1300,
        background: fondo,
        color: texto
      });
    } else {
      Swal.fire({
        icon: "info",
        title: `${gasolinera.rotulo} ya está en favoritos`,
        showConfirmButton: false,
        timer: 1300,
        background: fondo,
        color: texto
      });
    }
  }

  setCookie(nombreCookie: string, datosCookie: string) {
    this.cookie.set(nombreCookie, datosCookie, { expires: 30, sameSite: 'Strict' });
  }

  getCookie(nombreCookie: string): string {
    return this.cookie.get(nombreCookie);
  }

  obtenerUbicacion() {
    if (navigator.geolocation) {
      this.datosCargados = false;
      this.sinDatos = false;

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.busquedaPorUbicacion = true;
          this.getGasolinerasCercanas(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          this.datosCargados = true;
          this.sinDatos = true;

          let mensaje = 'Error desconocido.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              mensaje = 'El usuario denegó el permiso de ubicación.';
              break;
            case error.POSITION_UNAVAILABLE:
              mensaje = 'La ubicación no está disponible.';
              break;
            case error.TIMEOUT:
              mensaje = 'Se ha agotado el tiempo de espera.';
              break;
          }

          Swal.fire({
            icon: 'warning',
            title: 'No pudimos localizarte',
            text: mensaje + ' Revisa los permisos de tu navegador.',
            background: this.darkMode() ? '#2d3436' : '#fff',
            color: this.darkMode() ? '#dfe6e9' : '#545454'
          });
        },
        options
      );
    } else {
      alert("Tu navegador no soporta geolocalización");
    }
  }

  getGasolinerasCercanas(latUsuario: number, lonUsuario: number) {
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.mostrandoBarra = true;
    this.progresoCarga = 0;
    this.datosCargados = false;
    this.sinDatos = false;

    this.apiGasolina.getGasolinera().pipe(takeUntil(this.destroy$)).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.DownloadProgress) {
          this.progresoCarga = event.total
            ? Math.round(100 * event.loaded / event.total)
            : 0;
        } else if (event.type === HttpEventType.Response) {
          this.mostrandoBarra = false;

          this.arrGasolinerasTemp = event.body;
          this.arrGasolineras = [];
          this.fechaActualizacion = this.arrGasolinerasTemp.Fecha;

          const tipoGasolinaKey = this.cookie.get("gasolina");

          const rango = 0.25;
          const minLat = latUsuario - rango;
          const maxLat = latUsuario + rango;
          const minLon = lonUsuario - rango;
          const maxLon = lonUsuario + rango;

          const tempGasolineras: Gasolinera[] = [];
          const lista = this.arrGasolinerasTemp.ListaEESSPrecio;
          const len = lista.length;

          for (let i = 0; i < len; i++) {
            const gas = lista[i];
            const precioStr = gas[tipoGasolinaKey];
            if (!precioStr) continue;

            const latGas = parseFloat(gas.Latitud.replace(",", "."));
            if (latGas < minLat || latGas > maxLat) continue;

            const lonGas = parseFloat(gas["Longitud (WGS84)"].replace(",", "."));
            if (lonGas < minLon || lonGas > maxLon) continue;

            const precioGas = parseFloat(precioStr.replace(",", "."));
            if (isNaN(precioGas)) continue;

            const distanciaKm = this.calcularDistancia(latUsuario, lonUsuario, latGas, lonGas);
            if (distanciaKm < 20) {
              const nuevaGas = new Gasolinera(
                gas['Rótulo'],
                gas.Localidad,
                gas.Provincia,
                gas['Dirección'],
                precioGas,
                latGas,
                lonGas,
                tipoGasolinaKey,
                false
              );
              nuevaGas.distancia = parseFloat(distanciaKm.toFixed(2));
              tempGasolineras.push(nuevaGas);
            }
          }

          tempGasolineras.sort((a, b) => (a.distancia || 0) - (b.distancia || 0));
          this.arrGasolineras = tempGasolineras.slice(0, 50);

          if (this.arrGasolineras.length > 0) {
            this.precioTotal = this.arrGasolineras.reduce((acc, curr) => acc + curr.precio, 0);
            this.precioMedio = parseFloat((this.precioTotal / this.arrGasolineras.length).toFixed(3));
          }

          this.nombreLocalidad = "Ubicación actual (Radio 20km)";
          this.datosCargados = true;
          this.sinDatos = this.arrGasolineras.length === 0;

          this.filtroNombre = "";
          this.paginacion();
          this.scroll();
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.mostrandoBarra = false;
        this.datosCargados = true;
        this.sinDatos = true;
        console.error("Error descargando gasolineras", err);
        this.cdr.markForCheck();
        Swal.fire({
          icon: 'error',
          title: 'Error de conexión',
          text: 'No se pudieron descargar los datos del Ministerio.'
        });
      }
    });
  }

  calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
