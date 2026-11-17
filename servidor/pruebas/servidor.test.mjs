import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import servidor from '../src/servidor.js';

const fetchOriginal = globalThis.fetch;
after(() => { globalThis.fetch = fetchOriginal; });
const llamadas = [];
const entorno = {
    ORIGENES_AUTORIZADOS: 'https://angeljo1923.github.io',
    DOMINIOS_TURNSTILE: 'angeljo1923.github.io',
    SECRETO_TURNSTILE: 'secreto_falso_para_tests',
    URL_SHEETDB: 'https://sheetdb.io/api/v1/api_ficticia',
    CABECERA_AUTORIZACION_SHEETDB: 'Bearer TEST_SIN_VALOR',
    LIMITE_ALTAS: { limit: async () => ({success:true}) },
    LIMITE_CONSULTAS: { limit: async () => ({success:true}) }
};

function prepararRespuestas({municipio='29067', captcha=true, sheetOk=true}={}) {
    llamadas.length = 0;
    globalThis.fetch = async (destino, opciones={}) => {
        const direccion = String(destino); llamadas.push({direccion, opciones});
        if (direccion.includes('ArcGIS/rest/services/muni/')) {
            return new Response(JSON.stringify({
                features: municipio ? [{attributes:{NATCODE:municipio,NAMEUNIT:'Málaga'}}] : []
            }), {status:200, headers:{'Content-Type':'application/json'}});
        }
        if (direccion.includes('/siteverify')) {
            return new Response(JSON.stringify({success:captcha,action:'alta_refugio',hostname:'angeljo1923.github.io'}));
        }
        if (direccion.includes('sheetdb.io')) {
            return new Response(JSON.stringify({created:sheetOk?1:0}), {status:sheetOk?201:500});
        }
        throw new Error('Solicitud externa inesperada: '+direccion);
    };
}
const origen = 'https://angeljo1923.github.io';
function peticion(ruta, metodo='GET', datos=null, origenPeticion=origen) {
    const encabezados={'Origin':origenPeticion, 'CF-Connecting-IP':'203.0.113.6'};
    if (datos) encabezados['Content-Type']='application/json';
    return new Request('https://prueba.workers.dev'+ruta, {
        method:metodo,headers:encabezados, ...(datos?{body:JSON.stringify(datos)}:{})
    });
}
const nuevaAlta = {
    nombre:'Biblioteca de prueba',tipo:'Bibliotecas',tipologia:'Interior',acceso:'Gratuito',
    horario:'9:00 a 20:00',lat:36.72,lng:-4.42,tokenVerificacion:'token-simulado'
};

test('consulta espacial usa lon=X, lat=Y y devuelve municipio',async()=>{
    prepararRespuestas();
    const r=await servidor.fetch(peticion('/municipio?lat=36.72&lng=-4.42'),entorno);
    assert.equal(r.status,200);
    assert.equal((await r.json()).municipio.cod_mun,'29067');
    const g=llamadas.find(c=>c.direccion.includes('ArcGIS/'));
    const parametros=new URL(g.direccion).searchParams;
    assert.deepEqual(JSON.parse(parametros.get('geometry')).x, -4.42);
    assert.deepEqual(JSON.parse(parametros.get('geometry')).y, 36.72);
    assert.equal(parametros.get('spatialRel'),'esriSpatialRelIntersects');
});

test('fuera del polígono no acepta el punto',async()=>{
    prepararRespuestas({municipio:null});
    const respuesta=await servidor.fetch(peticion('/municipio?lat=36.72&lng=-4.42'),entorno);
    assert.equal((await respuesta.json()).municipio,null);
});

test('alta aceptada asigna ID, municipio, código y estado en servidor',async()=>{
    prepararRespuestas();
    const r=await servidor.fetch(peticion('/refugios','POST',{
        ...nuevaAlta,verificado:'SI',cod_mun:'41091',tip_rc:'TIPO_INVENTADO',id:'fraudulento'
    }),entorno);
    assert.equal(r.status,201);
    const j=await r.json();
    assert.equal(j.verificado,'NO');
    const llamada=llamadas.find(c=>c.direccion.includes('sheetdb.io'));
    assert.ok(llamada);
    assert.ok(llamada.opciones.headers.Authorization.startsWith('Bearer '));
    const registro=JSON.parse(llamada.opciones.body).data[0];
    assert.equal(registro.cod_mun,'29067');
    assert.equal(registro.verificado,'NO');
    assert.equal(registro.tip_rc,'RI1_BIBLIOTECA');
    assert.notEqual(registro.id,'fraudulento');
    assert.match(registro.id,/^[a-f0-9-]{36}$/);
});

test('coordenadas fuera de municipios no producen escritura',async()=>{
    prepararRespuestas({municipio:null});
    const r=await servidor.fetch(peticion('/refugios','POST',nuevaAlta),entorno);
    assert.equal(r.status,422);
    assert.equal(llamadas.some(x=>x.direccion.includes('sheetdb.io')),false);
});

test('captcha inválido no produce escritura',async()=>{
    prepararRespuestas({captcha:false});
    const r=await servidor.fetch(peticion('/refugios','POST',nuevaAlta),entorno);
    assert.equal(r.status,403);
    assert.equal(llamadas.some(x=>x.direccion.includes('sheetdb.io')),false);
});

test('tipología incompatible rechazada sin escritura',async()=>{
    prepararRespuestas();
    const r=await servidor.fetch(peticion('/refugios','POST',{...nuevaAlta,tipologia:'Exterior'}),entorno);
    assert.equal(r.status,422);
    assert.equal(llamadas.length,0);
});

test('origen no permitido devuelve 403',async()=>{
    prepararRespuestas();
    const r=await servidor.fetch(peticion('/refugios','POST',nuevaAlta,'https://dominio-falso.es'),entorno);
    assert.equal(r.status,403);
    assert.equal(llamadas.length,0);
});

test('sin rate limiter no se permite el alta',async()=>{
    prepararRespuestas();
    const e={...entorno, LIMITE_ALTAS:null};
    const r=await servidor.fetch(peticion('/refugios','POST',nuevaAlta),e);
    assert.equal(r.status,429);
    assert.equal(llamadas.length,0);
});

test('fallo del servidor cartográfico suspende la escritura',async()=>{
    prepararRespuestas();
    const original=globalThis.fetch;
    globalThis.fetch=async (...args)=>{
        if(String(args[0]).includes('ArcGIS/')) throw new Error('Servicio no disponible');
        return original(...args);
    };
    const r=await servidor.fetch(peticion('/refugios','POST',nuevaAlta),entorno);
    assert.equal(r.status,503);
    assert.equal(llamadas.some(x=>x.direccion.includes('sheetdb.io')),false);
});
