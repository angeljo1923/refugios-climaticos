var map = L.map('map', {
			center: [36.72016, -4.42034],
			zoom: 12,
		});

		//Actualizar escala

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
		
		var REF = L.geoJSON(geojson, {
			pointToLayer: function (feature, latlng) {
				return L.circleMarker(latlng, MarkerOptions);
				},
			style: estilo_REF,
			onEachFeature: popup_REF
			});
		map.addLayer(REF);
		   markers.addLayer(REF);
		   map.addLayer(markers);


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
  		mostrarPaso(pasoActual);
  		encuestaModal.classList.remove("modal-hidden");
		}

	function mostrarPaso(paso) {
  		const pasoData = pasos[paso];
  		modalContenido.innerHTML = "";

  		if (pasoData.observaciones) {
    		modalContenido.innerHTML = `
      		<h3>${pasoData.texto}</h3>
      		<textarea id="observaciones" maxlength="500" rows="5" placeholder="Escribe tus comentarios..."></textarea>
      		<button class="enviar-btn" onclick="enviarResultados()">Enviar</button>
    	`;
  	} else {
    	const botones = pasoData.opciones.map(op =>
      	`<button onclick="seleccionarOpcion('${op}')">${op}</button>`
    	).join("");
    	modalContenido.innerHTML = `
      	<h3>${pasoData.texto}</h3>
      	<div class="opciones">${botones}</div>
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

  		emailjs.send("service_lf5583h", "template_3hznx42", payload)
    		.then(() => {
      		alert("Gracias por tu respuesta. Se ha enviado correctamente.");
      		encuestaModal.classList.add("hidden");
    		})
    		.catch(error => {
      		console.error("Error al enviar:", error);
      		alert("Hubo un error al enviar la encuesta.");
    		});
}