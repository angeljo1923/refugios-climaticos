var map = L.map('map', {
			center: [37, -5],
			zoom: 9,
		});

		//Actualizar escala

		let clusterGroup;
		let capaIconos;

		const marcadoresPorTipo = {};



		function actualizarEscalaPersonalizada() {
			const zoom = map.getZoom();
			const center = map.getCenter();
		
			// Resolución en metros por pixel (Web Mercator)
			const resolution = 40075016.686 / (256 * Math.pow(2, zoom));
			const escala = resolution * 80; // 80 píxeles
		
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

		//Para  las anotaciones de la capa ESRI

		map.createPane('etiquetasPane');
		map.getPane('etiquetasPane').style.zIndex = 650;
		map.getPane('etiquetasPane').style.pointerEvents = 'none'; // evita interferencias

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
			"Bibliotecas": "iconos/biblioteca.svg",
			"Centros Cívicos": "iconos/centrocivico.svg",
			"Centros Educativos": "iconos/centroeducativo.svg",
			"Espacio verdes con agua potable": "iconos/verdeagua.svg",
			"Espacios verdes sin agua potable": "iconos/verdesinagua.svg",
			"Estación de autobuses": "iconos/buses.svg",
			"Estación de tren": "iconos/tren.svg",
			"Gran comercio": "iconos/comercio.svg",
			"Iglesia": "iconos/iglesia.svg",
			"Mercado de abastos": "iconos/abastos.svg",
			"Museo": "iconos/museo.svg",
			"Pabellón": "iconos/pabellon.svg",
			"Pabellón deportivo": "iconos/pabellondeportivo.svg",
			"Parada de metro": "iconos/metro.svg",
			"Piscinas Municipales": "iconos/piscina.svg",
			"Playa": "iconos/playa.svg"
		};

		

		function obtenerIconoPorTipo(tipo) {
			const ruta = iconosPorTipo[tipo] || "default.svg";
			return L.icon({
				iconUrl: ruta,
				className: 'icono-refugio'
			});
		}

		//Para la correspondencia del campo de agregar refugio

		function obtenerTip_RC(tipo) {
		const correspondencias = {
		"Bibliotecas": "RI1_BIBLIOTECA",
		"Centros cívicos": "RI9_CENTROS CIVICOS",
		"Centros Educativos": "RI2_CENTROS EDUCATIVOS",
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
	return correspondencias[tipo] || "";
	}

	//Función de generar leyenda

	function generarLeyenda() {
		const contenedor = document.getElementById("contenido-leyenda");
		contenedor.innerHTML = "";

		for (const [tipo, ruta] of Object.entries(iconosPorTipo)) {
			const item = document.createElement("li");
			item.innerHTML = `<img src="${ruta}" alt="${tipo}"> 
			${tipo}
			<input type="checkbox" class="checkbox-tipo" data-tipo="${tipo}" checked style="margin-left:auto">
			`;
			contenedor.appendChild(item);
		}

		//Evento de cada checkbox

		const checkboxes = document.querySelectorAll(".checkbox-tipo");
		checkboxes.forEach(checkbox => {
			checkbox.addEventListener("change", (e) => {
				const tipo = e.target.dataset.tipo;
				const visibles = marcadoresPorTipo[tipo];
				if (visibles) {
					visibles.forEach(marker => {
						if (e.target.checked) {
							map.addLayer(marker);
						} else {
							map.removeLayer(marker);
						}
					});
				}
			});
		});
	}

	//Función para cerrarla

	let leyendaCerradaManual = false;

	document.getElementById("cerrar-leyenda").addEventListener("click", () => {
		document.getElementById("leyenda-refugios").classList.add("oculto");
		leyendaCerradaManual = true;
	});

		//Capa geoJson.

		fetch("malaga_sevilla_4326.geojson")
			.then(response => response.json())
			.then(data => {
				//Solo refugios verificados
				const refugiosVerificados = {
					type: "FeatureCollection",
					features: data.features.filter(f => f.properties. verificado === "SI")
				};

				//Capa MarkerCluster para zoom bajo

				const clusterGroup = L.markerClusterGroup();
				capaCluster = L.geoJSON(refugiosVerificados, {
					pointToLayer: (feature, latlng) => {
						return L.marker(latlng, { icon: iconoDefecto }); //Icono por defecto
					},
					onEachFeature: popup_REF
				});
				clusterGroup.addLayer(capaCluster);

				//Capa con iconos personalizados (zoom alto)

				capaIconos = L.geoJSON(refugiosVerificados, {
					pointToLayer: (feature, latlng) => {
						const tipo = feature.properties.tipo;
						const icono = obtenerIconoPorTipo(feature.properties.tipo);
						const marker = L.marker(latlng, { icon : icono });

						//Agregar o quitar marcadores por tipo

						if(!marcadoresPorTipo[tipo]) {
							marcadoresPorTipo[tipo] = [];
						}
						marcadoresPorTipo[tipo].push(marker);

						return marker;
					},
					onEachFeature: popup_REF
				});

				//Al principio se añade la capa del cluster

				map.addLayer(clusterGroup);

				//Cambio de zooms entre capas

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
			});
		//Capas base
		
		var OSM = 
			L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', 
			{
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
			'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
			{
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
		
		document.getElementById("botonesri").addEventListener("click", function () {
			cambiarCapaBase(capaEsri, true);
			activarBoton("botonesri"); // ← MUY IMPORTANTE
		});

		//Evento que añade capas juntas de Esri con la de anotaciones

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

		//Evento de botones activos e inactivos

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
		

		function popup_REF(feature, layer) {
			layer.bindPopup(
				`<div class="custom-popup">
				<h3>${feature.properties.TIP_RC}</h3>
				<hr>
				<table>
					<tr><td><strong>Tipo:</strong> ${feature.properties.tipo}</td></tr>
					<tr><td><strong>Tipología:</strong> ${feature.properties.tipologia}</td></tr>
					<tr><td><strong>Acceso:</strong> ${feature.properties.acceso}</td></tr>
					<tr><td><strong>Ubicación:</strong> ${feature.properties.Ubicacion}</td></tr>
					<tr><td><strong>Horario:</strong> ${feature.properties.Horario}</td></tr>
				</table>
				<div class="boton-centro">
				<button class="boton-encuesta" onclick="abrirEncuesta('${feature.properties.nombre}', '${feature.properties.id_dera}')">
				Califica este refugio
				</button>
				</div>
			</div>`,
			{ minWidth: 180, maxWidth: 260 }
			);
		}

		//Funcion de la encuesta

		
		function colorPuntos(d) {
			return '#088A68';
			};
		
		function estilo_REF (feature) {
			return{
			radius: 7,
			fillColor: colorPuntos(feature.properties.num),
			 color: colorPuntos(feature.properties.num),
			weight: 2,
			opacity : 1,
			fillOpacity : 0.8
			};
			};
		
		

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

	map.on('mousemove', function (e) {
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
	let refugioSeleccionado = { nombre: "", id_dera: "" };

	const encuestaModal = document.getElementById("encuesta-modal");
	const modalContenido = document.getElementById("modal-contenido");

	const pasos = [
  		{
    		texto: "¿Cómo valorarías la accesibilidad?",
    		opciones: ["Buena", "Aceptable", "Mala"]
  		},
  		{
    		texto: "¿Cómo valorarías el confort térmico?",
    		opciones: ["Adecuado", "Regular", "Inadecuado"]
  		},
  		{
    		texto: "¿Qué servicios están disponibles?",
    		opciones: ["Agua", "Electricidad", "Baño", "Ninguno"]
  		},
  		{
    		texto: "Observaciones (máx. 500 caracteres)",
    		observaciones: true
  		}
	];

	function abrirEncuesta(nombre, id_dera) {

  		pasoActual = 0;
  		respuestas = {};
  		refugioSeleccionado = { nombre, id_dera };

		//Cerrar leyenda

		document.getElementById("leyenda-refugios").classList.add("oculto");
		leyendaCerradaManual= true;

  		mostrarPaso(pasoActual);
  		encuestaModal.classList.remove("modal-hidden");
		}

	function mostrarPaso(paso) {
		const pasoData = pasos[paso];
		modalContenido.innerHTML = ""; //Limpia el contenido anterior

		if (pasoData.observaciones) {
			//Último paso con textarea
			modalContenido.innerHTML = `
			<h3>${pasoData.texto}</h3>
			<textarea id="observaciones" maxlength="500" rows="5" placeholder="Deja aquí tus comentarios"></textarea>
			<div class="boton-centro">
				<button class="enviar-btn" onclick="enviarResultados()">Enviar</button>
				<button class="enviar-btn" onclick="cerrarEncuesta()">Finalizar</button>
			</div>
			`;
		} else {
			//Preguntas con opciones y botón de cancelar
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
	} 
		else if (
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
			map.once("click", function (e) {
				const coords = e.latlng;
				const idUnico = Date.now().toString();
				municipioData= obtenerDatosMunicipio(coords.lat, coords.lng);

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
				`;
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
		leyendaCerradaManual= true;

		//Pasos del asistente

		pasoAsistente = 0;
		datosRefugio = {properties: {}, verificado: "NO" };
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
	});

	btnSiguiente.addEventListener("click", () => {
		guardarDatosPasoActual();
		pasoAsistente++;
		if (pasoAsistente < pasosAsistente.length) {
			mostrarPasoAsistente();
			if (pasoAsistente === pasosAsistente.length -1) {
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
			body: JSON.stringify({ data: [nuevoRegistro]})
		})
		.then(response =>  {
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
				datosRefugio.properties.TIP_RC =obtenerTip_RC(tipo);
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