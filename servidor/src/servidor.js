/* SERVIDOR SEGURO DE ALTAS DE REFUGIOS (Cloudflare Worker).
   API pública: GET /municipio, POST /refugios. Solo altas, NUNCA validaciones.
   El navegador NO tiene acceso a credenciales SheetDB. */

const DIRECCION_POLIGONOS =
  "https://services1.arcgis.com/nCKYwcSONQTkPA4K/ArcGIS/rest/services/muni/FeatureServer/0/query";

// Códigos y tipologías: los únicos válidos, con independencia del navegador.
const TIPOS = Object.freeze({
  "Bibliotecas": ["Interior", "RI1_BIBLIOTECA"],
  "Centros Cívicos": ["Interior", "RI9_CENTROS CIVICOS"],
  "Centros Educativos": ["Interior", "RI2_CENTROS EDUCATIVOS"],
  "Espacios verdes con agua potable": ["Exterior", "RE3_ESPACIOS VERDES CON AGUA POTABLE"],
  "Espacios verdes sin agua potable": ["Exterior", "RE4_ESPACIOS VERDES SIN AGUA POTABLE"],
  "Estación de autobuses": ["Interior", "RI6_ESTACIONES DE TRANSPORTE"],
  "Estación de tren": ["Interior", "RI6_ESTACIONES DE TRANSPORTE"],
  "Gran comercio": ["Interior", "RI7_CENTROS COMERCIALES"],
  "Iglesia": ["Interior", "RI8_EDIFICIOS RELIGIOSOS"],
  "Mercado de abastos": ["Interior", "RI4_MERCADO DE ABASTO"],
  "Museo": ["Interior", "RI5_MUSEOS"],
  "Pabellón": ["Interior", "RI3_POLIDEPORTIVO CUBIERTO"],
  "Pabellón deportivo": ["Interior", "RI3_POLIDEPORTIVO CUBIERTO"],
  "Parada de metro": ["Interior", "RI6_ESTACIONES DE TRANSPORTE"],
  "Piscinas Municipales": ["Exterior", "RE1_PISCINAS MUNICIPALES"],
  "Playa": ["Exterior", "RE2_PLAYAS"]
});

function respuestaJson(datos, estado, origen) {
  const encabezados = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (origen) {
    encabezados["Access-Control-Allow-Origin"] = origen;
    encabezados["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(datos), {status: estado, headers: encabezados});
}

function origenPermitido(peticion, entorno) {
  const origen = peticion.headers.get("Origin") || "";
  const admitidos = new Set((entorno.ORIGENES_AUTORIZADOS || "")
    .split(",").map(t => t.trim()).filter(Boolean));
  return admitidos.has(origen) ? origen : null;
}

function coordenadasValidas(latitud, longitud) {
  return Number.isFinite(latitud) && Number.isFinite(longitud) &&
    latitud >= -90 && latitud <= 90 && longitud >= -180 && longitud <= 180;
}

async function municipioPorPoligono(latitud, longitud) {
  if (!coordenadasValidas(latitud, longitud)) throw new Error("Coordenadas inválidas.");
  // Consulta espacial a polígonos municipales basados en la cartografía del IGN.
  // No utiliza el nombre de ciudad más próximo ni rectángulos aproximados.
  const parametros = new URLSearchParams({
    f: "json",
    where: "1=1",
    geometryType: "esriGeometryPoint",
    geometry: JSON.stringify({x: longitud, y: latitud, spatialReference: {wkid: 4326}}),
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "NATCODE,NAMEUNIT",
    returnGeometry: "false"
  });
  const senal = AbortSignal.timeout(10000);
  const respuesta = await fetch(`${DIRECCION_POLIGONOS}?${parametros}`, {signal: senal});
  if (!respuesta.ok) throw new Error("Servicio cartográfico no disponible.");
  const cuerpo = await respuesta.json();
  if (cuerpo.error || !Array.isArray(cuerpo.features)) {
    throw new Error("Respuesta cartográfica no válida.");
  }
  const encontrado = cuerpo.features
    .map(f => String(f.attributes?.NATCODE ?? "").trim())
    .map(codigo => codigo.match(/(?:^|\D)(29067|41091)$/)?.[1] || "")
    .find(codigo => codigo === "29067" || codigo === "41091");
  if (encontrado === "29067") return {cod_mun: "29067", municipio: "Málaga", provincia: "Málaga"};
  if (encontrado === "41091") return {cod_mun: "41091", municipio: "Sevilla", provincia: "Sevilla"};
  return null;
}

function textoValido(valor, maximo, obligatorio = true) {
  if (typeof valor !== "string") return null;
  const texto = valor.trim().replace(/\s+/g, " ");
  if ((obligatorio && !texto) || texto.length > maximo || /[\u0000-\u001f\u007f]/u.test(texto)) return null;
  return texto;
}

// Evita fórmulas en Google Sheets aun si SheetDB procesa texto como introducido por usuario.
function textoSeguroParaHoja(valor) {
  return /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
}

async function comprobarTurnstile(token, peticion, entorno) {
  if (typeof token !== "string" || !token || token.length > 2048 || !entorno.SECRETO_TURNSTILE) return false;
  const formulario = new URLSearchParams({secret: entorno.SECRETO_TURNSTILE, response: token});
  const direccionIp = peticion.headers.get("CF-Connecting-IP");
  if (direccionIp) formulario.set("remoteip", direccionIp);
  const respuesta = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: formulario, signal: AbortSignal.timeout(10000)
  });
  if (!respuesta.ok) return false;
  const comprobacion = await respuesta.json();
  const dominios = new Set((entorno.DOMINIOS_TURNSTILE || "").split(",").map(x => x.trim()));
  return comprobacion.success === true && comprobacion.action === "alta_refugio" &&
    dominios.has(comprobacion.hostname);
}

