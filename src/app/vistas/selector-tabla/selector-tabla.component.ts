import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
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
  styleUrl: './selector-tabla.component.css'
})
export class SelectorTablaComponent {
  //Array temporal con los datos devueltos por el servicio
  arrGasolinerasTemp: any = [];
  //Array de objetos Gasolinera
  arrGasolineras: Gasolinera[] = [];
  // Array de gasolineras filtradas por nombre
  arrGasolinerasFiltradasNombre: Gasolinera[] = [];

  //Precio total y precio medio
  precioTotal: number = 0;
  precioMedio: number = 0;

  //Flag que controla si los datos se han cargado 
  datosCargados: boolean = true;

  sinDatos: boolean = true;

  //Columnas de la tabla
  columnasGasolinera: string[] = ['gasolinera', 'direccion', 'precio'];

  //Variable que contiene la fecha obtenida por el servicio
  fechaActualizacion: String = "";

  //Variable que contiene el nombre de la localidad/provincia
  nombreLocalidad: String = "";

  //Array temporal de datos devueltos por el servicio
  arrProvinciasTemp: any = [];
  //Array de objetos Provincia
  arrProvincias: Provincia[] = [];

  //Array temporal de datos devueltos por el servicio
  arrLocalidadesTemp: any = [];
  //Array de objetos Localidad
  arrLocalidades: Localidad[] = [];
  //Array con las localidades sin repetir
  arrLocalidadesUnicas: Localidad[] = [];

  //Pagina de la paginacion
  pagina: number = 1;

  //Tamaño de la paginacion
  selectedPageSize: number = 10;

  //Obtiene el tipo de gasolina que se quiere buscar de las cookies
  gasolina = this.getCookie("gasolina");

  //Variable que controla el modo oscuro
  darkMode = this.themeService.darkMode;

  filtroNombre: string = "";

  // Controla si estamos mostrando resultados por GPS
  busquedaPorUbicacion: boolean = false;

  constructor(private http: HttpClient, private apiGasolina: ApiGasolinerasService, private cookie: CookieService, private themeService: ThemeService, private favoritosService: FavoritosService) { }

  ngOnInit() {

    //Se obtienen todas las provincias para el selector de provincias
    this.getProvincias();

    //Si el ID del municipio esta no está vacio en las cookies
    if (this.getCookie("IDMunicipio") != "") {
      this.getGasolinerasLocalidad(this.getCookie("IDMunicipio")); //Se obtienen las gasolineras del municipio
    } else {//Si está vacío
      this.getGasolinerasProvincia(this.getCookie("IDProvincia")); //Se obtienen las gasolineras de la provincia
    }
    //Se guarda el nombre de la localidad
    this.nombreLocalidad = this.getCookie("Localidad");

    if (this.arrGasolineras.length == 0 && this.arrGasolinerasFiltradasNombre.length == 0) {
      this.sinDatos = true;
    }
  }

  //Funcion que filtra las gasolineras por nombre
  filtrarGasolineras() {
    if (this.filtroNombre.trim() === "") {
      this.arrGasolinerasFiltradasNombre = this.arrGasolineras;
    } else {
      this.arrGasolinerasFiltradasNombre = this.arrGasolineras.filter(gasolinera =>
        gasolinera.rotulo.toLowerCase().includes(this.filtroNombre.toLowerCase()));
      this.paginacion();
    }
  }

  vaciarFiltroNombre() {
    this.filtroNombre = "";
  }

  //Establece la pagina de la paginacion en 1
  paginacion() {
    this.pagina = 1;
  }

  //Funcion que obtiene las provincias
  getProvincias() {
    this.apiGasolina.getProvincias().subscribe(result => {
      this.arrProvinciasTemp = [];
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
    });
  }

  //Funcion que obtiene las localidades
  getLocalidades(provincia: Provincia) {
    this.setCookie("IDMunicipio", ""); //Se elimina el ID del municipio para que no solape la seleccion de una provincia diferente
    this.setCookie("IDProvincia", provincia.IDProvincia);
    this.getGasolinerasProvincia(provincia.IDProvincia);
    this.apiGasolina.getLocalidades(provincia.IDProvincia).subscribe(result => {
      this.arrLocalidadesTemp = [];
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
    });
  }

