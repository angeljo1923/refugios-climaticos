/* 07 PIE MAPA */

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
    const elementoFecha = document.getElementById("fecha_hora");
    if (elementoFecha) {
        elementoFecha.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
    }
}

mostrarfechahora();
setInterval(mostrarfechahora, 60000);

//Coordenadas en el pie de página

mapa.on('mousemove', function(e) {
    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);
    const elementoCoordenadas = document.getElementById("coordenadas_mapa");
    if (elementoCoordenadas) {
        elementoCoordenadas.textContent = `Coordenadas: ${lat}, ${lng}`;
    }
});