async function limitarSolicitudes(entorno, peticion, alta) {
  const limitador = alta ? entorno.LIMITE_ALTAS : entorno.LIMITE_CONSULTAS;
  // Sin binding requerido: no se admiten altas sin limitación configurada.
  if (!limitador?.limit) return false;
  const direccionIp = peticion.headers.get("CF-Connecting-IP") || "sin-ip";
  const {success} = await limitador.limit({key: `${alta ? "alta" : "municipio"}:${direccionIp}`});
  return Boolean(success);
}

async function tramitarAlta(peticion, entorno, origen) {
  if (peticion.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
    return respuestaJson({error: "Se requiere JSON."}, 415, origen);
  }
  const tamano = Number(peticion.headers.get("Content-Length") || 0);
  if (tamano > 6000) return respuestaJson({error: "Solicitud demasiado grande."}, 413, origen);
  const texto = await peticion.text();
  if (texto.length > 6000) return respuestaJson({error: "Solicitud demasiado grande."}, 413, origen);
  let datos;
  try { datos = JSON.parse(texto); } catch { return respuestaJson({error: "JSON inválido."}, 400, origen); }
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return respuestaJson({error: "Datos inválidos."}, 400, origen);

  const nombre = textoValido(datos.nombre, 160);
  const horario = textoValido(datos.horario, 250, false);
  const tipo = typeof datos.tipo === "string" ? datos.tipo : "";
  const acceso = datos.acceso;
  const latitud = datos.lat, longitud = datos.lng;
  if (!nombre || horario === null || !Object.hasOwn(TIPOS, tipo) ||
      datos.tipologia !== TIPOS[tipo][0] || !["Gratuito", "De pago"].includes(acceso) ||
      !coordenadasValidas(latitud, longitud)) {
    return respuestaJson({error: "Campos o coordenadas no válidos."}, 422, origen);
  }

  // Validación del desafío ANTES de cualquier escritura.
  let verificadoHumano = false;
  try { verificadoHumano = await comprobarTurnstile(datos.tokenVerificacion, peticion, entorno); }
  catch { verificadoHumano = false; }
  if (!verificadoHumano) return respuestaJson({error: "Verificación de seguridad rechazada o caducada."}, 403, origen);

  // Segunda comprobación espacial obligatoria en el servidor.
  let municipio;
  try { municipio = await municipioPorPoligono(latitud, longitud); }
  catch { return respuestaJson({error: "No se pudo verificar el municipio; no se ha guardado nada."}, 503, origen); }
  if (!municipio) return respuestaJson({error: "El punto está fuera de los municipios admitidos."}, 422, origen);

  if (!entorno.URL_SHEETDB || !entorno.CABECERA_AUTORIZACION_SHEETDB ||
      !/^https:\/\/sheetdb\.io\/api\/v1\/[\w-]+\/?$/.test(entorno.URL_SHEETDB) ||
      !/^(Bearer|Basic)\s+\S+$/.test(entorno.CABECERA_AUTORIZACION_SHEETDB)) {
    return respuestaJson({error: "El destino de datos no está configurado de forma segura."}, 503, origen);
  }

  const id = crypto.randomUUID();
  const registro = {
    id,
    nombre: textoSeguroParaHoja(nombre),
    tipo,
    tip_rc: TIPOS[tipo][1],
    tipologia: TIPOS[tipo][0],
    acceso,
    horario: textoSeguroParaHoja(horario),
    lat: latitud, lng: longitud,
    verificado: "NO",
    cod_mun: municipio.cod_mun,
    municipio: municipio.municipio,
    provincia: municipio.provincia
  };

  try {
    const respuesta = await fetch(`${entorno.URL_SHEETDB}?mode=RAW`, {
      method: "POST", headers: {
        "Content-Type": "application/json",
        "Authorization": entorno.CABECERA_AUTORIZACION_SHEETDB
      },
      body: JSON.stringify({data: [registro]}),
      signal: AbortSignal.timeout(12000)
    });
    if (!respuesta.ok) {
      console.error("SheetDB rechazó el registro:", respuesta.status);
      return respuestaJson({error: "No se pudo registrar la solicitud."}, 502, origen);
    }
    const resultado = await respuesta.json().catch(() => ({}));
    if (Number(resultado.created) !== 1) {
      console.error("Respuesta inesperada del destino de datos.");
      return respuestaJson({error: "No se ha podido confirmar el guardado; consulta al operador antes de reenviar."}, 502, origen);
    }
    return respuestaJson({ok: true, id, verificado: "NO", municipio}, 201, origen);
  } catch {
    return respuestaJson({error: "No se pudo confirmar el guardado; consulta al operador antes de reenviar."}, 502, origen);
  }
}

