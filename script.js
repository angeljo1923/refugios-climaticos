const map = L.map("map", {
    center: [37.4, -5.9],
    zoom: 13,
    zoomControl: false,
    minZoom: 6
});

const params = new URLSearchParams(window.location.search);
const lat = parseFloat(params.get("lat"));
const lng = parseFloat(params.get("lng"));
const zoom = parseInt(params.get("z"));
const fidRefugioParaAbrir = params.get('fid');



//Parámetros de la URL
if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
    map.setView([lat, lng], zoom);
} else {
    const bounds = L.latLngBounds(
        L.latLng(36.4, -6.3),
        L.latLng(38.2, -4.5)
    );
    map.fitBounds(bounds);
}

//Actualizar escala
let clusterGroup;
let capaCluster;
let capaIconos;
let refugiosVerificados;
let marcadorRefugioResaltado = null;

const marcadoresPorTipo = {};

function actualizarEscalaPersonalizada() {
    const zoom = map.getZoom();
    const resolution = 40075016.686 / (256 * Math.pow(2, zoom));
    const escala = resolution * 80;
    let texto = '';
    if (escala >= 1000) {
        texto = `${(escala / 1000).toFixed(1)} km`;
    } else {
        texto = `${Math.round(escala)} m`;
    }
    const etiqueta = document.querySelector('#escala-personalizada .escala-etiqueta');
    if (etiqueta) etiqueta.textContent = texto;
}

map.whenReady(actualizarEscalaPersonalizada);
map.on('zoomend moveend', actualizarEscalaPersonalizada);

//Para las anotaciones de la capa ESRI
map.createPane('etiquetasPane');
map.getPane('etiquetasPane').style.zIndex = 650;
map.getPane('etiquetasPane').style.pointerEvents = 'none';

//Icono por defecto para capa de zoom bajo
const iconoDefecto = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});

//Iconos por tipo cuando se acerca el zoom
const iconosPorTipo = {
    "Bibliotecas": {
        iconUrl: "iconos/biblioteca.svg",
        tipologia: 'Interior'
    },
    "Centros Cívicos": {
        iconUrl: "iconos/centrocivico.svg",
        tipologia: 'Interior'
    },
    "Centros Educativos": {
        iconUrl: "iconos/centroeducativo.svg",
        tipologia: 'Interior'
    },
    "Espacio verdes con agua potable": {
        iconUrl: "iconos/verdeagua.svg",
        tipologia: 'Exterior'
    },
    "Espacios verdes sin agua potable": {
        iconUrl: "iconos/verdesinagua.svg",
        tipologia: 'Exterior'
    },
    "Estación de autobuses": {
        iconUrl: "iconos/buses.svg",
        tipologia: 'Interior'
    },
    "Estación de tren": {
        iconUrl: "iconos/tren.svg",
        tipologia: 'Interior'
    },
    "Gran comercio": {
        iconUrl: "iconos/comercio.svg",
        tipologia: 'Interior'
    },
    "Iglesia": {
        iconUrl: "iconos/iglesia.svg",
        tipologia: 'Interior'
    },
    "Mercado de abastos": {
        iconUrl: "iconos/abastos.svg",
        tipologia: 'Interior'
    },
    "Museo": {
        iconUrl: "iconos/museo.svg",
        tipologia: 'Interior'
    },
    "Pabellón": {
        iconUrl: "iconos/pabellon.svg",
        tipologia: 'Interior'
    },
    "Pabellón deportivo": {
        iconUrl: "iconos/pabellondeportivo.svg",
        tipologia: 'Interior'
    },
    "Parada de metro": {
        iconUrl: "iconos/metro.svg",
        tipologia: 'Interior'
    },
    "Piscinas Municipales": {
        iconUrl: "iconos/piscina.svg",
        tipologia: 'Exterior'
    },
    "Playa": {
        iconUrl: "iconos/playa.svg",
        tipologia: 'Exterior'
    }
};

const tipoTipologiaPorTipo = {
    "Bibliotecas": "Interior",
    "Centros Cívicos": "Interior",
    "Centros Educativos": "Interior",
    "Espacios verdes con agua potable": "Exterior",
    "Espacios verdes sin agua potable": "Exterior",
    "Estación de autobuses": "Interior",
    "Estación de tren": "Interior",
    "Gran comercio": "Interior",
    "Iglesia": "Interior",
    "Mercado de abastos": "Interior",
    "Museo": "Interior",
    "Pabellón": "Interior",
    "Pabellón deportivo": "Interior",
    "Parada de metro": "Interior",
    "Piscinas municipales": "Exterior",
    "Playa": "Exterior"
};

function obtenerIconoPorTipo(tipo, tipologia) {
    const ruta = iconosPorTipo[tipo]?.iconUrl || "default.svg";
    let filtroColor = "";
    if (tipologia === "Interior") {
        filtroColor = "invert(23%) sepia(81%) saturate(2864%) hue-rotate(180deg) brightness(95%) contrast(95%)";
    } else if (tipologia === "Exterior") {
        filtroColor = "invert(32%) sepia(31%) saturate(1064%) hue-rotate(61deg) brightness(85%) contrast(95%)"
    }
    return L.divIcon({
        className: 'icono-buffer-refugio',
        html: `<img src="${ruta}" alt="${tipo}" style="filter: ${filtroColor};">`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -15]
    });
}

