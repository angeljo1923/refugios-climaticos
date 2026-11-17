#!/usr/bin/env python3
"""Sincronización segura e idempotente de altas autorizadas en la hoja.

No escribe en SheetDB; solo actualiza el GeoJSON maestro y el registro de FID.
No modifica los refugios históricos ajenos a la hoja de solicitudes.
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path
import re
import sys
import time
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

CATALOGO = {
    "Bibliotecas": ("Interior", "RI1_BIBLIOTECA"),
    "Centros Cívicos": ("Interior", "RI9_CENTROS CIVICOS"),
    "Centros Educativos": ("Interior", "RI2_CENTROS EDUCATIVOS"),
    "Espacios verdes con agua potable": ("Exterior", "RE3_ESPACIOS VERDES CON AGUA POTABLE"),
    "Espacios verdes sin agua potable": ("Exterior", "RE4_ESPACIOS VERDES SIN AGUA POTABLE"),
    "Estación de autobuses": ("Interior", "RI6_ESTACIONES DE TRANSPORTE"),
    "Estación de tren": ("Interior", "RI6_ESTACIONES DE TRANSPORTE"),
    "Gran comercio": ("Interior", "RI7_CENTROS COMERCIALES"),
    "Iglesia": ("Interior", "RI8_EDIFICIOS RELIGIOSOS"),
    "Mercado de abastos": ("Interior", "RI4_MERCADO DE ABASTO"),
    "Museo": ("Interior", "RI5_MUSEOS"),
    "Pabellón": ("Interior", "RI3_POLIDEPORTIVO CUBIERTO"),
    "Pabellón deportivo": ("Interior", "RI3_POLIDEPORTIVO CUBIERTO"),
    "Parada de metro": ("Interior", "RI6_ESTACIONES DE TRANSPORTE"),
    "Piscinas Municipales": ("Exterior", "RE1_PISCINAS MUNICIPALES"),
    "Playa": ("Exterior", "RE2_PLAYAS"),
}
MUNICIPIOS = {
    "29067": {"cod_mun": "29067", "municipio": "Málaga", "provincia": "Málaga"},
    "41091": {"cod_mun": "41091", "municipio": "Sevilla", "provincia": "Sevilla"},
}
ORIGEN_AUTOMATICO = "hoja_solicitudes"
ESTADOS = {"NO", "SI", "RECHAZADO"}
TAMANO_PAGINA = 500
MAXIMO_PAGINAS = 20
MAXIMO_RETIRADAS_AUTOMATICAS = 5

class ErrorSincronizacion(Exception):
    """Fallo controlado; el archivo público permanece sin modificar."""


def valor(fila, campo):
    dato = fila.get(campo, "")
    return str(dato if dato is not None else "").strip()


def texto_normalizado(s):
    return "".join(c for c in unicodedata.normalize("NFKD", str(s).casefold()) if not unicodedata.combining(c)).strip()


def numero_coordenada(dato, minimo, maximo, campo):
    try:
        numero = float(str(dato).strip().replace(",", "."))
    except (TypeError, ValueError):
        raise ErrorSincronizacion(f"Coordenada {campo} incorrecta.") from None
    if not math.isfinite(numero) or not minimo <= numero <= maximo:
        raise ErrorSincronizacion(f"Coordenada {campo} fuera de rango.")
    return numero


def comprobar_fila(fila):
    """Permite publicar solo columnas aprobadas y coherentes con el catálogo."""
    identificador = valor(fila, "id")
    nombre = valor(fila, "nombre")
    tipo = valor(fila, "tipo")
    acceso = valor(fila, "acceso")
    horario = valor(fila, "horario") or valor(fila, "Horario")
    codigo = valor(fila, "cod_mun").zfill(5)
    municipio = MUNICIPIOS.get(codigo)

    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{3,99}", identificador):
        raise ErrorSincronizacion("ID de solicitud ausente o inválido.")
    if not 1 <= len(nombre) <= 160 or any(ord(c) < 32 for c in nombre):
        raise ErrorSincronizacion("Nombre del refugio vacío o inválido.")
    if tipo not in CATALOGO:
        raise ErrorSincronizacion("Tipo de refugio desconocido.")
    if acceso not in {"Gratuito", "De pago"}:
        raise ErrorSincronizacion("Acceso no permitido.")
    if len(horario) > 250 or any(ord(c) < 32 for c in horario):
        raise ErrorSincronizacion("Horario inválido.")
    if not municipio:
        raise ErrorSincronizacion("Código municipal no admitido.")
    if valor(fila, "municipio") and texto_normalizado(valor(fila, "municipio")) != texto_normalizado(municipio["municipio"]):
        raise ErrorSincronizacion("El municipio no coincide con su código.")
    if valor(fila, "provincia") and texto_normalizado(valor(fila, "provincia")) != texto_normalizado(municipio["provincia"]):
        raise ErrorSincronizacion("La provincia no coincide con su código.")
    if valor(fila, "tipologia") and valor(fila, "tipologia") != CATALOGO[tipo][0]:
        raise ErrorSincronizacion("Tipología incompatible con el tipo.")
    if valor(fila, "tip_rc") and valor(fila, "tip_rc") != CATALOGO[tipo][1]:
        raise ErrorSincronizacion("TIP_RC incompatible con el tipo.")

    lat = numero_coordenada(fila.get("lat"), -90, 90, "lat")
    lng = numero_coordenada(fila.get("lng"), -180, 180, "lng")
    return {
        "id": identificador, "nombre": nombre, "tipo": tipo,
        "tipologia": CATALOGO[tipo][0], "TIP_RC": CATALOGO[tipo][1],
        "acceso": acceso, "Horario": horario, "lat": lat, "lng": lng,
        **municipio,
    }


def lectura_http_json(direccion, cabeceras=None, reintentos=3):
    if not direccion.startswith("https://"):
        raise ErrorSincronizacion("Las consultas externas requieren HTTPS.")
    for intento in range(reintentos):
        try:
            solicitud = Request(direccion, headers={"Accept": "application/json", **(cabeceras or {})})
            with urlopen(solicitud, timeout=15) as respuesta:
                if respuesta.status != 200:
                    raise ErrorSincronizacion(f"Respuesta HTTP {respuesta.status}.")
                datos = respuesta.read(8_000_001)
                if len(datos) > 8_000_000:
                    raise ErrorSincronizacion("Respuesta demasiado grande.")
                return json.loads(datos)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            if isinstance(error, HTTPError) and error.code in (400, 401, 403, 404, 422):
                raise ErrorSincronizacion(f"Servicio externo rechazó la consulta (HTTP {error.code}).") from None
            if intento == reintentos - 1:
                raise ErrorSincronizacion("No se pudo consultar el servicio externo.") from error
            time.sleep(1.5 * (intento + 1))
    raise ErrorSincronizacion("No se pudo consultar el servicio externo.")


def descargar_solicitudes(direccion, autorizacion, hoja="refugios_nuevos", lector=lectura_http_json):
    url = urlparse(direccion)
    if url.scheme != "https" or url.netloc != "sheetdb.io" or not re.fullmatch(r"/api/v1/[A-Za-z0-9_-]+/?", url.path):
        raise ErrorSincronizacion("URL SheetDB mal configurada. Utiliza el endpoint /api/v1/ID sin parámetros.")
    if not re.fullmatch(r"(Basic|Bearer)\s+\S+", autorizacion or ""):
        raise ErrorSincronizacion("Falta la cabecera Authorization de SheetDB.")
    resultado = []
    for pagina in range(MAXIMO_PAGINAS):
        argumentos = urlencode({"sheet": hoja, "limit": TAMANO_PAGINA, "offset": pagina * TAMANO_PAGINA})
        filas = lector(f"{direccion.rstrip('/')}?{argumentos}", {"Authorization": autorizacion})
        if not isinstance(filas, list) or any(not isinstance(x, dict) for x in filas):
            raise ErrorSincronizacion("SheetDB ha devuelto una estructura inesperada.")
        resultado.extend(filas)
        if len(filas) < TAMANO_PAGINA:
            return resultado
    raise ErrorSincronizacion("Se ha superado el límite de paginación configurado.")


def crear_validador_municipal(direccion_servicio, origen):
    if not re.fullmatch(r"https://[^/]+(?:/[^?]*)?", direccion_servicio or "") or not origen.startswith("https://"):
        raise ErrorSincronizacion("Faltan URL_WORKER_GEO u ORIGEN_VISOR en Variables del repositorio.")

    def validar(lat, lng):
        parametros = urlencode({"lat": lat, "lng": lng})
        respuesta = lectura_http_json(f"{direccion_servicio.rstrip('/')}/municipio?{parametros}", {"Origin": origen})
        if not isinstance(respuesta, dict):
            raise ErrorSincronizacion("Respuesta del servicio geográfico inválida.")
        return respuesta.get("municipio")

    return validar


def coordenadas_de_elemento(elemento):
    geom = elemento.get("geometry") or {}
    xy = geom.get("coordinates")
    if geom.get("type") == "MultiPoint" and isinstance(xy, list) and len(xy) == 1:
        xy = xy[0]
    if not isinstance(xy, list) or len(xy) != 2:
        raise ErrorSincronizacion("Una geometría publicada no es Point o MultiPoint válido.")
    return float(xy[1]), float(xy[0])


def validar_maestro(maestro):
    if not isinstance(maestro, dict) or maestro.get("type") != "FeatureCollection" or not isinstance(maestro.get("features"), list):
        raise ErrorSincronizacion("El GeoJSON maestro no es un FeatureCollection.")
    vistos = set()
    for f in maestro["features"]:
        propiedades = f.get("properties", {})
        identificador = propiedades.get("fid")
        if type(identificador) is not int or identificador <= 0 or identificador in vistos:
            raise ErrorSincronizacion("El maestro contiene FID duplicados o no numéricos.")
        vistos.add(identificador)
        coordenadas_de_elemento(f)
    return vistos


def reconstruir(maestro, solicitudes, registro, validador_municipio):
    """Devuelve (geojson_nuevo, registro_nuevo, resumen). No modifica argumentos."""
    fids_en_maestro = validar_maestro(maestro)
    if not isinstance(registro, dict):
        raise ErrorSincronizacion("El registro histórico de FID no es un objeto JSON.")
    copia_registro = dict(registro)
    ids_por_fid = {}
    for identificador, fid in copia_registro.items():
        if not isinstance(identificador, str) or type(fid) is not int or fid <= 0:
            raise ErrorSincronizacion("El registro histórico contiene un identificador inválido.")
        if fid in ids_por_fid:
            raise ErrorSincronizacion("El registro histórico tiene FID duplicados.")
        ids_por_fid[fid] = identificador

    # Identificar solo los registros gestionados automáticamente. Los 706
    # refugios históricos y las modificaciones manuales no se tocan.
    datos_historicos = []
    publicaciones = {}
    for f in maestro["features"]:
        p = f.get("properties", {})
        if p.get("origen_registro") == ORIGEN_AUTOMATICO:
            ident = str(p.get("id", ""))
            if not ident or ident in publicaciones:
                raise ErrorSincronizacion("Registro de alta anterior con ID ausente o repetido.")
            publicaciones[ident] = f
            if ident in copia_registro and copia_registro[ident] != p["fid"]:
                raise ErrorSincronizacion("FID incompatible entre maestro y registro histórico.")
            if p["fid"] in ids_por_fid and ids_por_fid[p["fid"]] != ident:
                raise ErrorSincronizacion("FID reservado por otra solicitud.")
            copia_registro[ident] = p["fid"]
            ids_por_fid[p["fid"]] = ident
        else:
            datos_historicos.append(f)
    fid_historicos = {f["properties"]["fid"] for f in datos_historicos}
    if fid_historicos & set(ids_por_fid):
        raise ErrorSincronizacion("Un FID histórico coincide con un FID de solicitud.")

    if not isinstance(solicitudes, list):
        raise ErrorSincronizacion("Las solicitudes no son una lista.")
    filas_por_id = {}
    for indice, fila in enumerate(solicitudes, start=2):
        ident = valor(fila, "id")
        if not ident:
            # SheetDB puede devolver filas vacías: no son solicitudes.
            if any(valor(fila, campo) for campo in ("nombre", "tipo", "verificado", "lat", "lng")):
                raise ErrorSincronizacion(f"Fila {indice}: contiene datos sin ID.")
            continue
        if ident in filas_por_id:
            raise ErrorSincronizacion(f"Fila {indice}: identificador de solicitud duplicado.")
        estado = valor(fila, "verificado").upper()
        if estado not in ESTADOS:
            raise ErrorSincronizacion(f"Fila {indice}: estado inválido, usa NO, SI o RECHAZADO.")
        filas_por_id[ident] = fila

    if not solicitudes and publicaciones:
        raise ErrorSincronizacion("La hoja aparece vacía; se ha detenido la sincronización para evitar bajas masivas.")
    faltantes = set(publicaciones) - set(filas_por_id)
    if faltantes:
        raise ErrorSincronizacion("Se han borrado solicitudes ya publicadas de la hoja; restaura las filas, no las elimines.")

    activos = {}
    total_nuevos = 0
    total_cambios = 0
    usado_fid = set(fids_en_maestro) | set(ids_por_fid)
    nuevo_fid = max(usado_fid, default=0)
    marcas_de_distancia = []
    for f in datos_historicos:
        p = f["properties"]
        marcas_de_distancia.append((texto_normalizado(p.get("nombre", "")), str(p.get("cod_mun", "")).zfill(5), *coordenadas_de_elemento(f)))
    for ident in sorted(filas_por_id):
        fila = filas_por_id[ident]
        if valor(fila, "verificado").upper() != "SI":
            continue
        try:
            datos = comprobar_fila(fila)
        except ErrorSincronizacion as error:
            raise ErrorSincronizacion(f"Solicitud {ident}: {error}") from None

        # Identificadores incluidos manualmente por el panel anterior: mantener sin duplicar.
        if ident not in publicaciones and any(str(f["properties"].get("id", "")) == ident for f in datos_historicos):
            continue

        anterior = publicaciones.get(ident)
        if anterior:
            lat_anterior, lng_anterior = coordenadas_de_elemento(anterior)
            if abs(lat_anterior - datos["lat"]) > 1e-8 or abs(lng_anterior - datos["lng"]) > 1e-8:
                raise ErrorSincronizacion(f"Solicitud {ident}: no se pueden cambiar coordenadas de un refugio publicado sin revisión técnica.")
            if str(anterior["properties"].get("cod_mun", "")).zfill(5) != datos["cod_mun"]:
                raise ErrorSincronizacion(f"Solicitud {ident}: no se puede cambiar el municipio de un refugio publicado.")
        else:
            # Bloquear posibles duplicados cercanos con mismo nombre y municipio.
            for nombre, codigo, lat, lng in marcas_de_distancia:
                metros = math.hypot((datos["lat"] - lat) * 111_000, (datos["lng"] - lng) * 85_000)
                if nombre == texto_normalizado(datos["nombre"]) and codigo == datos["cod_mun"] and metros < 50:
                    raise ErrorSincronizacion(f"Solicitud {ident}: posible duplicado a menos de 50 m; revisar.")
            if total_nuevos:
                time.sleep(2.1)  # Evitar superar la limitación de /municipio por IP.
            municipio_confirmado = validador_municipio(datos["lat"], datos["lng"])
            if not isinstance(municipio_confirmado, dict) or str(municipio_confirmado.get("cod_mun", "")).zfill(5) != datos["cod_mun"]:
                raise ErrorSincronizacion(f"Solicitud {ident}: municipio no confirmado por el servicio geográfico.")
            total_nuevos += 1
        if ident not in copia_registro:
            nuevo_fid += 1
            copia_registro[ident] = nuevo_fid
        fid = copia_registro[ident]
        if fid in fid_historicos:
            raise ErrorSincronizacion(f"Solicitud {ident}: FID reservado por un refugio histórico.")
        propiedades = dict(anterior["properties"]) if anterior else {}
        propiedades.update({
            "id": datos["id"], "fid": fid, "nombre": datos["nombre"],
            "tipo": datos["tipo"], "tipologia": datos["tipologia"],
            "TIP_RC": datos["TIP_RC"], "acceso": datos["acceso"],
            "Horario": datos["Horario"],
            "cod_mun": datos["cod_mun"], "municipio": datos["municipio"],
            "provincia": datos["provincia"], "verificado": "SI",
            "origen_registro": ORIGEN_AUTOMATICO,
            "Ubicación": f"https://www.google.com/maps?q={datos['lat']},{datos['lng']}",
        })
        elemento = {"type": "Feature", "properties": propiedades, "geometry": {
            "type": "MultiPoint", "coordinates": [[datos["lng"], datos["lat"]]]
        }}
        if elemento != anterior:
            if anterior:
                total_cambios += 1
        activos[ident] = elemento
        marcas_de_distancia.append((texto_normalizado(datos["nombre"]), datos["cod_mun"], datos["lat"], datos["lng"]))

    # Bajas únicamente si el operador cambia expresamente SI a NO o RECHAZADO.
    retirados = len(set(publicaciones) - set(activos))
    if retirados > MAXIMO_RETIRADAS_AUTOMATICAS:
        raise ErrorSincronizacion("Se han solicitado demasiadas bajas simultáneas. Requiere revisión técnica.")
    # No dar de baja solicitudes que se migraron manualmente.
    actualizado = dict(maestro)
    actualizado["features"] = datos_historicos + [activos[id] for id in sorted(activos, key=lambda x: copia_registro[x])]
    resumen = {"nuevos": total_nuevos, "actualizados": total_cambios, "retirados": retirados,
               "total_publicados": len(actualizado["features"]), "total_solicitudes": len(filas_por_id)}
    validar_maestro(actualizado)
    return actualizado, copia_registro, resumen


def serializar_geojson(datos):
    """Un objeto geográfico por línea para poder revisar los diffs en Git."""
    claves = [clave for clave in datos if clave != "features"]
    lineas = ["{"]
    for clave in claves:
        lineas.append(f'{json.dumps(clave, ensure_ascii=False)}: {json.dumps(datos[clave], ensure_ascii=False)},')
    lineas.append('"features": [')
    for indice, feature in enumerate(datos["features"]):
        linea = json.dumps(feature, ensure_ascii=False, separators=(", ", ": "))
        lineas.append(linea + ("," if indice + 1 < len(datos["features"]) else ""))
    lineas.extend(["]", "}", ""])
    return "\n".join(lineas)


def ejecutar():
    raiz = Path(__file__).resolve().parents[2]
    archivo_geo = raiz / "malaga_sevilla_4326.geojson"
    archivo_fid = raiz / "herramientas/sincronizacion/registro_fid.json"
    direccion = os.environ.get("URL_SHEETDB", "").strip()
    autorizacion = os.environ.get("CABECERA_AUTORIZACION_SHEETDB", "").strip()
    hoja = os.environ.get("HOJA_SHEETDB", "refugios_nuevos")
    validar = crear_validador_municipal(
        os.environ.get("URL_WORKER_GEO", ""), os.environ.get("ORIGEN_VISOR", "")
    )
    solicitudes = descargar_solicitudes(direccion, autorizacion, hoja)
    maestro = json.loads(archivo_geo.read_text(encoding="utf-8"))
    registro = json.loads(archivo_fid.read_text(encoding="utf-8"))
    maestro_nuevo, registro_nuevo, resumen = reconstruir(maestro, solicitudes, registro, validar)
    print("Resumen de sincronización:", json.dumps(resumen, ensure_ascii=False))
    if maestro_nuevo != maestro:
        archivo_geo.write_text(serializar_geojson(maestro_nuevo), encoding="utf-8")
        print("GeoJSON actualizado.")
    else:
        print("Sin cambios en GeoJSON.")
    if registro_nuevo != registro:
        archivo_fid.write_text(json.dumps(registro_nuevo, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
        print("Registro de identificadores actualizado.")


if __name__ == "__main__":
    try:
        ejecutar()
    except (ErrorSincronizacion, OSError, ValueError, KeyError) as e:
        print("ERROR DE SINCRONIZACIÓN:", e, file=sys.stderr)
        sys.exit(1)
