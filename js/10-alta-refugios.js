/* 10 ALTA REFUGIOS */

//FUNCIONALIDAD COMPLETA DEL BOTÓN DE AGREGAR REFUGIOS

const asistenteModal = document.getElementById("asistente-modal");
const asistenteContenido = document.getElementById("asistente-contenido");
const botonCancelar = document.getElementById("boton-cancelar-asistente");
const botonSiguiente = document.getElementById("boton-siguiente-asistente");
const botonFinalizar = document.getElementById("boton-finalizar-asistente");

let pasoAsistente = 0;
let datosRefugio = {};
let puntoTemp = null;
let municipioData = null;

//Control de la selección de un ounto en el mapa

let manejadorSeleccionUbicacion = null;
let identificadorTurnstile = null;
let tokenVerificacion = "";
function liberarVerificacion() {
    tokenVerificacion = "";
    if (identificadorTurnstile !== null && window.turnstile) {
        try { window.turnstile.remove(identificadorTurnstile); } catch (_) {}
    }
    identificadorTurnstile = null;
}

function mostrarVerificacion() {
    liberarVerificacion();
    const contenedor = document.getElementById("verificacion-nuevo-refugio");
    if (!contenedor) return;
    if (!window.turnstile || !CONFIGURACION_SERVIDOR.clavePublicaTurnstile ||
        CONFIGURACION_SERVIDOR.clavePublicaTurnstile.includes("SUSTITUIR")) {
        contenedor.textContent = "La verificación no está configurada; no es posible enviar el registro.";
        return;
    }
    try {
        identificadorTurnstile = window.turnstile.render(contenedor, {
            sitekey: CONFIGURACION_SERVIDOR.clavePublicaTurnstile,
            action: "alta_refugio",
            theme: "light",
            size: window.innerWidth <= 380 ? "compact" : "flexible",
            callback: (token) => { tokenVerificacion = token; },
            "expired-callback": () => { tokenVerificacion = ""; },
            "error-callback": () => { tokenVerificacion = ""; }
        });
    } catch (error) {
        console.error("No se pudo mostrar Turnstile:", error);
        contenedor.textContent = "No se pudo cargar la verificación. Comprueba la conexión.";
    }
}

function limpiarSeleccionUbicacion () {

    //Retirar cualquier selección pendiente

    if (manejadorSeleccionUbicacion) {
        mapa.off("click", manejadorSeleccionUbicacion);
        manejadorSeleccionUbicacion = null;
    }

    //Quitar aviso del mapa

    document.getElementById("aviso-seleccion-refugio")?.remove();
    
    mapa.getContainer().classList.remove("seleccionando-refugio");
}


const opcionesTipo = Object.keys(iconosPorTipo);

