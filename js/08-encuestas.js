/* 08 ENCUESTAS */

//Bloque de la encuesta a partir de aquí

// La identidad emisora y el destinatario se gestionan en la cuenta institucional de EmailJS.
function encuestaConfigurada() {
    const cfg = CONFIGURACION_ENCUESTAS;
    return typeof emailjs !== "undefined" &&
        [cfg.clavePublica, cfg.identificadorServicio, cfg.identificadorPlantilla]
            .every(valor => typeof valor === "string" && valor.length > 0 &&
                !valor.includes("SUSTITUIR"));
}
if (encuestaConfigurada()) {
    emailjs.init({ publicKey: CONFIGURACION_ENCUESTAS.clavePublica });
} else {
    console.warn("Encuestas: cuenta institucional pendiente de configurar.");
}

let pasoActual = 0;
let respuestas = {};
let refugioSeleccionado = {
    nombre: "",
    id_dera: ""
};

const encuestaModal = document.getElementById("encuesta-modal");
const contenidoEncuesta = document.getElementById("modal-contenido");

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

    establecerVisibilidadLeyenda(false);
    encuestaModal.classList.remove("modal-oculto");
    mostrarPaso(pasoActual);
}

function mostrarPaso(paso) {
    const datosPaso = pasos[paso];
    contenidoEncuesta.innerHTML = ""; // Limpia el contenido anterior

    if (datosPaso.observaciones) {
        // Último paso con textarea
        contenidoEncuesta.innerHTML = `
            <h3>${datosPaso.texto}</h3>
            <textarea id="observaciones" maxlength="500" rows="5" placeholder="Deja aquí tus comentarios"></textarea>
            <div class="boton-centro">
                <button class="boton-enviar" onclick="enviarResultados()">Enviar</button>
                <button class="boton-enviar" onclick="cerrarEncuesta()">Cancelar</button>
            </div>
        `;
    } else if (paso === 2) {
        // Paso de servicios: usar casillasServicios
        const casillasServicios = datosPaso.opciones.map(op => `
            <label>
                <input type="checkbox" name="servicios" value="${op}"> ${op}
            </label>
        `).join("<br>");

        contenidoEncuesta.innerHTML = `
            <h3>${datosPaso.texto}</h3>
            <div class="opciones">${casillasServicios}</div>
            <div class="boton-centro">
                <button class="boton-enviar" onclick="guardarServicios()">Siguiente</button>
                <button class="boton-enviar" onclick="cerrarEncuesta()">Cancelar</button>
            </div>
        `;
    } else {
        // Preguntas con opciones tipo botón
        const botones = datosPaso.opciones.map(op =>
            `<button class="boton-opcion" onclick="seleccionarOpcion('${op}')">${op}</button>`
        ).join("");

        contenidoEncuesta.innerHTML = `
            <h3>${datosPaso.texto}</h3>
            <div class="opciones">${botones}</div>
            <div class="boton-centro">
                <button class="boton-enviar" onclick="cerrarEncuesta()">Cancelar</button>
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
    const entradaObservaciones = document.getElementById("observaciones");
    respuestas[`paso_${pasoActual + 1}`] = entradaObservaciones ? entradaObservaciones.value : "";

    const datosEnvio = {
        nombreRefugio: refugioSeleccionado.nombre,
        idDera: refugioSeleccionado.id_dera,
        accesibilidad: respuestas["paso_1"],
        confort: respuestas["paso_2"],
        servicios: respuestas["paso_3"],
        comentarios: respuestas["paso_4"]
    };

    if (!encuestaConfigurada()) {
        alert("La recepción institucional de encuestas aún no está configurada.");
        return;
    }

    emailjs.send(
        CONFIGURACION_ENCUESTAS.identificadorServicio,
        CONFIGURACION_ENCUESTAS.identificadorPlantilla,
        datosEnvio
    )
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
    contenidoEncuesta.innerHTML = `
    <h3>Gracias por tu respuesta. Se ha enviado correctamente.</h3>
    <div class="boton-centro">
    <button class="boton-enviar" id="boton-finalizar">Finalizar</button>
    </div>
`;
    const botonFinalizarEncuesta = document.getElementById("boton-finalizar");
    if (botonFinalizarEncuesta) {
        botonFinalizarEncuesta.addEventListener("click", cerrarEncuesta)
    }
}

function cerrarEncuesta() {
    encuestaModal.classList.add("modal-oculto");
    contenidoEncuesta.innerHTML = "";
}
