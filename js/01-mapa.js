/* 01 MAPA */

const mapa = L.map("mapa", {
    center: [37.4, -5.9],
    zoom: 13,
    zoomControl: false,
    minZoom: 6,
    maxZoom: 20
});

const parametros = new URLSearchParams(window.location.search);
const lat = parseFloat(parametros.get("lat"));
const lng = parseFloat(parametros.get("lng"));
const zoom = parseInt(parametros.get("z"));
const fidRefugioParaAbrir = parametros.get('fid');

//VISTA INICIAL REPSONSIVA SEGÚN EL DISPOSITIVO

const limitesIniciales = L.latLngBounds(
    L.latLng(36.45, -6.35),
    L.latLng(37.75, -4.25)
);

function establecerVistaInicial() {
    const ancho = window.innerWidth;
    const alto = window.innerHeight;

    /*Móviles verticales y de pequeño tamaño de pantalla*/

    if (ancho <= 480 && alto > ancho) {
        mapa.setView(
            [37.05, -5.15],
            7
        );
    }

    /*Tablets verticales por ejemplo 768*1024 */

    else if (ancho <= 1024 && alto > ancho) {
        mapa.setView(
            [37.05, -5.15],
            8
        );
    }

    /*Móviles o tablets horizontales*/

    else if (ancho <= 1024) {
        mapa.fitBounds(limitesIniciales, {
            padding: [30, 30],
            maxZoom: 8
        });
    }

    /*Ordenadores*/

    else {
        mapa.fitBounds(limitesIniciales, {
            padding: [40, 40],
            maxZoom: 9
        });
    }

}

//Si la URL es una vista compartida se respeta esa vista y no aplica vista inicial

if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
    mapa.setView([lat, lng], zoom);
} else if (!fidRefugioParaAbrir){
    establecerVistaInicial();
}

//Actualizar escala
let grupoMarcadores;
let capaAgrupada;
let capaIconos;
let refugiosVerificados;
let marcadorRefugioResaltado = null;

const marcadoresPorTipo = {};
const marcadoresAgrupadosPorTipo = {};

function actualizarEscalaPersonalizada() {
    const zoom = mapa.getZoom();
    const resolution = 40075016.686 / (256 * Math.pow(2, zoom));
    const anchoBarra = window.matchMedia("(max-width: 768px)").matches
        ?65
        :80;

    const escala = resolution * anchoBarra;
    let texto = '';
    if (escala >= 1000) {
        texto = `${(escala / 1000).toFixed(1)} km`;
    } else {
        texto = `${Math.round(escala)} m`;
    }
    const etiqueta = document.querySelector('#escala-personalizada .escala-etiqueta');
    if (etiqueta) etiqueta.textContent = texto;
}

mapa.whenReady(actualizarEscalaPersonalizada);
mapa.on('zoomend moveend', actualizarEscalaPersonalizada);
window.addEventListener("resize", actualizarEscalaPersonalizada);

//Para las anotaciones de la capa ESRI
mapa.createPane('etiquetasPane');
mapa.getPane('etiquetasPane').style.zIndex = 650;
mapa.getPane('etiquetasPane').style.pointerEvents = 'none';

//Icono por defecto para capa de zoom bajo
const iconoDefecto = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});
