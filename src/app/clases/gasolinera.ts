export class Gasolinera {
    
    public distancia?: number;

    constructor(public rotulo: string, public localidad: String, public provincia: string, public direccion: string, public precio: number, public latitud: number, public longitud: number, public gasolina: string, public favorito: boolean){}
}