  getGasolinerasProvincia(IDPovincia: string) {
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.datosCargados = false;
    this.sinDatos = false;
    this.busquedaPorUbicacion = false;

    this.apiGasolina.getGasolinerasProvincia(IDPovincia).subscribe(result => {
      this.arrGasolinerasTemp = [];
      this.arrGasolinerasTemp = result; //Se guardan los datos en un array temporal
      this.arrGasolineras = []; //Se vacía el array de gasolineras ppara tenerlo limpio
      this.fechaActualizacion = this.arrGasolinerasTemp.Fecha; //Se obtiene la fecha de la api

      //Se recorre el array de gasolinerasTemp introduciendo un objeto gasolinera en el array de gasolineras
      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if (gasolinera.IDProvincia == IDPovincia && !Number.isNaN(parseFloat(gasolinera[this.cookie.get("gasolina")].replace(",", ".")))) {
          this.arrGasolineras.push(
            new Gasolinera(
              gasolinera['Rótulo'],
              gasolinera.Localidad,
              gasolinera.Provincia,
              gasolinera['Dirección'],
              parseFloat(gasolinera[this.cookie.get("gasolina")].replace(",", ".")),
              parseFloat(gasolinera.Latitud.replace(",", ".")),
              parseFloat(gasolinera["Longitud (WGS84)"].replace(",", ".")),
              this.cookie.get("gasolina"),
              false
            )
          );
        }
        this.arrGasolineras.sort((a, b) => a.precio - b.precio); //Se ordenan los datos por precio de menos a mayor
        this.datosCargados = true; //Flag que controla que se carguen los datos
        this.sinDatos = false;
        this.setCookie('Localidad', gasolinera.Localidad);
        this.nombreLocalidad = gasolinera.Provincia;
      }

      //Se recorre el array de gasolineras obteniendo el precio total de las gasolineras
      //Se recorre el array de gasolineras obteniendo la localidad y guardandola en el array temporal de localidades
      for (const gasolinera of this.arrGasolineras) {
        this.precioTotal += gasolinera.precio;
      }

      //Se obtiene el precio medio de las gasolineras
      this.precioTotal = this.precioTotal / this.arrGasolineras.length;
      this.precioMedio = parseFloat(this.precioTotal.toFixed(3));
    })
  }
  getGasolinerasLocalidad(IDMunicipio: string) {
    console.log(IDMunicipio)
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.datosCargados = false;
    this.sinDatos = false;
    this.busquedaPorUbicacion = false;

    this.apiGasolina.getGasolinerasLocalidad(IDMunicipio).subscribe(result => {
      this.arrGasolinerasTemp = [];
      this.arrGasolinerasTemp = result; //Se guardan los datos en un array temporal
      this.arrGasolineras = []; //Se vacía el array de gasolineras ppara tenerlo limpio
      this.fechaActualizacion = this.arrGasolinerasTemp.Fecha; //Se obtiene la fecha de la api

      //Se recorre el array de gasolinerasTemp introduciendo un objeto gasolinera en el array de gasolineras
      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if (gasolinera.IDMunicipio == IDMunicipio && !Number.isNaN(parseFloat(gasolinera[this.cookie.get("gasolina")].replace(",", ".")))) {
          this.arrGasolineras.push(
            new Gasolinera(
              gasolinera['Rótulo'],
              gasolinera.Localidad,
              gasolinera.Provincia,
              gasolinera['Dirección'],
              parseFloat(gasolinera[this.cookie.get("gasolina")].replace(",", ".")),
              parseFloat(gasolinera.Latitud.replace(",", ".")),
              parseFloat(gasolinera["Longitud (WGS84)"].replace(",", ".")),
              this.cookie.get("gasolina"),
              false
            )
          );
        }
        this.arrGasolineras.sort((a, b) => a.precio - b.precio); //Se ordenan los datos por precio de menos a mayor
        this.datosCargados = true; //Flag que controla que se carguen los datos
        this.sinDatos = false;
        this.setCookie('Localidad', gasolinera.Localidad);
        this.nombreLocalidad = gasolinera.Localidad;
      }

      //Se recorre el array de gasolineras obteniendo el precio total de las gasolineras
      //Se recorre el array de gasolineras obteniendo la localidad y guardandola en el array temporal de localidades
      for (const gasolinera of this.arrGasolineras) {
        this.precioTotal += gasolinera.precio;
      }

      //Se obtiene el precio medio de las gasolineras
      this.precioTotal = this.precioTotal / this.arrGasolineras.length;
      this.precioMedio = parseFloat(this.precioTotal.toFixed(3));

      this.setCookie('IDMunicipio', IDMunicipio);

    })
  }

  guardar(gasolinera: Gasolinera) {
    if (!this.favoritosService.comprobarExiste(gasolinera)) {
      gasolinera.favorito = true;
      this.favoritosService.setFavoritos(gasolinera);
      Swal.fire({
        icon: "success",
        title: `${gasolinera.rotulo} guardada en favoritos`,
        showConfirmButton: false,
        timer: 1300
      });
    } else {
      Swal.fire({
        icon: "info",
        title: `${gasolinera.rotulo} ya está en favoritos`,
        showConfirmButton: false,
        timer: 1300
      });
    }
  }

  setCookie(nombreCookie: string, datosCookie: string) {
    this.cookie.set(nombreCookie, datosCookie, 30);
  }

  getCookie(nombreCookie: string): string {
    return this.cookie.get(nombreCookie);
  }

  // --- GEOLOCALIZACIÓN ---

  obtenerUbicacion() {
    if (navigator.geolocation) {
      this.datosCargados = false;
      this.sinDatos = false;

      // Opciones para forzar la precisión y evitar que se cuelgue en iOS
      const options = {
        enableHighAccuracy: true, // Pide GPS real (más preciso)
        timeout: 10000,           // Espera máximo 10 segundos
        maximumAge: 0             // No uses caché vieja, busca ahora
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.busquedaPorUbicacion = true;
          this.getGasolinerasCercanas(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          this.datosCargados = true;
          this.sinDatos = true;

          // Gestión de errores específica
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
            text: mensaje + ' Revisa los permisos de tu navegador.'
          });
        },
        options // <--- IMPORTANTE: Pasamos las opciones aquí
      );
    } else {
      alert("Tu navegador no soporta geolocalización");
    }
  }

  getGasolinerasCercanas(latUsuario: number, lonUsuario: number) {
    this.precioMedio = 0;
    this.precioTotal = 0;

    // Llamamos al servicio getGasolinera() que trae TODAS las de España
    this.apiGasolina.getGasolinera().subscribe(result => {
      this.arrGasolinerasTemp = result;
      this.arrGasolineras = [];
      this.fechaActualizacion = this.arrGasolinerasTemp.Fecha;

      const tipoGasolinaKey = this.cookie.get("gasolina");
      let tempGasolineras: Gasolinera[] = [];

      // Recorremos el JSON gigante
      for (const gas of this.arrGasolinerasTemp.ListaEESSPrecio) {
        // 1. Verificar si tiene precio para el combustible seleccionado
        const precioStr = gas[tipoGasolinaKey];
        if (!precioStr) continue;

        // 2. Parsear coordenadas y precio (cambiar coma por punto)
        const latGas = parseFloat(gas.Latitud.replace(",", "."));
        const lonGas = parseFloat(gas["Longitud (WGS84)"].replace(",", "."));
        const precioGas = parseFloat(precioStr.replace(",", "."));

        if (isNaN(latGas) || isNaN(lonGas) || isNaN(precioGas)) continue;

        // 3. Calcular distancia
        const distanciaKm = this.calcularDistancia(latUsuario, lonUsuario, latGas, lonGas);

        // 4. FILTRO: Solo guardamos las que estén a menos de 50km
        if (distanciaKm < 50) {
          let nuevaGas = new Gasolinera(
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
          // Asignamos la distancia a la propiedad opcional que creamos
          nuevaGas.distancia = parseFloat(distanciaKm.toFixed(2));
          tempGasolineras.push(nuevaGas);
        }
      }

      // 5. Ordenar por cercanía (menor distancia primero)
      tempGasolineras.sort((a, b) => (a.distancia || 0) - (b.distancia || 0));

      // 6. Nos quedamos con las 50 más cercanas para no saturar la tabla
      this.arrGasolineras = tempGasolineras.slice(0, 50);

      // Calcular medias
      for (const g of this.arrGasolineras) {
        this.precioTotal += g.precio;
      }
      if (this.arrGasolineras.length > 0) {
        this.precioTotal = this.precioTotal / this.arrGasolineras.length;
        this.precioMedio = parseFloat(this.precioTotal.toFixed(3));
      }

      // Actualizar UI
      this.nombreLocalidad = "Ubicación actual (Radio 50km)";
      this.datosCargados = true;
      this.sinDatos = this.arrGasolineras.length === 0;
      this.paginacion(); // Resetear página a 1
    });
  }

  // Fórmula matemática para distancia en km
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