export default {
  async fetch(peticion, entorno) {
    const origen = origenPermitido(peticion, entorno);
    // CORS limita navegadores, pero no sustituye la validación Turnstile.
    if (!origen) return respuestaJson({error: "Origen no permitido."}, 403, null);
    const ruta = new URL(peticion.url).pathname;
    if (peticion.method === "OPTIONS") {
      if (!["/municipio", "/refugios"].includes(ruta)) return new Response(null, {status: 404});
      return new Response(null, {status: 204, headers: {
        "Access-Control-Allow-Origin": origen,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin"
      }});
    }
    if (ruta === "/municipio" && peticion.method === "GET") {
      if (!await limitarSolicitudes(entorno, peticion, false)) return respuestaJson({error: "Demasiadas consultas."}, 429, origen);
      const u = new URL(peticion.url);
      const latitud = Number(u.searchParams.get("lat"));
      const longitud = Number(u.searchParams.get("lng"));
      if (!u.searchParams.has("lat") || !u.searchParams.has("lng") ||
          !coordenadasValidas(latitud, longitud)) {
        return respuestaJson({error: "Coordenadas inválidas."}, 400, origen);
      }
      try { return respuestaJson({municipio: await municipioPorPoligono(latitud, longitud)}, 200, origen); }
      catch { return respuestaJson({error: "Servicio cartográfico no disponible."}, 503, origen); }
    }
    if (ruta === "/refugios" && peticion.method === "POST") {
      if (!await limitarSolicitudes(entorno, peticion, true)) return respuestaJson({error: "Demasiadas solicitudes."}, 429, origen);
      return tramitarAlta(peticion, entorno, origen);
    }
    return respuestaJson({error: "Ruta no encontrada."}, 404, origen);
  }
};
