/* 00 CONFIGURACIÓN PÚBLICA. No colocar aquí secretos ni URL de SheetDB. */
const CONFIGURACION_SERVIDOR = Object.freeze({
    urlServicio: "https://SUSTITUIR-POR-TU-WORKER.workers.dev",
    clavePublicaTurnstile: "SUSTITUIR-POR-LA-CLAVE-PUBLICA"
});

function obtenerDireccionServicio(ruta) {
    const base = CONFIGURACION_SERVIDOR.urlServicio;
    if (!/^https:\/\/[^/]+/i.test(base) || base.includes("SUSTITUIR")) {
        throw new Error("Configura urlServicio en js/00-configuracion-servicio.js");
    }
    return `${base.replace(/\/$/, "")}${ruta}`;
}

/* Encuestas: configurar únicamente con una cuenta gestionada por la UMA.
   Public key, service ID y template ID son identificadores públicos, NO secretos SMTP.
   La cuenta remitente y el destinatario se configuran en EmailJS. */
const CONFIGURACION_ENCUESTAS = Object.freeze({
    clavePublica: "SUSTITUIR-CLAVE-PUBLICA-EMAILJS-UMA",
    identificadorServicio: "SUSTITUIR-SERVICIO-EMAILJS-UMA",
    identificadorPlantilla: "SUSTITUIR-PLANTILLA-EMAILJS-UMA"
});