function obtenerTip_RC(tipo) {
    const correspondencias = {
        "Bibliotecas": "RI1_BIBLIOTECA",
        "Centros cívicos": "RI9_CENTROS CIVICOS",
        "Centros Educativos": "RI2_CENTROS EDUCATIVOS",
        "Espacio verdes con agua potable": "RE3_ESPACIOS VERDES CON AGUA POTABLE",
        "Espacios verdes sin agua potable": "RE3_ESPACIOS VERDES SIN AGUA POTABLE",
        "Estación de autobuses": "RI6_ESTACIONES DE TRANSPORTE",
        "Estación de tren": "RI6_ESTACIONES DE TRANSPORTE",
        "Gran comercio": "RI7_CENTROS COMERCIALES",
        "Iglesia": "RI8_EDIFICIOS RELIGIOSOS",
        "Mercado de abastos": "RI4_MERCADO DE ABASTO",
        "Museo": "RI5_MUSEOS",
        "Pabellón": "RI3_POLIDEPORTIVO CUBIERTO",
        "Pabellón deportivo": "RI3_POLIDEPORTIVO CUBIERTO",
        "Parada de metro": "RI6_ESTACIONES DE TRANSPORTE",
        "Piscinas municipales": "RE1_PISCINAS MUNICIPALES",
        "Playa": "RE2_PLAYAS"
    };
    return correspondencias[tipo] || "";
}

function generarLeyenda() {
    const leyenda = document.getElementById("leyenda-refugios");
    if (!leyenda) {
        console.error("Contenedor de leyenda no encontrado");
        return;
    }

    leyenda.innerHTML = `
        <div class="leyenda-header">
            <h4>Leyenda de símbolos</h4>
            <button id="cerrar-leyenda">&times;</button>
        </div>
        <div class="leyenda-grupo">
            <label>
                <input type="checkbox" class="grupo-checkbox" data-tipologia="Interior" checked>
                <strong>Espacios de interior</strong>
            </label>
            <ul id="leyenda-interior"></ul>
        </div>
        <div class="leyenda-grupo">
            <label>
                <input type="checkbox" class="grupo-checkbox" data-tipologia="Exterior" checked>
                <strong>Espacios de exterior</strong>
            </label>
            <ul id="leyenda-exterior"></ul>
        </div>
    `;

    const interiorList = document.getElementById("leyenda-interior");
    const exteriorList = document.getElementById("leyenda-exterior");

    Object.keys(iconosPorTipo).forEach(tipo => {
        const tipologia = tipoTipologiaPorTipo[tipo];
        const item = crearBloqueLeyenda(tipo);
        if (tipologia === "Interior") {
            interiorList.appendChild(item);
        } else if (tipologia === "Exterior") {
            exteriorList.appendChild(item);
        }
    });

    document.getElementById("cerrar-leyenda").addEventListener("click", () => {
        document.getElementById("leyenda-refugios").classList.add("oculto");
    });

    document.querySelectorAll(".grupo-checkbox").forEach(groupCheck => {
        groupCheck.addEventListener("change", (e) => {
            const tipologia = e.target.getAttribute("data-tipologia");
            const containerId = tipologia === "Interior" ? "leyenda-interior" : "leyenda-exterior";
            const checks = document.querySelectorAll(`#${containerId} input[type='checkbox']`);
            checks.forEach(chk => {
                chk.checked = e.target.checked;
                const tipo = chk.dataset.tipo;
                toggleTipoRefugio(tipo, chk.checked);
            });
        });
    });

    document.querySelectorAll(".checkbox-tipo").forEach(checkbox => {
        checkbox.addEventListener("change", function() {
            toggleTipoRefugio(this.dataset.tipo, this.checked);
        });
    });

    function toggleTipoRefugio(tipo, visible) {
        if (marcadoresPorTipo[tipo]) {
            marcadoresPorTipo[tipo].forEach(marker => {
                if (visible) {
                    map.addLayer(marker);
                } else {
                    map.removeLayer(marker);
                }
            });
        }
    }
}

function crearBloqueLeyenda(tipo) {
    const iconoUrl = iconosPorTipo[tipo]?.iconUrl;
    const tipologia = tipoTipologiaPorTipo[tipo];
    let filtroColor = "";
    if (tipologia === "Interior") {
        filtroColor = "invert(23%) sepia(81%) saturate(2864%) hue-rotate(180deg) brightness(95%) contrast(95%)";
    } else if (tipologia === "Exterior") {
        filtroColor = "invert(32%) sepia(31%) saturate(1064%) hue-rotate(61deg) brightness(85%) contrast(95%)";
    }
    const li = document.createElement("li");
    li.innerHTML = `
        <label>
            <input type="checkbox" class="checkbox-tipo" data-tipo="${tipo}" checked>
            <img src="${iconoUrl}" alt="${tipo}" style="width: 24px; height: 24px; vertical-align: middle; filter: ${filtroColor};">
            <span>${tipo}</span>
        </label>
    `;
    return li;
}

