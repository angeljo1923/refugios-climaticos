/* 03 LEYENDA */

function generarLeyenda() {

    const leyenda = document.getElementById("leyenda-refugios");

    if (!leyenda) {
        console.error("Contenedor de leyenda no encontrado");
        return;
    }

    //Evita reconstruir la leyenda si ya está generada

    if (leyenda.dataset.generada === "true") return;

    leyenda.innerHTML = `
        <div class="cabecera-leyenda">
            <h4>Leyenda de símbolos</h4>
            <button type="button" id="cerrar-leyenda"
                    title="Cerrar leyenda">&times;</button>
        </div>

        <div class="leyenda-grupo">
            <label>
                <input type="checkbox"
                       class="casilla-grupo"
                       data-tipologia="Interior" checked>
                <strong>Espacios de interior</strong>
            </label>
            <ul id="leyenda-interior"></ul>
        </div>

        <div class="leyenda-grupo">
            <label>
                <input type="checkbox"
                       class="casilla-grupo"
                       data-tipologia="Exterior" checked>
                <strong>Espacios de exterior</strong>
            </label>
            <ul id="leyenda-exterior"></ul>
        </div>
    `;

    const interiorList = leyenda.querySelector("#leyenda-interior");
    const exteriorList = leyenda.querySelector("#leyenda-exterior");

    Object.keys(iconosPorTipo).forEach(tipo => {
        const tipologia = iconosPorTipo[tipo]?.tipologia;
        const elementoLeyenda = crearBloqueLeyenda(tipo);

        if (tipologia === "Interior") {
            interiorList.appendChild(elementoLeyenda);
        } else if (tipologia === "Exterior") {
            exteriorList.appendChild(elementoLeyenda);
        }
    });

    //Cerrar leyenda desde la X del panel

    leyenda.querySelector("#cerrar-leyenda").addEventListener("click", () => {
        establecerVisibilidadLeyenda(false);
    });

    //Actualizar checkbox principal

    function actualizarCasillaGrupo(tipologia) {
        const grupo = leyenda.querySelector(
            `.casilla-grupo[data-tipologia="${tipologia}"]`
        );

        const casillas = Array.from(
            leyenda.querySelectorAll(
                `.casilla-tipo[data-tipologia="${tipologia}"]`
            )
        );

        if (!grupo || casillas.length === 0) return;

        grupo.checked = casillas.every(chk => chk.checked);

        grupo.indeterminate =
            casillas.some(chk => chk.checked) && !grupo.checked;
    }

    //Activar o desactivar marcadores dentro de capa GeoJSON

    function alternarVisibilidadTipoRefugio(tipo, visible) {
        // Aplicar el filtro a los marcadores individuales y a los clusters.
        (marcadoresPorTipo[tipo] || []).forEach(marcador => {
            if (visible && !capaIconos.hasLayer(marcador)) {
                capaIconos.addLayer(marcador);
            } else if (!visible && capaIconos.hasLayer(marcador)) {
                capaIconos.removeLayer(marcador);
            }
        });

        (marcadoresAgrupadosPorTipo[tipo] || []).forEach(marcador => {
            if (visible && !grupoMarcadores.hasLayer(marcador)) {
                grupoMarcadores.addLayer(marcador);
            } else if (!visible && grupoMarcadores.hasLayer(marcador)) {
                grupoMarcadores.removeLayer(marcador);
            }
        });
    }

        //Checkboxes de grupo

        leyenda.querySelectorAll(".casilla-grupo").forEach(grupo => {
            grupo.addEventListener("change", function () {
                const tipologia = this.dataset.tipologia;

                leyenda.querySelectorAll(
                    `.casilla-tipo[data-tipologia="${tipologia}"]`
                ).forEach(casilla => {
                    casilla.checked = this.checked;
                    alternarVisibilidadTipoRefugio(casilla.dataset.tipo, this.checked);
                });

                actualizarCasillaGrupo(tipologia);
            });
        });

        //Checkboxes individuales

        leyenda.querySelectorAll(".casilla-tipo").forEach(casilla => {
            casilla.addEventListener("change", function () {
                alternarVisibilidadTipoRefugio(this.dataset.tipo, this.checked);
                actualizarCasillaGrupo(this.dataset.tipologia);
            });
        });

        leyenda.dataset.generada = "true";
    
}

function crearBloqueLeyenda(tipo) {
    const iconoUrl = iconosPorTipo[tipo]?.rutaIcono;
    const tipologia = iconosPorTipo[tipo]?.tipologia;
    let filtroColor = "";
    if (tipologia === "Interior") {
        filtroColor = "invert(23%) sepia(81%) saturate(2864%) hue-rotate(180deg) brightness(95%) contrast(95%)";
    } else if (tipologia === "Exterior") {
        filtroColor = "invert(32%) sepia(31%) saturate(1064%) hue-rotate(61deg) brightness(85%) contrast(95%)";
    }
    const li = document.createElement("li");
    li.innerHTML = `
        <label>
            <input type="checkbox" class="casilla-tipo" data-tipo="${tipo}" data-tipologia="${tipologia}"checked>
            <img src="${iconoUrl}" alt="${tipo}" style="width: 24px; height: 24px; vertical-align: middle; filter: ${filtroColor};">
            <span>${tipo}</span>
        </label>
    `;
    return li;
}

//Estado de leyenda controlada por el usuario


const botonMostrarLeyenda =
    document.getElementById("boton-mostrar-leyenda");

const panelLeyenda = 
    document.getElementById("leyenda-refugios");

function establecerVisibilidadLeyenda(visible) {

    if (!panelLeyenda || !botonMostrarLeyenda) return;

    //Si se abre la leyenda, cerrar el popup activo
    if (visible) {
        mapa.closePopup();
    }

    //Mostrar u ocultar la leyenda
    panelLeyenda.classList.toggle("oculto", !visible);

    //Actualizar accesibilidad del botón
    botonMostrarLeyenda.setAttribute(
        "aria-expanded",
        String(visible)
    );

    botonMostrarLeyenda.setAttribute(
        "title",
        visible ? "Ocultar leyenda" : "Mostrar leyenda"
    );

}

botonMostrarLeyenda.addEventListener("click", () => {

    const estaOCulta = panelLeyenda.classList.contains("oculto");

    establecerVisibilidadLeyenda(estaOCulta);
});
