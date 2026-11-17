#!/usr/bin/env python3
"""Audita recursos y configuración de la versión pública, sin modificar archivos.
Uso: python3 herramientas/comprobar_entrega.py [--estricto]
En modo básico, avisos de servicios externos no impiden publicar el mapa.
En modo estricto, para revisión previa a declaración estable, sí.
"""
from pathlib import Path
import json, re, sys, argparse
from html.parser import HTMLParser

RAIZ = Path(__file__).resolve().parents[1]

class ReferenciasHtml(HTMLParser):
    def __init__(self):
        super().__init__(); self.rutas=[]; self.ids=set(); self.duplicados=[]
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if attrs.get('id'):
            if attrs['id'] in self.ids: self.duplicados.append(attrs['id'])
            self.ids.add(attrs['id'])
        for atr in ('src', 'href'):
            ruta=attrs.get(atr,'')
            if ruta and not ruta.startswith(('http:', 'https:', 'data:', '#', 'mailto:', '//')):
                self.rutas.append(ruta.split('?')[0].split('#')[0])

def comprobar(estricto=False):
    fallos=[]; avisos=[]
    archivo=RAIZ/'index.html'
    if not archivo.exists(): return ['No existe index.html'], []
    h=ReferenciasHtml(); h.feed(archivo.read_text(encoding='utf8'))
    for ruta in h.rutas:
        if not (RAIZ/ruta).is_file(): fallos.append(f'Falta recurso enlazado en HTML: {ruta}')
    for d in h.duplicados: fallos.append(f'ID duplicado en HTML: {d}')
    for nombre in ('malaga_sevilla_4326.geojson','Logo_financiador.png','css/01-base.css','js/01-mapa.js', 'js/08-encuestas.js'):
        if not (RAIZ/nombre).is_file(): fallos.append(f'Falta archivo necesario: {nombre}')
    try:
        datos=json.loads((RAIZ/'malaga_sevilla_4326.geojson').read_text(encoding='utf8'))
        if datos.get('type') != 'FeatureCollection' or not isinstance(datos.get('features'),list) or not datos['features']:
            fallos.append('GeoJSON: no hay FeatureCollection con refugios')
        else:
            print('REFUGIOS EN GEOJSON:',len(datos['features']))
    except Exception as e: fallos.append(f'GeoJSON inválido: {e}')
    # referencias internas a recursos gráficos del catálogo
    iconos=(RAIZ/'js/02-tipos-refugio.js').read_text(encoding='utf8')
    for ruta in sorted(set(re.findall(r'["\'](iconos/[^"\']+\.svg)["\']',iconos))):
        if not (RAIZ/ruta).is_file(): fallos.append(f'Icono no disponible: {ruta}')
    # Detectar imágenes relativas dentro del CSS. No consultar URLs CDN.
    for css in (RAIZ/'css').glob('*.css'):
        texto=css.read_text(encoding='utf8')
        for ruta in re.findall(r'url\(["\']?([^\)"\']+)',texto):
            ruta=ruta.strip()
            if ruta.startswith(('http','data:','#','/')):continue
            if not (css.parent/ruta).is_file():fallos.append(f'Recurso CSS no disponible {css.name}: {ruta}')
    cfg=(RAIZ/'js/00-configuracion-servicio.js').read_text(encoding='utf8')
    if 'SUSTITUIR' in cfg:
        avisos.append('Quedan campos SUSTITUIR en js/00-configuracion-servicio.js (Worker/Turnstile/EmailJS UMA)')
    enc=(RAIZ/'js/08-encuestas.js').read_text(encoding='utf8')
    if 'service_lf5583h' in enc or 'XVVy-IexTTomx60lY' in enc:
        fallos.append('Aparece la cuenta EmailJS original en js/08-encuestas.js')
    if not (RAIZ/'.github/workflows/sincronizar-refugios.yml').is_file():
        avisos.append('No existe workflow de publicación de GitHub Pages')
    if estricto: fallos+=avisos; avisos=[]
    return sorted(set(fallos)),sorted(set(avisos))

if __name__ == '__main__':
    p=argparse.ArgumentParser(); p.add_argument('--estricto',action='store_true');args=p.parse_args()
    fallos,avisos=comprobar(args.estricto)
    for a in avisos: print('AVISO:',a)
    for f in fallos: print('ERROR:',f)
    print(f'RESUMEN: {len(fallos)} errores, {len(avisos)} avisos')
    sys.exit(1 if fallos else 0)