let leyendaCerradaManual = false;
document.getElementById("cerrar-leyenda").addEventListener("click", () => {
    document.getElementById("leyenda-refugios").classList.add("oculto");
    leyendaCerradaManual = true;
});

//Capa geoJson.
let datosRefugiosGeoJSON = null;

// REESTRUCTURACIÓN: TODO SE HACE DENTRO DEL FETCH
fetch("malaga_sevilla_4326.geojson")
    .then(response => response.json())
    .then(data => {
        datosRefugiosGeoJSON = data;
        refugiosVerificados = {
            type: "FeatureCollection",
            features: data.features.filter(f => f.properties.verificado === "SI" && f.geometry)
        };

        clusterGroup = L.markerClusterGroup();
        capaCluster = L.geoJSON(refugiosVerificados, {
            pointToLayer: (feature, latlng) => {
                return L.marker(latlng, {
                    icon: iconoDefecto
                });
            },
            onEachFeature: popup_REF
        });
        clusterGroup.addLayer(capaCluster);
        map.addLayer(clusterGroup);

        capaIconos = L.geoJSON(refugiosVerificados, {
            pointToLayer: (feature, latlng) => {
                const tipo = feature.properties.tipo;
                const icono = obtenerIconoPorTipo(feature.properties.tipo, feature.properties.tipologia);
                // **CORRECCIÓN 1: Añade popupAnchor al marcador de la capa de iconos**
                const marker = L.marker(latlng, {
                    icon: icono,
                    popupAnchor: [0, -40]
                });
                if (!marcadoresPorTipo[tipo]) {
                    marcadoresPorTipo[tipo] = [];
                }
                marcadoresPorTipo[tipo].push(marker);
                return marker;
            },
            onEachFeature: popup_REF
        });

        // Lógica de cambio de zoom
        map.on('zoomend', () => {
            const zoom = map.getZoom();
            const leyenda = document.getElementById("leyenda-refugios");
            if (zoom >= 14) {
                if (map.hasLayer(clusterGroup)) {
                    map.removeLayer(clusterGroup);
                    map.addLayer(capaIconos);
                }
                if (!leyendaCerradaManual) {
                    generarLeyenda();
                    leyenda.classList.remove("oculto");
                } else {
                    leyenda.classList.add("oculto")
                }
            } else {
                if (map.hasLayer(capaIconos)) {
                    map.removeLayer(capaIconos);
                    map.addLayer(clusterGroup);
                }
                leyenda.classList.add("oculto");
            }
        });

        // **LÓGICA PARA PROCESAR FID DESDE LA URL (CORRECCIÓN)**
        function procesarEnlaceDirecto() {
            if (!fidRefugioParaAbrir) return;

            const refugioEncontrado = refugiosVerificados.features.find(feature => feature.properties.fid?.toString() === fidRefugioParaAbrir);

            if (refugioEncontrado) {
                const geometry = refugioEncontrado.geometry;
                let coords;

                if (!geometry || !geometry.coordinates) {
                    console.error(`Error: Refugio con FID ${fidRefugioParaAbrir} no tiene coordenadas válidas.`);
                    return;
                }

                if (geometry.type === "MultiPoint") {
                    if (geometry.coordinates.length > 0) {
                        coords = geometry.coordinates[0];
                    } else {
                        console.error(`Error: Geometría MultiPoint vacía para el refugio con FID ${fidRefugioParaAbrir}.`);
                        return;
                    }
                } else if (geometry.type === "Point") {
                    coords = geometry.coordinates;
                } else {
                    console.error(`Error: Tipo de geometría no soportado para el refugio con FID ${fidRefugioParaAbrir}.`);
                    return;
                }

                if (!Array.isArray(coords) || coords.length !== 2) {
                    console.error(`Error: Coordenadas inválidas para el refugio con FID ${fidRefugioParaAbrir}.`, coords);
                    return;
                }

                const latlng = [coords[1], coords[0]];
                const tipo = refugioEncontrado.properties.tipo;
                const tipologia = refugioEncontrado.properties.tipologia;
                const icono = obtenerIconoPorTipo(tipo, tipologia);

                // **CORRECCIÓN: Centrar el mapa directamente en las coordenadas del marcador**
                map.setView(latlng, 17, {
                    animate: true
                });

                // **CORRECCIÓN: Define un popupAnchor para el marcador temporal y lo ubica justo encima**
                const tempMarker = L.marker(latlng, {
                    icon: icono,
                    popupAnchor: [0, -40]
                }).addTo(map);

                // Aplica el resaltado primero
                resaltarRefugioSeleccionado(tempMarker);

                // Agrega un pequeño retardo antes de abrir el popup
                setTimeout(() => {
                    const popupContent = popup_REF_content(refugioEncontrado, tempMarker);
                    tempMarker.bindPopup(popupContent).openPopup();
                }, 50);

                // Remover el marcador temporal después de que el popup se haya mostrado
                tempMarker.on('popupclose', () => {
                    map.removeLayer(tempMarker);
                });
            } else {
                console.warn("No se encontró el refugio con FID:", fidRefugioParaAbrir);
            }
        }

        // Se mueve la llamada a la función dentro del bloque .then()
        procesarEnlaceDirecto();
    });
