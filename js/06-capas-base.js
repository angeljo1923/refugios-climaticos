/* 06 CAPAS BASE */

//Capas base
var capaOSM =
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: 'Desarrollo; <a href="https://www.uma.es/departamento-de-geografia/"> DEP.GEOGRAFÍA -UMA-</a> Map data &copy; <a href="https://openstreetmap.org"> OpenStreetMap</a>	contributors, ',
        id: 'OpenStreetMap'
    }).addTo(mapa);

var capaPNOA =
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

let capaBaseActual = capaOSM;

// Eventos de los botones
document.getElementById("botonpnoa").addEventListener("click", function() {
    cambiarCapaBase(capaPNOA);
    activarBoton("botonpnoa");
});

document.getElementById("botonosm").addEventListener("click", function() {
    cambiarCapaBase(capaOSM);
    activarBoton("botonosm");
});

document.getElementById("botonesri").addEventListener("click", function() {
    cambiarCapaBase(capaEsri, true);
    activarBoton("botonesri");
});

function cambiarCapaBase(nuevaCapa, conEtiquetas = false) {
    if (mapa.hasLayer(capaBaseActual)) {
        mapa.removeLayer(capaBaseActual);
    }
    mapa.addLayer(nuevaCapa);
    capaBaseActual = nuevaCapa;
    if (conEtiquetas) {
        mapa.addLayer(capaEtiquetas);
    } else {
        mapa.removeLayer(capaEtiquetas);
    }
}

function activarBoton(idBotonActivo) {
    const botones = document.querySelectorAll('#capasbase button');
    botones.forEach(boton => {
        boton.classList.remove('activo');
    });
    const botonActivo = document.getElementById(idBotonActivo);
    if (botonActivo) {
        botonActivo.classList.add('activo');
    }
}
