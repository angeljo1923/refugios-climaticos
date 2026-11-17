/* 05 FICHAS REFUGIO */

// Se crea una función separada para obtener el contenido del popup
function crearContenidoFichaRefugio(elementoGeoJSON, capa) {
    const propiedadesRefugio = elementoGeoJSON.properties;

    //Extraer número de fuentes de agua potable popup

    const nombreOriginal = propiedadesRefugio.nombre || "Sin nombre";

    const patronFuentes =
        /\s*\(\s*N[º°o]\s*de\s*fuentes\s*de\s*agua\s*potable\s*:\s*(\d+)\s*\)\s*$/i;

    const coincidenciaFuentes = nombreOriginal.match(patronFuentes);

    //Mantiene valor como texto para mostrarlo en el popup

    const numeroFuentes = coincidenciaFuentes
        ? coincidenciaFuentes[1]
        : null;

    //Nombre limpio sin la información entre paréntesis

    const nombre = coincidenciaFuentes
        ? nombreOriginal.replace(patronFuentes, "").trim()
        : nombreOriginal;

    const tipo = propiedadesRefugio.tipo || 'No especificado';
    const acceso = propiedadesRefugio.acceso || 'No especificado';
    const tipologia = propiedadesRefugio.tipologia || 'No especificado';
    const horario = propiedadesRefugio.Horario || propiedadesRefugio.horario || 'No especificado';
    const ubicacion = propiedadesRefugio.Ubicación || propiedadesRefugio.Ubicacion || propiedadesRefugio.ubicacion || ''; 

    const contenidoFicha = document.createElement("div");
    contenidoFicha.className = "ficha-refugio";

    //Cabecera del popup

    const cabecera = document.createElement("div");
    cabecera.className = "ficha-refugio-cabecera";

    //Tipología y color de la cabecera

    const datosIcono = iconosPorTipo[tipo];

    const tipologiaCabecera =
        datosIcono?.tipologia || tipologia;

    if (tipologiaCabecera === "Exterior") {
        cabecera.classList.add("cabecera-exterior");
        contenidoFicha.classList.add("refugio-exterior")
    } else {
        cabecera.classList.add("cabecera-interior");
        contenidoFicha.classList.add("refugio-interior");
    }

    //Contenedor del texto

    const textoCabecera = document.createElement("div");
    textoCabecera.className = "ficha-refugio-texto-cabecera";

    const titulo = document.createElement("h3");
    titulo.textContent = nombre;
    
    //Etiqueta identificativa para espacios exteriores

    if (tipologiaCabecera === "Exterior") {
        const etiquetaExterior = document.createElement("span");
        etiquetaExterior.className = "ficha-refugio-distintivo";
        etiquetaExterior.textContent = "ESPACIO EXTERIOR";
        textoCabecera.appendChild(etiquetaExterior);
    }

    //Título y subtítulo

    textoCabecera.append(titulo);

    //Icono correspondiente al tipo de refugio

    const iconoCabecera = document.createElement("div");
    iconoCabecera.className = "ficha-refugio-icono-cabecera";

    if (datosIcono?.rutaIcono) {
        const imagenIcono = document.createElement("img");

        imagenIcono.src = datosIcono.rutaIcono;
        imagenIcono.alt = `Icono de ${tipo}`;
        
        iconoCabecera.appendChild(imagenIcono);
    }

    cabecera.append(textoCabecera, iconoCabecera);
    contenidoFicha.appendChild(cabecera);

    //Información del refugio

    const datos = document.createElement("div");
    datos.className = "ficha-refugio-datos";

    const campos = [
        ["Tipo", tipo],
        ["Tipología", tipologia],
        ["Acceso", acceso],
        ["Horario", horario]
    ];

    // Número de fuentes si existe en el GeoJSON

    if (
        tipo === "Espacios verdes con agua potable" &&
        numeroFuentes !== null
    ) {
        campos.push([
            "Número de fuentes de agua potable",
            numeroFuentes
        ]);
    }

    campos.forEach(([etiqueta, valor]) => {
        const campo = document.createElement("div");
        campo.className = "ficha-refugio-campo";
        if (etiqueta === "Número de fuentes de agua potable") {
            campo.classList.add("campo-fuentes");
        }

        const etiquetaCampo = document.createElement("span");
        etiquetaCampo.className = "ficha-refugio-etiqueta";
        etiquetaCampo.textContent = etiqueta;

        const contenido = document.createElement("span");
        contenido.className = "ficha-refugio-valor";
        contenido.textContent = valor;

        campo.append(etiquetaCampo, contenido);
        datos.appendChild(campo);
    });

    contenidoFicha.appendChild(datos);

    //Ubicación

    const bloqueUbicacion = document.createElement("div");
    bloqueUbicacion.className = "ficha-refugio-ubicacion";

    if (ubicacion) {
        const enlace = document.createElement("a");
        enlace.textContent = "Ver en Google Maps ↗";
        enlace.href= ubicacion;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";

        bloqueUbicacion.appendChild(enlace);
    } else {
        bloqueUbicacion.textContent = "Ubicación no disponible";
    }

    contenidoFicha.appendChild(bloqueUbicacion);

    //Acciones del popup

    const contenedorBotones = document.createElement("div");
    contenedorBotones.className = "ficha-refugio-acciones";

    const botonCalificar = document.createElement("button");
    botonCalificar.type = "button";
    botonCalificar.className = "boton-encuesta";
    botonCalificar.textContent = "Calificar refugio";
    botonCalificar.addEventListener("click", () => {
        abrirEncuesta(nombre, propiedadesRefugio.fid);
    });

    const botonCompartirVista = document.createElement("button");
    botonCompartirVista.type = "button";
    botonCompartirVista.className = "boton-encuesta";
    botonCompartirVista.textContent = "Copiar enlace a la vista actual";

    botonCompartirVista.addEventListener("click", () => {

        const url =generarEnlaceVistaActual();
        copiarAlPortapapeles(url);
    });

    const botonCompartirRefugio = document.createElement("button");
    botonCompartirRefugio.type = "button";
    botonCompartirRefugio.className = "boton-encuesta";
    botonCompartirRefugio.textContent = "Copiar enlace directo al refugio";

    botonCompartirRefugio.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const url = generarEnlaceRefugio(propiedadesRefugio.fid);

        if (!url) {
            console.error("El refugio no tiene FID válido:", propiedadesRefugio);
            alert("No se ha podido generar enlace directo");
            return;
        }

        copiarAlPortapapeles(url);
    });

    contenedorBotones.append(
        botonCalificar,
        botonCompartirVista,
        botonCompartirRefugio
    );

    contenidoFicha.appendChild(contenedorBotones);

    //Configuración responsive de Leaflet

    // Configuración de la ficha según el espacio disponible.