const pasosAsistente = [
    () => {
        
        /*Selección de ubicación del refugio*/

        limpiarSeleccionUbicacion();
        // Bandera por sesión: una comprobación antigua no bloqueará una nueva alta.
        let comprobandoMunicipio = false;

        //Ocultar formulario para interactuar con el mapa

        asistenteModal.classList.add("modal-oculto");

        //Mensaje independiente del formulario

        const aviso = document.createElement("div");
        
        aviso.id = "aviso-seleccion-refugio";
        aviso.setAttribute("role", "status");

        aviso.innerHTML = `
            <strong>Haz click en la ubicación del refugio</strong>
            <span>Selecciona la ubicación exacta.</span>
            <button type="button" id="cancelar-seleccion-refugio">
            Cancelar
            </button>
        `;

        mapa.getContainer().appendChild(aviso);

        //Evitar que pulsar sobre el aviso seleccione un punto

        L.DomEvent.disableClickPropagation(aviso);
        L.DomEvent.disableScrollPropagation(aviso);

        mapa.getContainer().classList.add("seleccionando-refugio");

        aviso.querySelector("#cancelar-seleccion-refugio")
            .addEventListener("click", cerrarAsistente);

        //Escuchar click que seleccionará la ubicación

        manejadorSeleccionUbicacion = async function (e) {
            if (comprobandoMunicipio) return;

            // No registrar clics sobre controles o marcadores existentes.
            if (e.originalEvent?.target?.closest?.(
                "#botones-localizacion, #capasbase, #agregarrefugio, " +
                "#leyenda-refugios, #boton-mostrar-leyenda, " +
                ".leaflet-control-container, .leaflet-popup, .leaflet-marker-icon"
            )) return;

            const coordenadas = e.latlng;
            comprobandoMunicipio = true;
            const textoAviso = aviso.querySelector("span");
            textoAviso.textContent = "Comprobando el término municipal…";

            let municipioComprobado;
            try {
                municipioComprobado = await obtenerDatosMunicipio(coordenadas.lat, coordenadas.lng);
            } catch (error) {
                if (manejadorSeleccionUbicacion === manejadorActual) {
                    textoAviso.textContent = "No se pudo comprobar el límite. Prueba otra vez.";
                    alert(error.message);
                }
                return;
            } finally {
                comprobandoMunicipio = false;
            }

            // Puede haberse pulsado Cancelar mientras se hacía la consulta.
            if (manejadorSeleccionUbicacion !== manejadorActual) return;
            if (!municipioComprobado?.cod_mun) {
                textoAviso.textContent = "Fuera de Málaga o Sevilla. Selecciona otro punto.";
                return;
            }

            limpiarSeleccionUbicacion();
            municipioData = municipioComprobado;

            // El ID y el estado verificado los asigna ÚNICAMENTE el servidor.
            datosRefugio.geometry = {
                type: "Point",
                coordinates: [coordenadas.lng, coordenadas.lat]
            };
            datosRefugio.properties = {
                lat: coordenadas.lat,
                lng: coordenadas.lng
            };

            if (puntoTemp) mapa.removeLayer(puntoTemp);
            puntoTemp = L.marker(coordenadas, { icon: iconoDefecto }).addTo(mapa);

            pasoAsistente = 1;
            asistenteModal.classList.remove("modal-oculto");
            botonSiguiente.style.display = "inline-block";
            mostrarPasoAsistente();
        };
        const manejadorActual = manejadorSeleccionUbicacion;

        mapa.on("click", manejadorSeleccionUbicacion);

    },
    //Introducir nombre
    () => {
        asistenteContenido.innerHTML = `
            <h3>Introduce el nombre del lugar:</h3>
            <input type="text" id="campo-nombre" placeholder="Nombre del refugio">
            `;
    },
    //Seleccionar tipo del refugio
    () => {
        const opciones = opcionesTipo.map(op => `<option value="${op}">${op}</option>`).join("");
        asistenteContenido.innerHTML = `
            <h3>Selecciona el tipo de espacio:</h3>
            <select id="campo-tipo">${opciones}</select>
            `;
    },
    //Selección de tipología
    () => {
        asistenteContenido.innerHTML = `
            <h3>¿Qué tipología tiene el espacio?</h3>
            <select id="campo-tipologia">
                <option value="Interior">Interior</option>
                <option value="Exterior">Exterior</option>
            </select>
            `
    },
    //Selección de acceso
    () => {
        asistenteContenido.innerHTML = `
            <h3>¿El acceso al espacio es gratuito o de pago?</h3>
            <select id="campo-acceso">
                <option value="Gratuito">Gratuito</option>
                <option value="De pago">De pago</option>
            </select>
            `
    },
    //Horario
    () => {
        asistenteContenido.innerHTML = `
            <h3> ¿Cual es el horario del espacio?</h3>
            <input type="text" id="campo-horario" placeholder="Ej. Lunes a viernes 9-14h.">
            <p>Verifica la solicitud antes de enviarla:</p>
            <div id="verificacion-nuevo-refugio" class="verificacion-refugio"></div>
            `;
        mostrarVerificacion();
    }

];


//Asistente nuevo refugio

document.getElementById("botonagregarrefugio")
    .addEventListener("click", (evento) => {

        //No permitir que se interprete el click como ubicación
        evento.preventDefault();
        evento.stopPropagation();

        //Cerrar popup y leyenda si estaban abiertos

        mapa.closePopup();
        establecerVisibilidadLeyenda(false);

        //Eliminar selección anterior

        limpiarSeleccionUbicacion();

        if (puntoTemp) {
            mapa.removeLayer(puntoTemp);
            puntoTemp = null;
        }

        //Reiniciar el formulario
        liberarVerificacion();
        pasoAsistente = 0;
        municipioData = null;

        datosRefugio = {
            properties: {}
        };

        botonFinalizar.style.display = "none";
        botonSiguiente.style.display = "inline-block";

        //Mostrar aviso selección de mapa

        mostrarPasoAsistente();
    });