// Se crea una función separada para obtener el contenido del popup
function popup_REF_content(feature, layer) {
    const props = feature.properties;
    const nombre = props.nombre || 'Sin nombre';
    const tipo = props.tipo || 'No especificado';
    const acceso = props.acceso || 'No especificado';
    const tipologia = props.tipologia || 'No especificado';
    const horario = props.Horario || 'No especificado';
    const ubicacion = props.Ubicación || '';

    const popupContent = document.createElement("div");
    const titulo = document.createElement("h3");
    titulo.textContent = nombre;
    popupContent.appendChild(titulo);

    const tabla = document.createElement("table");
    tabla.innerHTML = `
        <tr><td><strong>Tipo:</strong></td><td>${tipo}</td></tr>
        <tr><td><strong>Acceso:</strong></td><td>${acceso}</td></tr>
        <tr><td><strong>Tipología:</strong></td><td>${tipologia}</td></tr>
        <tr><td><strong>Horario:</strong></td><td>${horario}</td></tr>
        <tr><td><strong>Ubicación:</strong></td><td><a href="${ubicacion}" target="_blank">Ver en Google Maps</a></td></tr>
    `;
    popupContent.appendChild(tabla);

    // Crea el contenedor para los botones
    const contenedorBotones = document.createElement("div");
    contenedorBotones.className = "boton-centro";

    const botonCalificar = document.createElement("button");
    botonCalificar.textContent = "Calificar refugio";
    botonCalificar.className = "boton-encuesta";
    botonCalificar.onclick = () => abrirEncuesta(nombre, props.fid);
    contenedorBotones.appendChild(botonCalificar);
    
    const btnCompartirVista = document.createElement("button");
    btnCompartirVista.textContent = "Copiar enlace a la vista actual";
    btnCompartirVista.className = "boton-encuesta";
    btnCompartirVista.onclick = () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const url = `${window.location.origin}${window.location.pathname}?lat=${center.lat}&lng=${center.lng}&z=${zoom}`;
        copiarAlPortapapeles(url);
    };
    contenedorBotones.appendChild(btnCompartirVista);

    const btnCompartirRefugio = document.createElement("button");
    btnCompartirRefugio.textContent = "Copiar enlace directo al refugio";
    btnCompartirRefugio.className = "boton-encuesta";
    btnCompartirRefugio.onclick = () => {
        const fid = props.fid;
        const url = `${window.location.origin}${window.location.pathname}?fid=${fid}`;
        copiarAlPortapapeles(url);
    };
    contenedorBotones.appendChild(btnCompartirRefugio);
    
    popupContent.appendChild(contenedorBotones);
    
    layer.bindPopup(popupContent, {
        minWidth: 250,
        offset: L.point([0, -40])
    });

    layer.on('click', function(e) {
        // Calcula la nueva posición de la vista del mapa
        const markerPoint = map.latLngToContainerPoint(e.target.getLatLng());
        const newViewPoint = markerPoint.subtract([0, 100]);
        const newCenter = map.containerPointToLatLng(newViewPoint);

        // Mueve la vista del mapa para que el popup no tape el marcador
        map.setView(newCenter, map.getZoom(), {
            animate: true,
            pan: {
                duration: 0.5
            }
        });
    });

    return popupContent;
}

function popup_REF(feature, layer) {
    popup_REF_content(feature, layer);
}

function resaltarRefugioSeleccionado(marcador) {
    // Si hay un marcador resaltado previamente, se le quita el estilo
    if (marcadorRefugioResaltado && marcadorRefugioResaltado._icon) {
        marcadorRefugioResaltado._icon.classList.remove('resaltado-refugio');
    }
    // Almacena el nuevo marcador resaltado
    marcadorRefugioResaltado = marcador;
    // Resalta visualmente el marcador
    if (marcador._icon) {
        marcador._icon.classList.add('resaltado-refugio');
    }
    // Elimina la clase de resaltado tras unos segundos
    setTimeout(() => {
        if (marcador._icon) {
            marcador._icon.classList.remove('resaltado-refugio');
        }
    }, 4000);

    // **CORRECCIÓN: Desplaza la vista del mapa para centrar el marcador**
    const markerPoint = map.latLngToContainerPoint(marcador.getLatLng());
    const newViewPoint = markerPoint.subtract([0, 100]);
    const newCenter = map.containerPointToLatLng(newViewPoint);
    map.setView(newCenter, map.getZoom(), {
        animate: true,
        pan: {
            duration: 0.5
        }
    });
}


//Capas base
var OSM =
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: 'Desarrollo; <a href="https://www.uma.es/departamento-de-geografia/"> DEP.GEOGRAFÍA -UMA-</a> Map data &copy; <a href="http://openstreetmap.org"> OpenStreetMap</a>	contributors, ',
        id: 'OpenStreetMap'
    }).addTo(map);

var capapnoa =
    L.tileLayer.wms('https://www.ign.es/wms-inspire/pnoa-ma', {
        layers: 'OI.OrthoimageCoverage',
        format: 'image/jpeg',
        transparent: false,
        attribution: 'Desarrollo; <a href="https://www.uma.es/departamento-de-geografia/"> DEP.GEOGRAFÍA -UMA-</a> © Instituto Geográfico Nacional de España',
        version: '1.3.0'
    });