const anchoMapa = mapa.getSize().x;
const altoMapa = mapa.getSize().y;

const horizontalBaja = window.matchMedia(
    "(orientation: landscape) and (max-height: 500px)"
).matches;

const movilVertical = anchoMapa <= 480 && altoMapa > anchoMapa;
const movil = anchoMapa <= 768;

const anchoVentana = horizontalBaja
    ? Math.max(200, Math.min(390, anchoMapa - 270))
    : movilVertical
        ? Math.min(320, anchoMapa - 36)
        : movil
            ? Math.min(340, anchoMapa - 40)
            : Math.min(420, anchoMapa - 40);

const rectanguloMapa = mapa.getContainer().getBoundingClientRect();

const controles = [
    document.getElementById("botones-localizacion"),
    document.getElementById("capasbase"),
    document.getElementById("agregarrefugio")
]
    .filter(Boolean)
    .map(el => el.getBoundingClientRect())
    .filter(rectangulo => rectangulo.width > 0 && rectangulo.height > 0);

// Reservar la franja superior completa de los controles.
const margenSuperior = Math.max(
    90,
    ...controles.map(
        rectangulo => Math.ceil(rectangulo.bottom - rectanguloMapa.top + 16)
    )
);

const margenInferior = anchoMapa <= 1024 ? 88 : 50;

let margenIzquierdo = movilVertical ? 12 : 24;
let margenDerecho = movilVertical ? 12 : 24;

