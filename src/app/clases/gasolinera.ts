export class Gasolinera {
    
    public distancia?: number;
    costeTotal?: number; // El precio final (Gasolina + Viaje)
    ahorro?: number;     // Diferencia respecto a la mejor opción

    constructor(public rotulo: string, public localidad: String, public provincia: string, public direccion: string, public precio: number, public latitud: number, public longitud: number, public gasolina: string, public favorito: boolean){}
}
