/* =====================================================================
   Datos semilla de la demo.
   Todo lo que la demo muestra sale de acá + lo que la persona hace.
   Las fechas son relativas a "hoy" (días atrás) para que la demo no
   envejezca: "últimos 12 meses" siempre significa los últimos 12 meses.
   Si cambiás la forma de estos datos, subí SEED_VERSION: así los
   navegadores que tenían una partida guardada arrancan de cero.
   ===================================================================== */
const SEED_VERSION = 2;
const DAY = 864e5;
const ago = d => Date.now() - d * DAY;

/* Propiedades de Inmobiliaria Del Sur (la cuenta del propietario en la demo).
   sc = ilustración: 0 depto, 1 casa, 2 monoambiente, 3 edificio, 4 local, 5 PH */
const SEED_PROPS = () => [
  {id:1,sc:0,title:'Depto 2 ambientes con balcón',zone:'Centro',price:780000,feats:['2 amb','48 m²'],status:'active',agent:'Marcos P.',desc:'Luminoso, a una cuadra de la plaza. Cocina separada y balcón al frente.',exp:45000,pets:'No',contract:'24 meses'},
  {id:2,sc:1,title:'Casa 3 dormitorios con patio',zone:'Zona Norte',price:840000,feats:['3 dorm','110 m²'],status:'active',agent:'Marcos P.',desc:'Patio con parrilla, cochera cubierta y dos baños.',exp:0,pets:'Sí',contract:'24 meses'},
  {id:3,sc:2,title:'Monoambiente luminoso',zone:'Barrio Sur',price:520000,feats:['1 amb','32 m²'],status:'active',agent:'Sofía R.',desc:'Ideal para una persona, a tres cuadras del centro.',exp:28000,pets:'No',contract:'12 meses'},
  {id:4,sc:3,title:'Depto 3 ambientes con cochera',zone:'Centro',price:1150000,feats:['3 amb','78 m²'],status:'active',agent:'Sofía R.',desc:'Piso alto, vista despejada y cochera fija.',exp:70000,pets:'No',contract:'24 meses'},
  {id:5,sc:4,title:'Local con vidriera',zone:'Centro',price:1200000,feats:['60 m²'],status:'paused',agent:'',desc:'Sobre calle comercial.',exp:0,pets:'—',contract:'36 meses'},
  {id:6,sc:5,title:'PH 2 dormitorios',zone:'Barrio Sur',price:690000,feats:['2 dorm','70 m²'],status:'rented',agent:'Sofía R.',desc:'Patio compartido.',exp:0,pets:'Sí',contract:'24 meses'},
  {id:7,sc:3,title:'Depto 1 dormitorio a estrenar',zone:'Centro',price:610000,feats:['1 dorm','40 m²'],status:'active',agent:'Marcos P.',desc:'Edificio nuevo con amenities, lavadero común y portero.',exp:52000,pets:'Sí',contract:'24 meses'},
  {id:8,sc:1,title:'Casa 2 dormitorios con jardín',zone:'Zona Oeste',price:720000,feats:['2 dorm','85 m²'],status:'active',agent:'Sofía R.',desc:'Jardín al fondo, galería techada y calle tranquila.',exp:0,pets:'Sí',contract:'24 meses'},
  {id:9,sc:5,title:'PH 3 ambientes con terraza',zone:'Barrio Sur',price:850000,feats:['3 amb','82 m²'],status:'active',agent:'Marcos P.',desc:'Sin expensas, terraza propia y entrada independiente.',exp:0,pets:'No',contract:'24 meses'}
];

/* Postulantes de otras personas, por propiedad. Lucía (la inquilina de la
   demo) se suma sola cuando se postula. */