// En escritorio/tablet, respetar las columnas laterales.
if (!movilVertical && !horizontalBaja) {

    ["capasbase", "agregarrefugio"].forEach(id => {

        const el = document.getElementById(id);

        if (!el) return;

        const r = el.getBoundingClientRect();

        if (r.width === 0 || r.height === 0) return;

        if (
            (r.left + r.right) / 2 <
            rectanguloMapa.left + anchoMapa / 2
        ) {

            margenIzquierdo = Math.max(
                margenIzquierdo,
                Math.ceil(r.right - rectanguloMapa.left + 16)
            );

        } else {

            margenDerecho = Math.max(
                margenDerecho,
                Math.ceil(rectanguloMapa.right - r.left + 16)
            );

        }
    });
}

// Limitar la altura de la ficha al espacio útil.
const altoContenidoDisponible = Math.max(
    130,
    altoMapa - margenSuperior - margenInferior - 55
);

mapa.getContainer().style.setProperty(
    "--alto-popup-disponible",
    `${altoContenidoDisponible}px`
);

capa.bindPopup(contenidoFicha, {
    className: "ventana-refugio",
    closeButton: true,
    autoClose: true,
    closeOnClick: true,
    minWidth: anchoVentana,
    maxWidth: anchoVentana,
    offset: L.point(0, -20),

    autoPan: !horizontalBaja,

    autoPanPaddingTopLeft: L.point(
        margenIzquierdo,
        margenSuperior
    ),

    autoPanPaddingBottomRight: L.point(
        margenDerecho,
        margenInferior
    ),

    keepInView: !horizontalBaja
});

    return contenidoFicha;
    
}

function vincularFichaRefugio(elementoGeoJSON, capa) {
    
    //Creación del contenido y asociación del popup al marcador

    crearContenidoFichaRefugio(elementoGeoJSON, capa);


}

function resaltarRefugioSeleccionado(marcador) {

    // Comprobar que el objeto recibido es un marcador Leaflet
    if (!(marcador instanceof L.Marker)) {
        return;
    }

    // Eliminar el resaltado del marcador anterior
    if (marcadorRefugioResaltado) {
        const elementoAnterior =
            marcadorRefugioResaltado.getElement();

        if (elementoAnterior) {
            elementoAnterior.classList.remove("resaltado-refugio");
        }
    }

    // Guardar el marcador seleccionado
    marcadorRefugioResaltado = marcador;

    // Se coloca por encima de otros marcadores

    marcador.setZIndexOffset(1000);

    const elemento = marcador.getElement();

    if (elemento) {
        elemento.classList.add("resaltado-refugio");
    }
}

function quitarResaltadoRefugio(marcador) {

    if (marcadorRefugioResaltado !== marcador) {
        return;
    }

    const elemento = marcador.getElement();

    if (elemento) {
        elemento.classList.remove("resaltado-refugio");
    }

    marcador.setZIndexOffset(0);
    marcadorRefugioResaltado = null;
}

/*Exclusión entre popup y leyenda*/

const consultaVentanaHorizontal = window.matchMedia(
    "(orientation: landscape) and (max-height: 500px)"
);

mapa.on("popupopen", function (evento) {
    const marcador = evento.popup._source;

    if (marcador instanceof L.Marker) {
        resaltarRefugioSeleccionado(marcador);
    }

    // Cerrar la leyenda al abrir una ficha.
    establecerVisibilidadLeyenda(false);

    // En pantallas horizontales bajas, acoplar la ficha al mapa.
    if (consultaVentanaHorizontal.matches) {
        const elemento = evento.popup.getElement();

        if (elemento && elemento.classList.contains("ventana-refugio")) {
            elemento.style.setProperty(
                "--ancho-ventana-acoplada",
                `${evento.popup.options.maxWidth}px`
            );

            mapa.getContainer().appendChild(elemento);
            elemento.classList.add("ventana-acoplada");
        }
    }
});

mapa.on("popupclose", function (evento) {
    const marcador = evento.popup._source;

    if (marcador instanceof L.Marker) {
        quitarResaltadoRefugio(marcador);
    }
});

// Si cambia la orientación, cerrar la ficha para evitar
// conservar la posición de la orientación anterior.
consultaVentanaHorizontal.addEventListener(
    "change",
    () => mapa.closePopup()
);
