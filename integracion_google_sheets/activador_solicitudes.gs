/**
 * Aviso de edición y conciliación diaria con GitHub. Proyecto INDEPENDIENTE
 * de Apps Script, administrado por la Universidad (no por el operador).
 *
 * Propiedades del script necesarias:
 * ID_HOJA, NOMBRE_PESTANA, REPOSITORIO, RAMA, TOKEN_GITHUB.
 * No pegar el token en el código ni en celdas.
 */

function propiedadesDeIntegracion() {
  const propiedades = PropertiesService.getScriptProperties().getProperties();
  const necesarias = ["ID_HOJA", "NOMBRE_PESTANA", "REPOSITORIO", "RAMA", "TOKEN_GITHUB"];
  const ausentes = necesarias.filter(clave => !propiedades[clave]);
  if (ausentes.length) {
    throw new Error("Faltan propiedades privadas de integración: " + ausentes.join(", "));
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(propiedades.REPOSITORIO)) {
    throw new Error("REPOSITORIO debe ser propietario/repositorio.");
  }
  return propiedades;
}

/** Ejecutar SOLO UNA VEZ desde la cuenta técnica. */
function instalarActivador() {
  const propiedades = propiedadesDeIntegracion();
  const anteriores = ScriptApp.getProjectTriggers().filter(activador =>
    ["alEditarSolicitudes", "conciliacionDiaria"].includes(activador.getHandlerFunction())
  );
  anteriores.forEach(activador => ScriptApp.deleteTrigger(activador));
  ScriptApp.newTrigger("alEditarSolicitudes")
    .forSpreadsheet(propiedades.ID_HOJA)
    .onEdit()
    .create();
  // Respaldo diario independiente de las programaciones de GitHub Actions.
  ScriptApp.newTrigger("conciliacionDiaria")
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  console.log("Activadores de edición y conciliación diaria instalados.");
}

/** Al editar un registro aprobado o el estado verificado, pedir actualización. */
function alEditarSolicitudes(evento) {
  if (!evento || !evento.range) return;
  const propiedades = propiedadesDeIntegracion();
  const hoja = evento.range.getSheet();
  if (hoja.getParent().getId() !== propiedades.ID_HOJA ||
      hoja.getName() !== propiedades.NOMBRE_PESTANA) return;

  const filaInicio = evento.range.getRow();
  const filaFin = evento.range.getLastRow();
  if (filaFin < 2) return; // Cabecera

  const cabeceras = hoja.getRange(1, 1, 1, hoja.getLastColumn())
    .getValues()[0].map(valor => String(valor).trim());
  const columnaEstado = cabeceras.indexOf("verificado") + 1;
  if (!columnaEstado) throw new Error("No existe la columna verificado.");

  const tocaEstado = evento.range.getColumn() <= columnaEstado &&
                     evento.range.getLastColumn() >= columnaEstado;
  let requiereSincronizacion = tocaEstado;
  if (!requiereSincronizacion) {
    // También propaga las correcciones de un refugio ya aprobado.
    const primera = Math.max(2, filaInicio);
    const estados = hoja.getRange(primera, columnaEstado, filaFin - primera + 1, 1)
      .getValues().flat();
    requiereSincronizacion = estados.some(valor => String(valor).trim().toUpperCase() === "SI");
  }
  if (requiereSincronizacion) solicitarSincronizacion();
}

/** Llamada a GitHub: el contenido de la hoja NO se envía por esta solicitud. */
function solicitarSincronizacion() {
  const p = propiedadesDeIntegracion();
  const direccion = "https://api.github.com/repos/" + p.REPOSITORIO +
    "/actions/workflows/sincronizar-refugios.yml/dispatches";
  const respuesta = UrlFetchApp.fetch(direccion, {
    method: "post",
    muteHttpExceptions: true,
    contentType: "application/json",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + p.TOKEN_GITHUB,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    payload: JSON.stringify({ref: p.RAMA})
  });
  if (respuesta.getResponseCode() !== 204) {
    console.error("GitHub rechazó el aviso. Código HTTP: " + respuesta.getResponseCode());
    throw new Error("No se pudo iniciar la sincronización. Consulta las ejecuciones de Apps Script.");
  }
  console.log("Sincronización solicitada a GitHub.");
}

/** Conciliación diaria: rescata ediciones cuyo aviso no llegase a GitHub. */
function conciliacionDiaria() {
  solicitarSincronizacion();
}

/** Prueba manual, sin cambiar ninguna fila de la hoja. */
function probarAviso() {
  solicitarSincronizacion();
}
