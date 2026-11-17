"""Pruebas locales sin red, sin SheetDB y sin modificar datos de usuario."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

RAIZ = Path(__file__).resolve().parents[3]
RUTA_MODULO = RAIZ / "herramientas/sincronizacion/sincronizar.py"
spec = importlib.util.spec_from_file_location("sincronizar", RUTA_MODULO)
sinc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sinc)

SOLICITUD = {
    "id": "70bee991-7f74-4c82-9dae-123456789abc",
    "nombre": "Refugio de prueba controlada",
    "tipo": "Bibliotecas",
    "tip_rc": "RI1_BIBLIOTECA",
    "tipologia": "Interior",
    "acceso": "Gratuito",
    "horario": "Lunes a viernes",
    "lat": "37.3942",
    "lng": "-5.9841",
    "verificado": "NO",
    "cod_mun": "41091",
    "municipio": "Sevilla",
    "provincia": "Sevilla",
}


def devolver_sevilla(lat, lng):
    return {"cod_mun": "41091", "municipio": "Sevilla", "provincia": "Sevilla"}


class PruebasSincronizacion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.maestro_original = json.loads((RAIZ / "malaga_sevilla_4326.geojson").read_text(encoding="utf-8"))

    def setUp(self):
        self.maestro = copy.deepcopy(self.maestro_original)
        self.fila = copy.deepcopy(SOLICITUD)
        self.total_original = len(self.maestro["features"])
        self.siguiente_fid = max(sinc.validar_maestro(self.maestro)) + 1

    def validar(self, filas, maestro=None, registro=None, validador=devolver_sevilla):
        return sinc.reconstruir(maestro or self.maestro, filas, registro if registro is not None else {}, validador)

    def test_base_real_conserva_identificadores(self):
        self.assertGreaterEqual(len(self.maestro["features"]), 706)
        self.assertGreaterEqual(max(sinc.validar_maestro(self.maestro)), 706)

    def test_no_pendiente_no_publica(self):
        nuevo, registro, resumen = self.validar([self.fila])
        self.assertEqual(nuevo, self.maestro)
        self.assertEqual(registro, {})
        self.assertEqual(resumen["nuevos"], 0)

    def test_al_aprobar_se_publica_con_fid_estable_y_geometria(self):
        self.fila["verificado"] = "SI"
        nuevo, registro, resumen = self.validar([self.fila])
        self.assertEqual(len(nuevo["features"]), self.total_original + 1)
        alta = nuevo["features"][-1]
        self.assertEqual(alta["properties"]["fid"], self.siguiente_fid)
        self.assertEqual(alta["properties"]["TIP_RC"], "RI1_BIBLIOTECA")
        self.assertEqual(alta["properties"]["origen_registro"], "hoja_solicitudes")
        self.assertEqual(alta["geometry"], {"type": "MultiPoint", "coordinates": [[-5.9841, 37.3942]]})
        self.assertEqual(registro[self.fila["id"]], self.siguiente_fid)
        self.assertEqual(resumen["nuevos"], 1)

    def test_dos_ejecuciones_no_duplican(self):
        self.fila["verificado"] = "SI"
        nuevo, registro, _ = self.validar([self.fila])
        dos, registro_dos, resumen = self.validar([self.fila], nuevo, registro)
        self.assertEqual(nuevo, dos)
        self.assertEqual(registro, registro_dos)
        self.assertEqual(resumen["nuevos"], 0)

    def test_rechazar_antes_de_publicar_no_modifica(self):
        self.fila["verificado"] = "RECHAZADO"
        nuevo, registro, resumen = self.validar([self.fila])
        self.assertEqual(nuevo, self.maestro)
        self.assertEqual(registro, {})

    def test_retirada_y_reaprobacion_conserva_fid(self):
        self.fila["verificado"] = "SI"
        publicado, registro, _ = self.validar([self.fila])
        self.fila["verificado"] = "RECHAZADO"
        retirado, registro2, resumen = self.validar([self.fila], publicado, registro)
        self.assertEqual(len(retirado["features"]), self.total_original)
        self.assertEqual(resumen["retirados"], 1)
        self.assertEqual(registro, registro2)
        self.fila["verificado"] = "SI"
        republicado, registro3, _ = self.validar([self.fila], retirado, registro2)
        self.assertEqual(republicado["features"][-1]["properties"]["fid"], self.siguiente_fid)
        self.assertEqual(registro3, registro2)

    def test_corregir_horario_no_cambia_fid(self):
        self.fila["verificado"] = "SI"
        publicado, registro, _ = self.validar([self.fila])
        self.fila["horario"] = "Lunes a domingo"
        modificado, _, resumen = self.validar([self.fila], publicado, registro)
        self.assertEqual(modificado["features"][-1]["properties"]["fid"], self.siguiente_fid)
        self.assertEqual(modificado["features"][-1]["properties"]["Horario"], "Lunes a domingo")
        self.assertEqual(resumen["actualizados"], 1)

    def test_cambio_coordenadas_publicado_bloqueado(self):
        self.fila["verificado"] = "SI"
        publicado, registro, _ = self.validar([self.fila])
        self.fila["lat"] = "37.5"
        with self.assertRaisesRegex(sinc.ErrorSincronizacion, "coordenadas"):
            self.validar([self.fila], publicado, registro)

    def test_municipio_no_coincidente_rechazado(self):
        self.fila["verificado"] = "SI"
        with self.assertRaisesRegex(sinc.ErrorSincronizacion, "municipio"):
            self.validar([self.fila], validador=lambda lat, lng: {"cod_mun": "29067"})

    def test_tipo_ajeno_y_codigo_malicioso_rechazados(self):
        self.fila["verificado"] = "SI"
        self.fila["tipo"] = "Otro"
        with self.assertRaises(sinc.ErrorSincronizacion):
            self.validar([self.fila])
        self.fila["tipo"] = "Bibliotecas"
        self.fila["tip_rc"] = "RI9_CENTROS CIVICOS"
        with self.assertRaises(sinc.ErrorSincronizacion):
            self.validar([self.fila])

    def test_identificador_repetido_bloqueado(self):
        with self.assertRaisesRegex(sinc.ErrorSincronizacion, "duplicado"):
            self.validar([self.fila, copy.deepcopy(self.fila)])

    def test_rechaza_borrado_de_fila_publicada(self):
        self.fila["verificado"] = "SI"
        publicado, registro, _ = self.validar([self.fila])
        with self.assertRaisesRegex(sinc.ErrorSincronizacion, "vacía"):
            self.validar([], publicado, registro)

    def test_fuente_geojson_no_se_reescribe_si_no_cambia(self):
        serializado = sinc.serializar_geojson(self.maestro)
        self.assertEqual(json.loads(serializado), self.maestro)

    def test_descarga_paginada_con_autenticacion(self):
        urls = []
        def lector(url, headers):
            urls.append(url)
            self.assertEqual(headers["Authorization"], "Bearer prueba")
            return [self.fila]
        filas = sinc.descargar_solicitudes(
            "https://sheetdb.io/api/v1/prueba", "Bearer prueba", lector=lector
        )
        self.assertEqual(len(filas), 1)
        self.assertIn("sheet=refugios_nuevos", urls[0])


if __name__ == "__main__":
    unittest.main()