//Capa base de Esri con anotaciones
var capaEsri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Desarrollo; <a href="https://www.uma.es/departamento-de-geografia/"> DEP.GEOGRAFÍA -UMA-</a> © Esri, Maxar, Earthstar Geographics',
    maxZoom: 19
});

var capaEtiquetas = L.tileLayer(
    'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Desarrollo; <a href="https://www.uma.es/departamento-de-geografia/"> DEP.GEOGRAFÍA -UMA-</a> © Esri',
        maxZoom: 19,
        pane: 'etiquetasPane'
    }
);

let capaBaseActual = OSM;

// Eventos de los botones
document.getElementById("botonpnoa").addEventListener("click", function() {
    cambiarCapaBase(capapnoa);
    activarBoton("botonpnoa");
});

document.getElementById("botonosm").addEventListener("click", function() {
    cambiarCapaBase(OSM);
    activarBoton("botonosm");
});

document.getElementById("botonesri").addEventListener("click", function() {
    cambiarCapaBase(capaEsri, true);
    activarBoton("botonesri");
});

function cambiarCapaBase(nuevaCapa, conEtiquetas = false) {
    if (map.hasLayer(capaBaseActual)) {
        map.removeLayer(capaBaseActual);
    }
    map.addLayer(nuevaCapa);
    capaBaseActual = nuevaCapa;
    if (conEtiquetas) {
        map.addLayer(capaEtiquetas);
    } else {
        map.removeLayer(capaEtiquetas);
    }
}

function activarBoton(idActivo) {
    const botones = document.querySelectorAll('#capasbase button');
    botones.forEach(boton => {
        boton.classList.remove('activo');
    });
    const botonActivo = document.getElementById(idActivo);
    if (botonActivo) {
        botonActivo.classList.add('activo');
    }
}

var markers = L.markerClusterGroup();
var MarkerOptions = {
    radius: 8,
    fillColor: "#088A68",
    color: "#090",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};


//Funcion de la encuesta
function colorPuntos(d) {
    return '#088A68';
}

function estilo_REF(feature) {
    return {
        radius: 7,
        fillColor: colorPuntos(feature.properties.num),
        color: colorPuntos(feature.properties.num),
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    };
}


//Fecha y hora del pie de página

function mostrarfechahora() {
    const ahora = new Date();

    //Formato local (español por defecto)

    const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    const texto = ahora.toLocaleDateString('es-ES', opciones);
    const spanfecha = document.getElementById("fecha_hora");
    if (spanfecha) {
        spanfecha.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
    }
}

mostrarfechahora();
setInterval(mostrarfechahora, 60000);

//Coordenadas en el pie de página

map.on('mousemove', function(e) {
    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);
    const coordspan = document.getElementById("coordenadas_mapa");
    if (coordspan) {
        coordspan.textContent = `Coordenadas: ${lat}, ${lng}`;
    }
});

//Bloque de la encuesta a partir de aquí

emailjs.init("XVVy-IexTTomx60lY");

let pasoActual = 0;
let respuestas = {};
let refugioSeleccionado = {
    nombre: "",
    id_dera: ""
};

const encuestaModal = document.getElementById("encuesta-modal");
const modalContenido = document.getElementById("modal-contenido");

const pasos = [{
    texto: "¿Cómo valorarías la accesibilidad?",
    opciones: ["Buena", "Aceptable", "Mala"]
}, {
    texto: "¿Cómo valorarías el confort térmico?",
    opciones: ["Adecuado", "Regular", "Inadecuado"]
}, {
    texto: "¿Qué servicios están disponibles?",
    opciones: ["Agua", "Electricidad", "Baño", "Ninguno"]
}, {
    texto: "Observaciones (máx. 500 caracteres)",
    observaciones: true
}];

function abrirEncuesta(nombre, id_dera) {

    pasoActual = 0;
    respuestas = {};
    refugioSeleccionado = {
        nombre,
        id_dera
    };

    //Cerrar leyenda

    document.getElementById("leyenda-refugios").classList.add("oculto");
    leyendaCerradaManual = true;

    mostrarPaso(pasoActual);
    encuestaModal.classList.remove("modal-hidden");
}

