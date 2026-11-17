/* 09 NAVEGACION MUNICIPIOS */

//BOTONES DE SEVILLA, MALAGA Y VOLVER AL INICIO

function obtenerZoomCiudad() {
    if (window.innerWidth <= 480 ) {
        return 11;
    }

    if (window.innerWidth <= 1024) {
        return 12;
    }
    
    return 12;

}

function centrarEnMalaga() {
    mapa.setView(
        [36.7213, -4.4214],
        obtenerZoomCiudad(),
        {
            animate: true
        }
    );
}

function centrarEnSevilla() {
    mapa.setView(
        [37.3886, -5.9283],
        obtenerZoomCiudad(),
        {
            animate: true
        }
    );
}

function volverAlInicio() {
    establecerVistaInicial();
}

// VALIDACIÓN DE MUNICIPIO A PARTIR DE POLÍGONOS REALES DEL SERVICIO GEOGRÁFICO.
// Este resultado mejora la experiencia de uso; el servidor REPITE la validación
// antes de escribir en la hoja. No confiar en esta comprobación por sí sola.
async function obtenerDatosMunicipio(latitud, longitud) {
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
        throw new Error("Las coordenadas no son válidas.");
    }

    const parametros = new URLSearchParams({
        lat: String(latitud),
        lng: String(longitud)
    });
    const respuesta = await fetch(
        obtenerDireccionServicio(`/municipio?${parametros.toString()}`),
        { method: "GET", cache: "no-store" }
    );
    const resultado = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        throw new Error(resultado.error || "Servicio geográfico no disponible.");
    }

    return resultado.municipio; // null si fuera de ambos términos municipales
}