const SEED_CANDS = () => ({
  1:[{id:'c1',name:'Martín Rojas',score:74,proof:true,income:2400000,sen:4,unv:false,days:'ayer',status:'new'},
     {id:'c2',name:'Camila Ferreyra',score:66,proof:true,income:2100000,sen:2,unv:true,days:'hace 2 días',status:'new'},
     {id:'c3',name:'Diego Salas',score:48,proof:false,income:null,sen:1,unv:false,days:'hace 3 días',status:'new'}],
  2:[{id:'c4',name:'Ana Paz',score:70,proof:true,income:2700000,sen:3,unv:false,days:'hoy',status:'new'},
     {id:'c5',name:'Julián Ortiz',score:58,proof:true,income:2000000,sen:1,unv:true,days:'ayer',status:'new'}],
  3:[{id:'c6',name:'Valentina Gómez',score:81,proof:true,income:1900000,sen:5,unv:false,days:'hace 4 días',status:'new'}],
  4:[], 5:[], 6:[],
  7:[{id:'c7',name:'Tomás Herrera',score:63,proof:true,income:1750000,sen:2,unv:false,days:'hoy',status:'new'},
     {id:'c8',name:'Florencia Ruiz',score:41,proof:false,income:null,sen:0,unv:false,days:'hace 2 días',status:'new'}],
  8:[{id:'c9',name:'Lautaro Díaz',score:69,proof:true,income:2300000,sen:6,unv:false,days:'ayer',status:'discarded'}],
  9:[]
});

/* Inmobiliarias piloto. acc = cierres acumulados desde el alta,
   c12 = cuántos de esos cayeron en los últimos 12 meses. A partir de
   estos números se generan los cierres con fecha (ver seedClosings). */
const SEED_AGENCIES = () => [
  {n:'Inmobiliaria Del Sur',a:'Ana D.',g:3,p:41,s:'Activa',acc:41,c12:11},
  {n:'Casa Norte Propiedades',a:'Pablo G.',g:2,p:29,s:'Activa',acc:29,c12:8},
  {n:'Costa Inmuebles',a:'Rocío M.',g:6,p:64,s:'Pausada',acc:64,c12:26},
  {n:'Hogar Austral',a:'Nicolás T.',g:1,p:7,s:'Baja',acc:2,c12:0}
];

/* Cierres con fecha, repartidos de forma determinística (siempre iguales).
   Los de 12 meses caen entre hoy y hace 360 días; el resto, más atrás. */
function seedClosings(){
  const out = [];
  SEED_AGENCIES().forEach((ag, k) => {
    for (let i = 0; i < ag.c12; i++) out.push({agency:ag.n, at:ago(Math.round(4 + k*3 + i*(355/ag.c12)) % 360), demo:false});
    for (let i = 0; i < ag.acc - ag.c12; i++) out.push({agency:ag.n, at:ago(380 + i*17 + k*5), demo:false});
  });
  return out;
}

/* Registros por semana (8 semanas, la última es la actual) y totales base
   del CRM. Lo que se hace en la demo se suma encima. */
const SEED_METRICS = () => ({
  weeklySignups:[18,26,31,24,40,38,47,52],
  tenantShare:.71,
  passportsComplete:148,
  applications:421
});

/* Auditoría OCR: cada documento procesado (ya borrado). fixed = campos que
   la persona corrigió a mano después de la lectura. */
const SEED_OCR = () => [
  {at:ago(1), kind:'DNI', conf:98, fixed:[], st:'ok'},
  {at:ago(1), kind:'Recibo de sueldo', conf:62, fixed:['Ingreso neto','Empleador'], st:'ok'},
  {at:ago(2), kind:'Monotributo', conf:91, fixed:['Ingreso neto'], st:'ok'},
  {at:ago(2), kind:'Recibo de sueldo', conf:55, fixed:['Ingreso neto','Fecha','Empleador'], st:'ok'},
  {at:ago(3), kind:'DNI', conf:94, fixed:[], st:'ok'},
  {at:ago(3), kind:'Recibo de sueldo', conf:88, fixed:[], st:'rejected'},
  {at:ago(4), kind:'Monotributo', conf:67, fixed:['Ingreso neto'], st:'ok'},
  {at:ago(5), kind:'DNI', conf:96, fixed:[], st:'ok'},
  {at:ago(6), kind:'Recibo de sueldo', conf:83, fixed:['Fecha'], st:'ok'},
  {at:ago(7), kind:'DNI', conf:71, fixed:['Número de DNI'], st:'ok'}
];
