var map = L.map('map', {
			center: [36.72016, -4.42034],
			zoom: 12,
		});
		
		var OSM = 
			L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', 
			{
                maxZoom: 20,
				attribution: 'Desarrollo; <a href="https://www.uma.es/departamento-de-geografia/"> DEP.GEOGRAFÍA -UMA-</a> Map data &copy; <a href="http://openstreetmap.org"> OpenStreetMap</a>	contributors, ',
                    id: 'OpenStreetMap'
                     }).addTo(map);
		var markers = L.markerClusterGroup();
		var MarkerOptions = {
			 radius: 8,
			 fillColor: "#088A68",
			 color: "#090",
			 weight: 1,
			 opacity: 1,
			 fillOpacity: 0.8
		};
		

		function popup_REF (feature, layer) {
			layer.bindPopup("<div style=text-align:center><h3>"+feature.properties.TIP_RC+
			 "<h3></div><hr><table><tr><td>Tipo: "+feature.properties.tipo+
			 "</td></tr><tr><td>Tipología: "+feature.properties.tipologia+
			 "</td></tr><tr><td>Acceso: "+feature.properties.acceso+
			 "</td></tr><tr><td>Ubicación: "+feature.properties.Ubicación+
			 "</td></tr><tr><td>Horario: "+feature.properties.Horario+
			 "</td></tr><tr><td><b>Encuesta<b>: "+feature.properties.encuesta+
			 "</td></tr></table>",
			 {minWidth: 150, maxWidth: 258});
			};
		
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
		
		