function mostrarPaso(paso) {
    const pasoData = pasos[paso];
    modalContenido.innerHTML = ""; // Limpia el contenido anterior

    if (pasoData.observaciones) {
        // Último paso con textarea
        modalContenido.innerHTML = `
            <h3>${pasoData.texto}</h3>
            <textarea id="observaciones" maxlength="500" rows="5" placeholder="Deja aquí tus comentarios"></textarea>
            <div class="boton-centro">
                <button class="enviar-btn" onclick="enviarResultados()">Enviar</button>
                <button class="enviar-btn" onclick="cerrarEncuesta()">Finalizar</button>
            </div>
        `;
    } else if (paso === 2) {
        // Paso de servicios: usar checkboxes
        const checkboxes = pasoData.opciones.map(op => `
            <label>
                <input type="checkbox" name="servicios" value="${op}"> ${op}
            </label>
        `).join("<br>");

        modalContenido.innerHTML = `
            <h3>${pasoData.texto}</h3>
            <div class="opciones">${checkboxes}</div>
            <div class="boton-centro">
                <button class="enviar-btn" onclick="guardarServicios()">Siguiente</button>
                <button class="enviar-btn" onclick="cerrarEncuesta()">Cancelar</button>
            </div>
        `;
    } else {
        // Preguntas con opciones tipo botón
        const botones = pasoData.opciones.map(op =>
            `<button class="opcion-btn" onclick="seleccionarOpcion('${op}')">${op}</button>`
        ).join("");

        modalContenido.innerHTML = `
            <h3>${pasoData.texto}</h3>
            <div class="opciones">${botones}</div>
            <div class="boton-centro">
                <button class="enviar-btn" onclick="cerrarEncuesta()">Cancelar</button>
            </div>
        `;
    }
}

// Nueva función para guardar los servicios seleccionados
function guardarServicios() {
    const seleccionados = Array.from(document.querySelectorAll("input[name='servicios']:checked"))
        .map(cb => cb.value);
    respuestas[`paso_${pasoActual + 1}`] = seleccionados.join(", ");
    pasoActual++;
    if (pasoActual < pasos.length) {
        mostrarPaso(pasoActual);
    }
}

function seleccionarOpcion(opcion) {
    respuestas[`paso_${pasoActual + 1}`] = opcion;
    pasoActual++;
    if (pasoActual < pasos.length) {
        mostrarPaso(pasoActual);
    }
}

function enviarResultados() {
    const obsInput = document.getElementById("observaciones");
    respuestas[`paso_${pasoActual + 1}`] = obsInput ? obsInput.value : "";

    const payload = {
        nombreRefugio: refugioSeleccionado.nombre,
        idDera: refugioSeleccionado.id_dera,
        accesibilidad: respuestas["paso_1"],
        confort: respuestas["paso_2"],
        servicios: respuestas["paso_3"],
        comentarios: respuestas["paso_4"]
    };

    console.log("Enviando datos a EmailJS", payload); //Se verifica el contenido

    emailjs.send("service_lf5583h", "template_3hznx42", payload)
        .then(() => {
            console.log("Correo enviado correctamente."); //Confirmación
            console.log("Mostrando botón finalizar")
            mostrarBotonFinalizar();
        })
        .catch(error => {
            console.error("Error al enviar:", error);
            alert("Hubo un error al enviar la encuesta.");
        });
}

//Botón de finalizar encuesta que vuelve todo al estado original

function mostrarBotonFinalizar() {
    modalContenido.innerHTML = `
    <h3>Gracias por tu respuesta. Se ha enviado correctamente.</h3>
    <div class="boton-centro">
    <button class="enviar-btn" id="btn-finalizar">Finalizar</button>
    </div>
`;
    const finalizarBtn = document.getElementById("btn-finalizar");
    if (finalizarBtn) {
        finalizarBtn.addEventListener("click", cerrarEncuesta)
    }
}

function cerrarEncuesta() {
    encuestaModal.classList.add("modal-hidden");
    modalContenido.innerHTML = "";
}

//BOTONES DE SEVILLA, MALAGA Y VOLVER AL INICIO

function centrarEnMalaga() {
    map.setView([36.7213, -4.4214], 12);
}

function centrarEnSevilla() {
    map.setView([37.3886, -5.9823], 12);
}

function volverAlInicio() {
    map.setView([37, -5], 9);
}

//Función para autorellenar los códigos del municipio

function obtenerDatosMunicipio(lat, lng) {

    //Coordenadas aproximadas de Málaga
    const malaga = {
        latMin: 36.65,
        latMax: 36.80,
        lngMin: -4.50,
        lngMax: -4.30
    };

    //Coordenadas aproximadas de Sevilla
    const sevilla = {
        latMin: 37.30,
        latMax: 37.45,
        lngMin: -6.00,
        lngMax: -5.80
    };

    //Cálculos para ver si está dentro de las coordenadas de cada una de las ciudades, sino devuelve desconocido

    if (
        lat >= malaga.latMin &&
        lat <= malaga.latMax &&
        lng >= malaga.lngMin &&
        lng <= malaga.lngMax
    ) {
        return {
            cod_mun: "29067",
            municipio: "Málaga",
            provincia: "Málaga"
        };
    } else if (
        lat >= sevilla.latMin &&
        lat <= sevilla.latMax &&
        lng >= sevilla.lngMin &&
        lng <= sevilla.lngMax
    ) {
        return {
            cod_mun: "41091",
            municipio: "Sevilla",
            provincia: "Sevilla"
        };
    } else {
        return {
            cod_mun: "",
            municipio: "Desconocido",
            provincia: "Desconocido"
        };
    }
}

//FUNCIONALIDAD COMPLETA DEL BOTÓN DE AGREGAR REFUGIOS

const asistenteModal = document.getElementById("asistente-modal");
const asistenteContenido = document.getElementById("asistente-contenido");
const btnCancelar = document.getElementById("btn-cancelar-asistente");
const btnSiguiente = document.getElementById("btn-siguiente-asistente");
const btnFinalizar = document.getElementById("btn-finalizar-asistente");

