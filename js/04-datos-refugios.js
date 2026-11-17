/* 04 DATOS REFUGIOS */

//Capa geoJson.

// REESTRUCTURACIÓN: TODO SE HACE DENTRO DEL FETCH
fetch("malaga_sevilla_4326.geojson")
    .then(respuestaHTTP => respuestaHTTP.json())
    .then(data => {
        refugiosVerificados = {
            type: "FeatureCollection",
            features: data.features.filter(f => f.properties.verificado === "SI" && f.geometry)
        };

        grupoMarcadores = L.markerClusterGroup();
        capaAgrupada = L.geoJSON(refugiosVerificados, {
            pointToLayer: (elementoGeoJSON, coordenadasGeograficas) => {
                const tipo = elementoGeoJSON.properties.tipo;
                const marcador = L.marker(coordenadasGeograficas, { icon: iconoDefecto });
                (marcadoresAgrupadosPorTipo[tipo] ||= []).push(marcador);
                return marcador;
            },
            onEachFeature: vincularFichaRefugio
        });
        grupoMarcadores.addLayer(capaAgrupada);
        mapa.addLayer(grupoMarcadores);

        capaIconos = L.geoJSON(refugiosVerificados, {
            pointToLayer: (elementoGeoJSON, coordenadasGeograficas) => {
                const tipo = elementoGeoJSON.properties.tipo;
                const icono = obtenerIconoPorTipo(elementoGeoJSON.properties.tipo, elementoGeoJSON.properties.tipologia);
                // **CORRECCIÓN 1: Añade popupAnchor al marcador de la capa de iconos**
                const marcador = L.marker(coordenadasGeograficas, {
                    icon: icono,
                    popupAnchor: [0, -40]
                });
                if (!marcadoresPorTipo[tipo]) {
                    marcadoresPorTipo[tipo] = [];
                }
                marcadoresPorTipo[tipo].push(marcador);
                return marcador;
            },
            onEachFeature: vincularFichaRefugio
        });

        // Generar leyenda una única vez cuando las capas ya existen

        generarLeyenda();

        // Cambiar representación según el zoom

        function actualizarCapasPorZoom() {
            const zoomActual = mapa.getZoom();
            
            if (zoomActual >= 14) {

                //Iconos individuales

                if (mapa.hasLayer(grupoMarcadores)) {
                    mapa.removeLayer(grupoMarcadores);
                }

                if (!mapa.hasLayer(capaIconos)) {
                    mapa.addLayer(capaIconos);
                }
            } else {

                //Mostrar marcadores agrupados

                if (mapa.hasLayer(capaIconos)) {
                    mapa.removeLayer(capaIconos);
                }

                if(!mapa.hasLayer(grupoMarcadores)) {
                    mapa.addLayer(grupoMarcadores);
                }
            }
        }

        mapa.on("zoomend", actualizarCapasPorZoom);

        //Aplicar al cargar el visor

        actualizarCapasPorZoom();

        // **LÓGICA PARA PROCESAR FID DESDE LA URL (CORRECCIÓN)**
        function procesarEnlaceDirecto() {
            if (!fidRefugioParaAbrir) return;

            const refugioEncontrado = refugiosVerificados.features.find(elementoGeoJSON => elementoGeoJSON.properties.fid?.toString() === fidRefugioParaAbrir);

            if (refugioEncontrado) {
                const geometry = refugioEncontrado.geometry;
                let coordenadas;

                if (!geometry || !geometry.coordinates) {
                    console.error(`Error: Refugio con FID ${fidRefugioParaAbrir} no tiene coordenadas válidas.`);
                    return;
                }

                if (geometry.type === "MultiPoint") {
                    if (geometry.coordinates.length > 0) {
                        coordenadas = geometry.coordinates[0];
                    } else {
                        console.error(`Error: Geometría MultiPoint vacía para el refugio con FID ${fidRefugioParaAbrir}.`);
                        return;
                    }
                } else if (geometry.type === "Point") {
                    coordenadas = geometry.coordinates;
                } else {
                    console.error(`Error: Tipo de geometría no soportado para el refugio con FID ${fidRefugioParaAbrir}.`);
                    return;
                }

                if (!Array.isArray(coordenadas) || coordenadas.length !== 2) {
                    console.error(`Error: Coordenadas inválidas para el refugio con FID ${fidRefugioParaAbrir}.`, coordenadas);
                    return;
                }

                const coordenadasGeograficas = [coordenadas[1], coordenadas[0]];
                const tipo = refugioEncontrado.properties.tipo;
                const tipologia = refugioEncontrado.properties.tipologia;
                const icono = obtenerIconoPorTipo(tipo, tipologia);

                // **CORRECCIÓN: Centrar el mapa directamente en las coordenadas del marcador**
                mapa.setView(coordenadasGeograficas, 17, {
                    animate: true
                });

                // **CORRECCIÓN: Define un popupAnchor para el marcador temporal y lo ubica justo encima**
                const marcadorTemporal = L.marker(coordenadasGeograficas, {
                    icon: icono,
                    popupAnchor: [0, -40]
                }).addTo(mapa);

                // Agrega un pequeño retardo antes de abrir el popup
                setTimeout(() => {
                    crearContenidoFichaRefugio(refugioEncontrado, marcadorTemporal);
                    marcadorTemporal.openPopup();
                }, 50);

                // Remover el marcador temporal después de que el popup se haya mostrado
                marcadorTemporal.on('popupclose', () => {
                    mapa.removeLayer(marcadorTemporal);
                });
            } else {
                console.warn("No se encontró el refugio con FID:", fidRefugioParaAbrir);
            }
        }

        // Se mueve la llamada a la función dentro del bloque .then()
        procesarEnlaceDirecto();
    });
