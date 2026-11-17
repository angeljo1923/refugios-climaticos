/* 12 AJUSTES PANTALLA */

//AJUSTES RESPONSIVOS DEL MAPA

function reajustarMapa() {
    if (typeof mapa !== "undefined") {
        setTimeout(() => {
            mapa.invalidateSize({
                animate: false
            });
        }, 150);
    }
}

//Cuando cambia el tamaño de la ventana

window.addEventListener("resize", reajustarMapa);

//Cuando se gira un teléfono o tablet

window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        
        mapa.invalidateSize({
            animate: false
        });

        /*Solo se restablece la vista si estamos cerca de la general.
        Si el usuario está en Málaga o Sevilla no lo saca */

        if(mapa.getZoom() <= 9) {
            establecerVistaInicial();
        }
    }, 300);
});

//Ajuste inicial tras la carga de la página

window.addEventListener("load", () => {
    reajustarMapa();
});
