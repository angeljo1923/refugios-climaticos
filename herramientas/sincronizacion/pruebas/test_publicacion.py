"""Comprueba que los artefactos públicos no incluyan el servidor ni secretos."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

RAIZ = Path(__file__).resolve().parents[3]
esp = importlib.util.spec_from_file_location(
    "preparar_publicacion", RAIZ / "herramientas/sincronizacion/preparar_publicacion.py"
)
modulo = importlib.util.module_from_spec(esp)
esp.loader.exec_module(modulo)


class PruebasPublicacion(unittest.TestCase):
    def test_copia_unicamente_archivos_publicos(self):
        with tempfile.TemporaryDirectory() as ubicacion:
            raiz = Path(ubicacion)
            for archivo in modulo.ARCHIVOS:
                (raiz / archivo).write_text("prueba", encoding="utf-8")
            for carpeta in modulo.DIRECTORIOS:
                (raiz / carpeta).mkdir()
                (raiz / carpeta / "elemento.txt").write_text("prueba", encoding="utf-8")
            (raiz / "servidor").mkdir()
            (raiz / "servidor" / "clave-privada.txt").write_text("secreto", encoding="utf-8")
            anterior_raiz, anterior_salida = modulo.RAIZ, modulo.SALIDA
            try:
                modulo.RAIZ, modulo.SALIDA = raiz, raiz / "publicacion"
                modulo.preparar()
                self.assertTrue((raiz / "publicacion" / "index.html").exists())
                self.assertTrue((raiz / "publicacion" / ".nojekyll").exists())
                self.assertFalse((raiz / "publicacion" / "servidor").exists())
                self.assertFalse((raiz / "publicacion" / "herramientas").exists())
            finally:
                modulo.RAIZ, modulo.SALIDA = anterior_raiz, anterior_salida


if __name__ == "__main__":
    unittest.main()