//CANCELACIÓN DEL ASISTENTE

botonCancelar.addEventListener("click", cerrarAsistente);

botonSiguiente.addEventListener("click", () => {
    if (pasoAsistente === 1 && !document.getElementById("campo-nombre")?.value.trim()) {
        alert("Introduce un nombre para el refugio.");
        return;
    }
    guardarDatosPasoActual();
    pasoAsistente++;
    if (pasoAsistente < pasosAsistente.length) {
        mostrarPasoAsistente();
        if (pasoAsistente === pasosAsistente.length - 1) {
            botonSiguiente.style.display = "none";
            botonFinalizar.style.display = "inline-block";
        }
    }
});

function cerrarAsistente() {

    //Dejar de esperar click en el mapa y limpiar captcha
    limpiarSeleccionUbicacion();
    liberarVerificacion();

    asistenteModal.classList.add("modal-oculto");
    pasoAsistente = 0;

    //Quitar marcador provisional

    if (puntoTemp) {
        mapa.removeLayer(puntoTemp);
        puntoTemp = null;
    }
}

botonFinalizar.addEventListener("click", async () => {
    guardarDatosPasoActual();
    const datos = datosRefugio.properties;
    const tipoSeleccionado = datos.tipo;

    if (!datos.nombre?.trim() || !tipoSeleccionado ||
        !obtenerTip_RC(tipoSeleccionado) ||
        !Number.isFinite(datos.lat) || !Number.isFinite(datos.lng) ||
        !municipioData?.cod_mun ||
        !["Interior", "Exterior"].includes(datos.tipologia) ||
        datos.tipologia !== iconosPorTipo[tipoSeleccionado]?.tipologia) {
        alert("Faltan datos o la ubicación no ha sido validada.");
        return;
    }
    if (!tokenVerificacion) {
        alert("Completa la verificación de seguridad antes de enviar.");
        return;
    }

    // Sin ID, estado, código municipal ni TIP_RC enviados desde el navegador.
    // El servidor los calcula nuevamente y establece siempre verificado = NO.
    const solicitud = {
        nombre: datos.nombre,
        tipo: datos.tipo,
        tipologia: datos.tipologia,
        acceso: datos.acceso,
        horario: datos.horario,
        lat: datos.lat,
        lng: datos.lng,
        tokenVerificacion
    };
    botonFinalizar.disabled = true;

    try {
        const respuesta = await fetch(obtenerDireccionServicio("/refugios"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(solicitud)
        });
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
            throw new Error(resultado.error || `No se pudo registrar el refugio (${respuesta.status}).`);
        }
        cerrarAsistente();
        alert(`Solicitud registrada con identificador ${resultado.id}. Pendiente de validación por el operador.`);
    } catch (error) {
        console.error("Error al registrar el refugio:", error);
        alert(error.message || "No se pudo registrar el refugio.");
    } finally {
        botonFinalizar.disabled = false;
        // Cada token Turnstile es de un solo uso: renovar incluso si hubo error.
        if (identificadorTurnstile !== null && window.turnstile) {
            tokenVerificacion = "";
            window.turnstile.reset(identificadorTurnstile);
        }
    }
});

function mostrarPasoAsistente() {
    pasosAsistente[pasoAsistente]();
}

function guardarDatosPasoActual() {
    switch (pasoAsistente) {
        case 1:
            datosRefugio.properties.nombre = document.getElementById("campo-nombre").value.trim();
            break;
        case 2:
            const tipo = document.getElementById("campo-tipo").value;
            datosRefugio.properties.tipo = tipo;
            datosRefugio.properties.TIP_RC = obtenerTip_RC(tipo);
            break;
        case 3:
            datosRefugio.properties.tipologia = document.getElementById("campo-tipologia").value;
            break;
        case 4:
            datosRefugio.properties.acceso = document.getElementById("campo-acceso").value;
            break;
        case 5:
            datosRefugio.properties.horario = document.getElementById("campo-horario").value;
            break;
    }
}
