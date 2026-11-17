#!/usr/bin/env python3
"""Copia únicamente los recursos públicos al artefacto de GitHub Pages."""
from pathlib import Path
import shutil
import sys

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "publicacion"
ARCHIVOS = ("index.html", "estado_publicacion.html", "malaga_sevilla_4326.geojson", "Logo_financiador.png")
DIRECTORIOS = ("css", "js", "img", "iconos")


def preparar():
    faltantes = [nombre for nombre in (*ARCHIVOS, *DIRECTORIOS) if not (RAIZ / nombre).exists()]
    if faltantes:
        raise RuntimeError("Faltan recursos del visor en el repositorio: " + ", ".join(faltantes))
    if SALIDA.exists():
        shutil.rmtree(SALIDA)
    SALIDA.mkdir()
    for nombre in ARCHIVOS:
        shutil.copy2(RAIZ / nombre, SALIDA / nombre)
    for nombre in DIRECTORIOS:
        shutil.copytree(RAIZ / nombre, SALIDA / nombre)
    for opcional in ("CNAME", "favicon.ico", "robots.txt"):
        if (RAIZ / opcional).is_file():
            shutil.copy2(RAIZ / opcional, SALIDA / opcional)
    (SALIDA / ".nojekyll").write_text("", encoding="utf-8")
    print("Sitio público preparado en publicacion/ (sin secretos ni hojas pendientes).")


if __name__ == "__main__":
    try:
        preparar()
    except (RuntimeError, OSError) as error:
        print("ERROR AL PREPARAR EL VISOR:", error, file=sys.stderr)
        sys.exit(1)
