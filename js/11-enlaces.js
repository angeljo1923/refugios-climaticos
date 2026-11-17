/* 11 ENLACES */

/*GENERACIÓN DE ENLACES PARA COMPARTIR*/

//URL vista actual del mapa

function generarEnlaceVistaActual() {
    const centro = mapa.getCenter();
    const zoomActual = mapa.getZoom();

    const url = new URL(window.location.pathname, window.location.origin);

    url.searchParams.set("lat", centro.lat.toFixed(6));
    url.searchParams.set("lng", centro.lng.toFixed(6));
    url.searchParams.set("z", zoomActual);

    return url.toString();
    
}

//URL directa de un refugio a partir del FID

function generarEnlaceRefugio(fid) {
    if (fid === undefined || fid === null || fid === "") {
        return null;
    }

    const url = new URL(window.location.pathname, window.location.origin);
    url.searchParams.set("fid", String(fid));

    return url.toString();
}

async function copiarAlPortapapeles(texto) {
    try {
        if (!navigator.clipboard || !window.isSecureContext) {
            throw new Error("Portapapeles moderno no disponible");
        }

        await navigator.clipboard.writeText(texto);
        alert("Enlace copiado al portapapeles");

    } catch (error) {
        console.warn("No se pudo copiar automáticamente:", error);

        window.prompt(
            "Copia el enlace con Ctrl+C (o manteniendo pulsado en móvil):",
            texto
        );
    }
}