let pasoAsistente = 0;
let datosRefugio = {};
let puntoTemp = null;


const tipoToTIP_RC = {
    "Bibliotecas": "RI1_BIBLIOTECA",
    "Centros cívicos": "RI9_CENTROS CIVICOS",
    "Centros educativos": "RI2_CENTROS EDUCATIVOS",
    "Espacios verdes con agua potable": "RE3_ESPACIOS VERDES CON AGUA POTABLE",
    "Espacios verdes sin agua potable": "RE3_ESPACIOS VERDES SIN AGUA POTABLE",
    "Estación de autobuses": "RI6_ESTACIONES DE TRANSPORTE",
    "Estación de tren": "RI6_ESTACIONES DE TRANSPORTE",
    "Gran comercio": "RI7_CENTROS COMERCIALES",
    "Iglesia": "RI8_EDIFICIOS RELIGIOSOS",
    "Mercado de abastos": "RI4_MERCADO DE ABASTO",
    "Museo": "RI5_MUSEOS",
    "Pabellón": "RI3_POLIDEPORTIVO CUBIERTO",
    "Pabellón deportivo": "RI3_POLIDEPORTIVO CUBIERTO",
    "Parada de metro": "RI6_ESTACIONES DE TRANSPORTE",
    "Piscinas municipales": "RE1_PISCINAS MUNICIPALES",
    "Playa": "RE2_PLAYAS"
};

const opcionesTipo = Object.keys(tipoToTIP_RC);

const pasosAsistente = [
    () => {
        asistenteContenido.innerHTML = `<h3>Haz click en el mapa para fijar la ubicación del nuevo refugio.</h3>`;
        map.once("click", function(e) {
            const coords = e.latlng;
            const idUnico = Date.now().toString();
            municipioData = obtenerDatosMunicipio(coords.lat, coords.lng);

            datosRefugio.id = idUnico;

            datosRefugio.geometry = {
                type: "Point",
                coordinates: [coords.lng, coords.lat]
            };
            //Asigna ID único
            datosRefugio.properties = {
                id: idUnico,
                lat: coords.lat,
                lng: coords.lng,
                verificado: "NO"
            };

            //Marcador temporal

            if (puntoTemp) {
                map.removeLayer(puntoTemp);
            }

            puntoTemp = L.marker(coords, {
                iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            }).addTo(map);

            pasoAsistente++;
            mostrarPasoAsistente();
        });
    },
    //Introducir nombre
    () => {
        asistenteContenido.innerHTML = `
            <h3>Introduce el nombre del lugar:</h3>
            <input type="text" id="input-nombre" placeholder="Nombre del refugio">
            `;
    },
    //Seleccionar tipo del refugio
    () => {
        const opciones = opcionesTipo.map(op => `<option value="${op}">${op}</option>`).join("");
        asistenteContenido.innerHTML = `
            <h3>Selecciona el tipo de espacio:</h3>
            <select id="input-tipo">${opciones}</select>
            `;
    },
    //Selección de tipología
    () => {
        asistenteContenido.innerHTML = `
            <h3>¿Qué tipología tiene el espacio?</h3>
            <select id="input-tipologia">
                <option value="Interior">Interior</option>
                <option value="Exterior">Exterior</option>
            </select>
            `
    },
    //Selección de acceso
    () => {
        asistenteContenido.innerHTML = `
            <h3>¿El acceso al espacio es gratuito o de pago?</h3>
            <select id="input-acceso">
                <option value="Gratuito">Gratuito</option>
                <option value="De pago">De pago</option>
            </select>
            `
    },
    //Horario
    () => {
        asistenteContenido.innerHTML = `
            <h3> ¿Cual es el horario del espacio?</h3>
            <input type="text" id="input-horario" placeholder="Ej. Lunes a viernes 9-14h.">
            `;
    }

];
document.getElementById("botonagregarrefugio").addEventListener("click", () => {

    //Oculta leyenda

    document.getElementById("leyenda-refugios").classList.add("oculto");
    leyendaCerradaManual = true;

    //Pasos del asistente

    pasoAsistente = 0;
    datosRefugio = {
        properties: {},
        verificado: "NO"
    };
    asistenteModal.classList.remove("modal-hidden");
    btnFinalizar.style.display = "none";
    btnSiguiente.style.display = "inline-block";
    mostrarPasoAsistente();
});

btnCancelar.addEventListener("click", () => {
    asistenteModal.classList.add("modal-hidden");

    //La leyenda se vuelve a mostrar

    leyendaCerradaManual = false;

    //Mostrar leyenda si el zoom es suficientemente alto
    if (map.getZoom() >= 14) {
        document.getElementById("leyenda-refugios").classList.remove("oculto");
    }

    //El marcador se quita de la vista si se pulsa el botón cancelar

    if (puntoTemp) {
        map.removeLayer(puntoTemp);
        puntoTemp = null;
    }
});

