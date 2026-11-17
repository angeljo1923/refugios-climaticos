/* 02 TIPOS REFUGIO */

//Iconos por tipo cuando se acerca el zoom
const iconosPorTipo = {
    "Bibliotecas": {
        rutaIcono: "iconos/biblioteca.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI1_BIBLIOTECA"
    },
    "Centros Cívicos": {
        rutaIcono: "iconos/centrocivico.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI9_CENTROS CIVICOS"
    },
    "Centros Educativos": {
        rutaIcono: "iconos/centroeducativo.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI2_CENTROS EDUCATIVOS"
    },
    "Espacios verdes con agua potable": {
        rutaIcono: "iconos/verdeagua.svg",
        tipologia: 'Exterior',
        codigoTipRC: "RE3_ESPACIOS VERDES CON AGUA POTABLE"
    },
    "Espacios verdes sin agua potable": {
        rutaIcono: "iconos/verdesinagua.svg",
        tipologia: 'Exterior',
        codigoTipRC: "RE4_ESPACIOS VERDES SIN AGUA POTABLE"
    },
    "Estación de autobuses": {
        rutaIcono: "iconos/buses.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI6_ESTACIONES DE TRANSPORTE"
    },
    "Estación de tren": {
        rutaIcono: "iconos/tren.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI6_ESTACIONES DE TRANSPORTE"
    },
    "Gran comercio": {
        rutaIcono: "iconos/comercio.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI7_CENTROS COMERCIALES"
    },
    "Iglesia": {
        rutaIcono: "iconos/iglesia.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI8_EDIFICIOS RELIGIOSOS"
    },
    "Mercado de abastos": {
        rutaIcono: "iconos/abastos.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI4_MERCADO DE ABASTO"
    },
    "Museo": {
        rutaIcono: "iconos/museo.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI5_MUSEOS"
    },
    "Pabellón": {
        rutaIcono: "iconos/pabellon.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI3_POLIDEPORTIVO CUBIERTO"
    },
    "Pabellón deportivo": {
        rutaIcono: "iconos/pabellondeportivo.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI3_POLIDEPORTIVO CUBIERTO"
    },
    "Parada de metro": {
        rutaIcono: "iconos/metro.svg",
        tipologia: 'Interior',
        codigoTipRC: "RI6_ESTACIONES DE TRANSPORTE"
    },
    "Piscinas Municipales": {
        rutaIcono: "iconos/piscina.svg",
        tipologia: 'Exterior',
        codigoTipRC: "RE1_PISCINAS MUNICIPALES"
    },
    "Playa": {
        rutaIcono: "iconos/playa.svg",
        tipologia: 'Exterior',
        codigoTipRC: "RE2_PLAYAS"
    }
};


function obtenerIconoPorTipo(tipo, tipologia) {

    const datosIcono = iconosPorTipo[tipo];

    const ruta = datosIcono?.rutaIcono || "default.svg";

    //Priorizar la tipología definida para cada tipo
    const tipologiaNormalizada =
        datosIcono?.tipologia ||
        String(tipologia || "").trim();

    let filtroColor = "";

    if (tipologiaNormalizada === "Interior") {

        filtroColor =
            "invert(23%) sepia(81%) saturate(2864%) " +
            "hue-rotate(180deg) brightness(95%) contrast(95%)";

    } else if (tipologiaNormalizada === "Exterior") {

        filtroColor =
            "invert(32%) sepia(31%) saturate(1064%) " +
            "hue-rotate(61deg) brightness(85%) contrast(95%)";

    }

    //Tamaño adaptado a la anchura de pantalla
    const esPantallaPequena =
        window.matchMedia("(max-width: 480px)").matches;

    const tamanoIcono = esPantallaPequena ? 34 : 48;

    const tamanoImagen = esPantallaPequena ? 19 : 24;

    return L.divIcon({

        className: "icono-refugio",

        html: `
            <img
                src="${ruta}"
                alt="${tipo}"
                style="
                    width: ${tamanoImagen}px;
                    height: ${tamanoImagen}px;
                    filter: ${filtroColor};
                    object-fit: contain;
                "
            >
        `,

        iconSize: [tamanoIcono, tamanoIcono],

        iconAnchor: [
            tamanoIcono / 2,
            tamanoIcono / 2
        ],

        popupAnchor: [0, -15]

    });

}

function obtenerTip_RC(tipo) {
    return iconosPorTipo[tipo]?.codigoTipRC || "";
}