btnSiguiente.addEventListener("click", () => {
    guardarDatosPasoActual();
    pasoAsistente++;
    if (pasoAsistente < pasosAsistente.length) {
        mostrarPasoAsistente();
        if (pasoAsistente === pasosAsistente.length - 1) {
            btnSiguiente.style.display = "none";
            btnFinalizar.style.display = "inline-block";
        }
    }
});

function cerrarAsistente() {
    modalContenido.style.display = "none";
    pasoAsistente = 0;
}

btnFinalizar.addEventListener("click", () => {

    guardarDatosPasoActual();

    //Recalcula valor de TIP_RC por si acaso que me daba fallo
    const tipoSeleccionado = datosRefugio.properties.tipo;
    datosRefugio.properties.TIP_RC = obtenerTip_RC(tipoSeleccionado);

    const nuevoRegistro = {
        id: datosRefugio.id,
        nombre: datosRefugio.properties.nombre,
        tipo: datosRefugio.properties.tipo,
        tip_rc: datosRefugio.properties.TIP_RC,
        tipologia: datosRefugio.properties.tipologia,
        acceso: datosRefugio.properties.acceso,
        horario: datosRefugio.properties.horario,
        lat: datosRefugio.properties.lat,
        lng: datosRefugio.properties.lng,
        verificado: "NO",
        cod_mun: municipioData.cod_mun,
        municipio: municipioData.municipio,
        provincia: municipioData.provincia
    };

    //Llamada POST a SheetDB

    fetch("https://sheetdb.io/api/v1/0x65dydf8jrit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                data: [nuevoRegistro]
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Error al guardar los datos");
            alert("Refugio registrado correctamente. Será revisado por el operador");
        })
        .then(data => {
            console.log("Datos enviados correctamente", data);
            cerrarAsistente();
            alert("Refugio añadido correctamente");
        })
        .catch(error => {
            console.error("Error al guardar el refugio:", error);
            alert("Ocurrió un error al guardar el refugio.");
        })
        .finally(() => {
            asistenteModal.classList.add("modal-hidden");
        });

    if (puntoTemp) {
        map.removeLayer(puntoTemp);
        puntoTemp = null;
    }

});

function mostrarPasoAsistente() {
    pasosAsistente[pasoAsistente]();
}

function guardarDatosPasoActual() {
    switch (pasoAsistente) {
        case 1:
            datosRefugio.properties.nombre = document.getElementById("input-nombre").value.trim();
            break;
        case 2:
            const tipo = document.getElementById("input-tipo").value;
            datosRefugio.properties.tipo = tipo;
            datosRefugio.properties.TIP_RC = obtenerTip_RC(tipo);
            break;
        case 3:
            datosRefugio.properties.tipologia = document.getElementById("input-tipologia").value;
            break;
        case 4:
            datosRefugio.properties.acceso = document.getElementById("input-acceso").value;
            break;
        case 5:
            datosRefugio.properties.horario = document.getElementById("input-horario").value;
            break;
    }
}

function mostrarOpcionesCompartir(lat, lng, nombre) {
    const urlVista = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}&z=${map.getZoom()}`;
    const urlRefugio = `${window.location.origin}${window.location.pathname}?refugio=${encodeURIComponent(nombre)}`;

    const opciones = `
    <div class="modal-content">
        <h3>Compartir refugio</h3>
        <div class="opciones">
            <button onclick="copiarAlPortapapeles('${urlVista}')">Copiar enlace de la vista actual</button>
            <button onclick="cerrarModal()">Cerrar</button>
        </div>
    </div>
`;

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = opciones;
    modal.id = "modal-compartir";
    document.body.appendChild(modal);
}

const compartirRefugioBtn = document.createElement("button");
compartirRefugioBtn.textContent = "Copiar enlace directo al refugio";
compartirRefugioBtn.className = "enlace-refugio";
compartirRefugioBtn.onclick = () => {
    const lat = feature.geometry.coordinates[1];
    const lng = feature.geometry.coordinates[0];
    const zoom = map.getZoom();
    const id = feature.properties.id; // Asegúrate de que cada refugio tiene un campo 'id' único
    const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}&z=${zoom}&id=${encodeURIComponent(id)}`;

    navigator.clipboard.writeText(url).then(() => {
        alert("¡Enlace copiado al portapapeles!");
    });
};

function copiarAlPortapapeles(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        alert("Enlace copiado al portapapeles");
    }).catch(err => {
        alert("Error al copiar enlace");
        console.error(err);
    });
}

function cerrarModal() {
    const modal = document.getElementById("modal-compartir");
    if (modal) modal.remove();
}

function compartirVistaActual() {
    const center = map.getCenter();
    const zoom = map.getZoom();

    const url = `${window.location.origin}${window.location.pathname}?lat=${center.lat}&{center.lng}&z=${zoom}`;

    navigator.clipboard.writeText(url)
        .then(() => alert("Enlace copiado al portapapeles"))
        .catch(err => alert("Error al copiar el enlace" + err));;
}

//Evento para compartir con popup abierto

window.addEventListener("load", () => {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat"));
    const lng = parseFloat(params.get("lng"));
    const zoom = parseInt(params.get("z"), 10);
    const refugioId = params.get("id");

    if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
        map.setView([lat, lng], zoom);
    }


});