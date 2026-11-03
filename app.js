/* Lógica de la demo. Depende de assets.js (íconos) y seed.js (datos). */
let PHOTOS = {};
try { PHOTOS = JSON.parse(localStorage.getItem('hogar-photos') || '{}') || {}; } catch (e) { PHOTOS = {}; }
const sceneIdx = id => { const pr = typeof S !== 'undefined' && S.props.find(p => p.id === id); return (pr && pr.sc != null ? pr.sc : id - 1) % SCENES.length; };
const scene = id => PHOTOS[id] ? `<img src="${PHOTOS[id]}" alt="Foto de la propiedad" class="realph">` : SCENES[sceneIdx(id)];
function readPhoto(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>{ const img=new Image(); img.onload=()=>{ const m=900, k=Math.min(1,m/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); c.getContext('2d').drawImage(img,0,0,c.width,c.height); res(c.toDataURL('image/jpeg',0.82)); }; img.onerror=rej; img.src=fr.result; }; fr.onerror=rej; fr.readAsDataURL(file); }); }
function savePhotos(){ try { localStorage.setItem('hogar-photos', JSON.stringify(PHOTOS)); return true; } catch (e) { return false; } }
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const money = n => '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- state ---------- */
const fresh = () => ({
  role:'land', screen:'l1', hist:[],
  p:{budget:850000,declared:false,proof:false,processing:false,error:false,incomeNet:1980000,incomeEdited:false,editing:false,seniority:2,guarantee:true,type:'Recibo de sueldo'},
  filterBudget:true, postTab:'act', apps:[], props:SEED_PROPS(), cands:SEED_CANDS(), curProp:1, curCand:null, curPropT:null,
  candFilter:true, rolePick:'t', terms:true, consent:true, ownerSeg:'all', sheet:null, toast:null,
  perms:{pub:true,view:true,decide:true,close:false}, agencies:SEED_AGENCIES(),
  closings:seedClosings(), metrics:SEED_METRICS(), ocr:SEED_OCR(), signups:0, myOcr:null,
  newForm:{title:'',zone:'',price:'',agent:'Marcos P.',photo:''}
});
let S = fresh();

/* ---------- datos derivados: el panel y el CRM calculan todo desde S ---------- */
const OWNER_AGENCY = 'Inmobiliaria Del Sur';   // la cuenta del propietario en la demo
const closingsOf = (agency, days) => S.closings.filter(c => (!agency || c.agency === agency) && (!days || c.at >= Date.now() - days*DAY)).length;
const demoClosings = () => S.closings.filter(c => c.demo).length;
const fdate = t => { const d = new Date(t); return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0'); };

/* ---------- scoring ---------- */
function calc(p){
  const income = p.proof ? p.incomeNet : null;
  const ratio = income ? p.budget / income : null;
  let f1;
  if (ratio == null) f1 = {pts:10,lvl:'Sin dato',pct:25,note:'Sin comprobante no podemos medir cuánto de tu ingreso va al alquiler.'};
  else {
    const r = Math.round(ratio*100);
    if (ratio <= .35) f1 = {pts:35,lvl:'Muy bien',pct:100};
    else if (ratio <= .40) f1 = {pts:28,lvl:'Bien',pct:80};
    else if (ratio <= .50) f1 = {pts:16,lvl:'Ajustado',pct:45};
    else f1 = {pts:6,lvl:'Alto',pct:20};
    f1.note = `Tu presupuesto es el ${r}% de tu ingreso neto. La referencia es 35–40%.`;
  }
  const f2 = !p.proof ? {pts:0,lvl:'No suma',pct:0,note:'Todavía no subiste un comprobante de ingresos.'}
    : p.incomeEdited ? {pts:10,lvl:'Suma poco',pct:45,note:'Corregiste el ingreso: queda como no verificado.'}
    : {pts:20,lvl:'Suma',pct:85,note:'Comprobante verificado a nombre del titular del DNI.'};
  const s = Math.min(p.seniority,5)*3;
  const f3 = {pts:s,lvl:s>=12?'Suma':s>0?'Suma poco':'No suma',pct:Math.round(s/15*100),note:`${p.seniority} ${p.seniority===1?'año':'años'}, declarada.`};
  const f4 = p.guarantee ? {pts:15,lvl:'Suma',pct:70,note:'Declarada. La inmobiliaria valida el tipo.'} : {pts:0,lvl:'No suma',pct:0,note:'No declaraste garantía.'};
  const total = Math.min(100, 10 + f1.pts + f2.pts + f3.pts + f4.pts);
  return {total, f1, f2, f3, f4, ratio};
}
const pstatus = p => p.processing ? 'reviewing' : p.proof ? 'complete' : 'incomplete';

/* ---------- ui helpers ---------- */
const badge = (t,k='neutral',i) => `<span class="h-badge h-badge--${k}">${i?ic(i):''}${t}</span>`;
const banner = (k,t,x,i) => `<div class="h-banner h-banner--${k}" role="note">${ic(i||{warn:'alert',info:'info',danger:'alert',ok:'check'}[k])}<div><b>${t}</b>${x}</div></div>`;
const btn = (t,act,o={}) => `<button class="h-btn h-btn--${o.kind||'primary'}${o.block?' h-btn--block':''}${o.sm?' h-btn--sm':''}" data-act="${act}" ${Object.entries(o.d||{}).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ')} ${o.disabled?'disabled':''}>${o.icon?ic(o.icon):''}${t}</button>`;
const check = (t,on,act,d='') => `<button class="h-checkrow h-plain" data-act="${act}" ${d} role="checkbox" aria-checked="${!!on}"><span class="h-checkbox${on?' h-checkbox--on':''}">${on?ic('check'):''}</span><span>${t}</span></button>`;
const sw = (on,act,d='') => `<button class="h-plain" data-act="${act}" ${d} role="switch" aria-checked="${!!on}" aria-label="Activar"><span class="h-switch${on?' h-switch--on':''}"></span></button>`;
function ring(score,size=120,sm=false){
  const C = 2*Math.PI*52, d = C*score/100;
  return `<div class="h-ring${sm?' h-ring--sm':''}" style="width:${size}px;height:${size}px" role="img" aria-label="Score ${score} de 100"><svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true"><circle cx="60" cy="60" r="52" class="h-ring__track"/><circle cx="60" cy="60" r="52" class="h-ring__val" stroke-dasharray="${d.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/></svg><div class="h-ring__txt"><span class="score">${score}</span>${sm?'':'<span class="caption">de 100</span>'}</div></div>`;
}
const steps = (n,t,title) => `<div class="h-steps"><div class="h-steps__bar">${Array.from({length:t},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</div><span class="h-steps__t">Paso ${n} de ${t} · ${title}</span></div>`;
const factor = (t,f) => `<div class="h-factor"><div class="h-factor__h"><span>${t}</span><span>${f.lvl}</span></div><div class="h-bar"><i style="width:${f.pct}%"></i></div><span class="h-help">${f.note}</span></div>`;
const section = t => `<p class="h-sec">${t}</p>`;
const photo = id => `<div class="h-photo">${scene(id)}</div>`;
function propCard(pr, extra=''){
  const inB = pr.price <= S.p.budget;
  return `<button class="h-prop h-plain h-card-btn" data-act="openProp" data-id="${pr.id}">${photo(pr.id)}<div class="h-col" style="gap:6px"><div class="h-row" style="justify-content:space-between;flex-wrap:nowrap"><div class="h-price">${money(pr.price)}<small> /mes</small></div>${extra||(inB?badge('En tu presupuesto','ok'):'')}</div><div class="h-li__t">${pr.title}</div><div class="h-meta"><span>${ic('pin')}${pr.zone}</span>${pr.feats.map(f=>`<span>${f}</span>`).join('')}</div></div></button>`;
}
function rowProp(pr, sub, badgeHtml, act){
  return `<${act?'button':'div'} class="h-prop h-prop--row ${act?'h-plain h-card-btn':''}" ${act?`data-act="${act}" data-id="${pr.id}"`:''}>${photo(pr.id)}<div class="h-li__b" style="display:flex;flex-direction:column;gap:2px"><div class="h-li__t">${pr.title}</div><div class="h-li__d">${sub}</div><div class="h-price" style="font-size:16px;white-space:nowrap">${money(pr.price)}<small> /mes</small></div><div style="margin-top:4px">${badgeHtml||''}</div></div></${act?'button':'div'}>`;
}
const field = (label, inner, help='') => `<div class="h-field"><span class="h-field__label">${label}</span>${inner}${help?`<span class="h-help">${help}</span>`:''}</div>`;
const choice = (t,d,on,act) => `<button class="h-choice h-plain${on?' h-choice--on':''}" data-act="${act}"><span class="h-radio"></span><div style="text-align:left"><div class="h-choice__t">${t}</div><div class="h-choice__d">${d}</div></div></button>`;

const NAV_T = [['t-buscar','search','Buscar'],['t-post','file','Postulaciones'],['t-pas','shield','Pasaporte'],['t-cuenta','user','Cuenta']];
const NAV_O = [['o-panel','home','Panel'],['o-props','building','Propiedades'],['o-equipo','users','Equipo'],['a1','user','Salir']];
const tabOf = {'t-w1':'t-pas','t-w2':'t-pas','t-w3':'t-pas','t-score':'t-pas','t-prop':'t-buscar','o-new':'o-props','o-cands':'o-props','o-cand':'o-props'};
const nav = (items,scr) => `<nav class="h-bottomnav" aria-label="Principal">${items.map(([k,i,l])=>`<button class="h-plain ${((tabOf[scr]||scr)===k)?'on':''}" data-act="tab" data-to="${k}" ${((tabOf[scr]||scr)===k)?'aria-current="page"':''}><span class="pill">${ic(i)}</span>${l}</button>`).join('')}</nav>`;

/* ---------- candidates (owner view) ---------- */
function candList(pid){
  const list = S.cands[pid].slice();
  const me = S.apps.find(a => a.pid === pid && a.status !== 'withdrawn');
  if (me && !list.find(c => c.id === 'me')) {
    const c = calc(S.p);
    list.push({id:'me',name:'Lucía Benítez',score:c.total,proof:S.p.proof,income:S.p.proof?S.p.incomeNet:null,sen:S.p.seniority,unv:S.p.incomeEdited,days:'hoy',status:me.status==='sent'?'new':me.status,me:true,guar:S.p.guarantee});
  }
  return list.filter(c => !(c.me && S.apps.find(a=>a.pid===pid)?.status==='withdrawn'))
            .sort((a,b)=>b.score-a.score);
}
const preq = c => c.score >= 60 && c.proof;
const candBadges = c => (c.proof ? (c.unv ? badge('Datos sin verificar','warn','alert') : badge('Ingreso verificado','ok','check')) : badge('Sin comprobante','warn','alert')) + (c.status==='selected'?badge('Seleccionado','ok','check'):c.status==='discarded'?badge('Descartado','neutral'):c.status==='rented'?badge('Alquiló','info','check'):'');

/* ---------- screens ---------- */
const sc = {};

/* landing */
const heroArt = () => PHOTOS.hero ? `<img src="${PHOTOS.hero}" alt="Foto de portada" class="realph">` : ART.hero;
sc['l1'] = () => {
  const c = {score:74,f1:{lvl:'Muy bien',pct:100,note:'Tu presupuesto es el 33% de tu ingreso neto. La referencia es 35–40%.'},f2:{lvl:'Suma',pct:85,note:'Comprobante verificado a nombre del titular del DNI.'},f3:{lvl:'Suma',pct:80,note:'4 años, declarada.'}};
  const demoProps = [1,2,4].map(i=>S.props.find(p=>p.id===i));
  const step = (n,t,x) => `<div class="ld-step"><span class="ld-n">${n}</span><div><div class="h-li__t">${t}</div><p class="body-sm ld-mut">${x}</p></div></div>`;
  const feat = (i,t,x) => `<div class="ld-feat"><span class="h-tick">${ic(i)}</span><div><div class="h-li__t">${t}</div><p class="body-sm ld-mut">${x}</p></div></div>`;
  const body = `
  <header class="ld-top"><nav class="ld-links" aria-label="Secciones"><a href="#ld-como" data-act="scrollto" data-to="ld-como">Cómo funciona</a><a href="#ld-pas" data-act="scrollto" data-to="ld-pas">Pasaporte Hogar</a><a href="#ld-prop" data-act="scrollto" data-to="ld-prop">Propietarios</a><a href="#ld-faq" data-act="scrollto" data-to="ld-faq">Preguntas</a></nav><div class="ld-acts">${btn('Ingresar','go',{kind:'sec',sm:true,d:{to:'a2'}})}${btn('Crear cuenta','start:t',{sm:true})}</div></header>
  <section class="ld-hero"><div class="ld-wrap ld-herogrid">
    <div class="ld-copy"><span class="ld-eyebrow">${ic('shield')}Alquilar con confianza, de los dos lados</span>
      <h1 class="display-lg ld-h1">Armá tu Pasaporte una vez. Postulate a todo.</h1>
      <p class="ld-lead">Hogar lee tus documentos, calcula un puntaje que se explica y lo comparte solo con los propietarios a los que te postulás. Ellos ven candidatos ordenados y verificados, sin planillas ni idas y vueltas.</p>
      <div class="ld-cta">${btn('Armar mi Pasaporte','start:t',{})}${btn('Soy propietario o inmobiliaria','start:o',{kind:'sec'})}</div>
      <ul class="ld-ticks"><li>${ic('check')}Sin costo en el piloto</li><li>${ic('check')}No guardamos tus documentos</li><li>${ic('check')}Tu Pasaporte nunca se rechaza</li></ul></div>
    <div class="ld-art"><div class="ld-pic">${heroArt()}</div>
      <div class="ld-chip ld-chip--a"><span class="h-tick">${ic('check')}</span><div><b>Ingreso verificado</b><span>Leído de tu recibo</span></div></div>
      <div class="ld-chip ld-chip--b">${ring(74,52,true)}<div><b>Score 74</b><span>Te explicamos por qué</span></div></div>
      <label class="ld-photo h-filebtn">${ic('plus')}<span>Poner foto real</span><input class="vh" type="file" accept="image/*" data-bind="photo" data-id="hero"></label></div>
  </div></section>
  <section class="ld-sec" id="ld-como"><div class="ld-wrap"><p class="ld-kicker">Cómo funciona</p><h2 class="display-md">De la cuenta a la postulación, en cuatro pasos</h2>
    <div class="ld-grid4">${step(1,'Creá tu cuenta','Con tu email. Elegís si buscás alquilar, sos propietario o inmobiliaria.')}${step(2,'Subí tus documentos','Leemos DNI y comprobante de ingresos, y borramos los archivos al terminar.')}${step(3,'Mirá tu score','Un puntaje del 0 al 100 con cada factor explicado. Si falta algo, te decimos qué suma.')}${step(4,'Postulate','Enviás tu Pasaporte a las propiedades que te gustan. El propietario ve datos, no documentos.')}</div></div></section>
  <section class="ld-sec ld-alt" id="ld-pas"><div class="ld-wrap ld-split">
    <div><p class="ld-kicker">Pasaporte Hogar</p><h2 class="display-md">Un puntaje que se entiende</h2><p class="ld-lead">No es una caja negra. Cada factor muestra cuánto suma y por qué, y es una guía: el propietario siempre decide.</p>
      <div class="ld-feats">${feat('shield','Datos verificados','Lo que leemos de tus documentos queda marcado como verificado. Si lo editás, pasa a “No verificado”.')}${feat('eye','Vos controlás qué se ve','Solo los propietarios a los que te postulás ven tus datos, y nunca tus documentos.')}${feat('check','Nunca te rechazamos','Tu Pasaporte puede estar Incompleto, En revisión o Completo. Siempre podés mejorarlo.')}</div></div>
    <div class="h-card ld-demo"><div class="h-row" style="flex-wrap:nowrap;gap:16px;align-items:center">${ring(74,96)}<div><div class="h-li__t">Lucía Benítez</div><div class="h-li__d">Pasaporte Completo</div><div class="h-row" style="margin-top:6px">${badge('Ingreso verificado','ok','check')}</div></div></div>
      ${factor('Alquiler sobre ingreso',c.f1)}${factor('Comprobante de ingresos',c.f2)}${factor('Antigüedad laboral',c.f3)}<p class="h-help">Ejemplo ilustrativo con datos de demo.</p></div>
  </div></section>
  <section class="ld-sec" id="ld-prop"><div class="ld-wrap ld-split ld-split--rev">
    <div class="ld-pic ld-pic--sq">${ART.owner}</div>
    <div><p class="ld-kicker">Para propietarios e inmobiliarias</p><h2 class="display-md">Candidatos ordenados, listos para decidir</h2><p class="ld-lead">Publicá tus propiedades y recibí las postulaciones ya rankeadas, con los datos que importan y las señales claras de qué está verificado.</p>
      <div class="ld-feats">${feat('building','Publicá y administrá','Cargá propiedades con fotos y seguí el estado de cada una desde un panel.')}${feat('users','Equipo con permisos','Sumá agentes y definí quién publica, quién ve candidatos y quién cierra.')}${feat('chart','Cobrás menos fricción','En el piloto no se cobra. Más adelante, un canon por cierre real.')}</div></div>
  </div></section>
  <section class="ld-sec ld-alt"><div class="ld-wrap"><p class="ld-kicker">Propiedades de ejemplo</p><h2 class="display-md">Encontrá dónde vivir</h2>
    <div class="ld-grid3">${demoProps.map(pr=>`<button class="h-prop h-plain h-card-btn" data-act="start:t">${photo(pr.id)}<div class="h-col" style="gap:6px"><div class="h-price">${money(pr.price)}<small> /mes</small></div><div class="h-li__t">${pr.title}</div><div class="h-meta"><span>${ic('pin')}${pr.zone}</span>${pr.feats.map(f=>`<span>${f}</span>`).join('')}</div></div></button>`).join('')}</div></div></section>
  <section class="ld-sec" id="ld-faq"><div class="ld-wrap ld-narrow"><p class="ld-kicker">Preguntas frecuentes</p><h2 class="display-md">Lo que más nos preguntan</h2>
    ${[['¿Guardan mis documentos?','No. Leemos los datos y borramos la foto o el PDF apenas terminamos. Guardamos solo los datos, un hash y la fecha.'],['¿Qué pasa si mi puntaje es bajo?','Nada se rechaza. El score es una guía y te mostramos qué factores podés mejorar, por ejemplo subiendo un comprobante.'],['¿Quién ve mi información?','Solo los propietarios o inmobiliarias a los que te postulás, y solo los datos, nunca los documentos.'],['¿Cuánto cuesta?','En esta etapa de piloto no se cobra. Más adelante, el canon es por cierre real y lo paga el propietario o la inmobiliaria.']].map(([q,x])=>`<details class="ld-q"><summary>${q}${ic('chev')}</summary><p class="body-sm ld-mut">${x}</p></details>`).join('')}</div></section>
  <section class="ld-band"><div class="ld-wrap ld-split"><div><h2 class="display-md">Empezá hoy con tu Pasaporte</h2><p class="ld-lead">Llevás tus datos listos, verificados y bajo tu control. Tarda unos minutos.</p><div class="ld-cta">${btn('Crear cuenta','start:t',{})}${btn('Ya tengo cuenta','go',{kind:'sec',d:{to:'a2'}})}</div></div><div class="ld-pic ld-pic--sq">${ART.family}</div></div></section>
  <footer class="ld-foot"><div class="ld-wrap"><nav aria-label="Legales"><a href="#" data-act="noop">Términos</a><a href="#" data-act="noop">Privacidad</a><a href="#" data-act="noop">Contacto</a></nav><span class="caption ld-mut">Demo con datos de ejemplo.</span></div></footer>`;
  return {landing:true,id:'L1',title:'Inicio',cus:'Landing pública',body};
};

/* acceso */
sc['a1'] = () => ({id:'A1',title:'Crear cuenta',cus:'CU-01 · CU-04',top:'none',
  body:`<div class="h-col" style="gap:4px"><h1 class="display-sm">Creá tu cuenta</h1><p class="h-help">Elegí cómo vas a usar Hogar. Es una demo: no se guarda nada.</p></div>`
   + choice('Busco alquilar','Armás tu Pasaporte Hogar y te postulás.',S.rolePick==='t','pick:t')
   + choice('Soy propietario','Publicás y recibís candidatos ordenados.',S.rolePick==='o','pick:o')
   + choice('Soy inmobiliaria','Equipo con agentes y permisos.',S.rolePick==='i','pick:i')
   + field('Email','<div class="h-input"><span>lucia@email.com</span></div>')
   + field('Contraseña','<div class="h-input"><span>••••••••••</span></div>')
   + check('Acepto los <a href="#" data-act="noop">términos</a> y la <a href="#" data-act="noop">política de privacidad</a>',S.terms,'terms'),
  cta:btn('Crear cuenta','a1next',{block:true,disabled:!S.terms}) + `<p class="h-help" style="text-align:center">¿Ya tenés cuenta? <a href="#" data-act="go" data-to="a2">Ingresá</a></p>`});
sc['a2'] = () => ({id:'A2',title:'Ingresar',cus:'CU-02',back:'a1',
  body:`<h1 class="display-sm">Ingresá a tu cuenta</h1>` + banner('info','Falta verificar tu email','Te mandamos un link a lu***@email.com.') + field('Email','<div class="h-input"><span>lucia@email.com</span></div>') + field('Contraseña','<div class="h-input"><span>••••••••••</span></div>','<a href="#" data-act="noop">Olvidé mi contraseña</a>'),
  cta:btn('Ingresar','enterT',{block:true})});
sc['a3'] = () => ({id:'A3',title:'Tus datos',cus:'CU-04 · obligatorio antes de cargar datos',back:'a1',
  body:`<div class="h-tick" style="width:48px;height:48px">${ic('shield')}</div><h1 class="display-sm">Antes de empezar, tus datos</h1><div class="h-card h-card--flat">`
   + [['check','Qué guardamos','Los datos que leemos de tus documentos: nombre, DNI e ingreso neto.'],['x','Qué no guardamos','Las fotos o PDF originales. Los borramos apenas leemos los datos.'],['eye','Quién los ve','Solo los propietarios a los que te postulás, y solo los datos.'],['edit','Tus derechos','Ver, corregir y eliminar tus datos cuando quieras.']].map(([i,t,d])=>`<div class="h-li"><span class="h-tick">${ic(i)}</span><div class="h-li__b"><div class="h-li__t">${t}</div><div class="h-li__d">${d}</div></div></div>`).join('')
   + `</div>` + check('Doy mi consentimiento para que Hogar trate mis datos personales como se explica acá.',S.consent,'consent'),
  cta:btn('Aceptar y continuar','a3next',{block:true,disabled:!S.consent})});

/* inquilino */
sc['t-pas'] = () => { const c = calc(S.p), st = pstatus(S.p), p = S.p;
  const stB = st==='complete'?badge('Completo','ok','check'):st==='reviewing'?badge('En revisión','info','clock'):badge('Incompleto','warn','clock');
  const row = (ok,t,d,right,act) => `<div class="h-li"><span class="h-tick ${ok?'':'h-tick--warn'}">${ic(ok?'check':'upload')}</span><div class="h-li__b"><div class="h-li__t">${t}</div><div class="h-li__d">${d}</div></div>${right}</div>`;
  return {id:'I1',title:'Mi Pasaporte Hogar',cus:'CU-05 · 11 · 13 · 14',nav:'t',
   body:`<div class="h-card"><div class="h-row" style="flex-wrap:nowrap;gap:16px">${ring(c.total)}<div class="h-col" style="gap:8px">${stB}<p class="body-sm">${p.proof?'Tu score hoy.':'Tu score hoy. Sin comprobante de ingresos es menor.'}</p><button class="h-link h-plain" data-act="go" data-to="t-score">Ver detalle del score</button></div></div></div>`
   + (p.proof ? '' : banner('warn','Subí tu comprobante','Con recibo de sueldo o factura de monotributo, tu score mejora. Podés postularte igual.'))
   + section('Tu progreso') + `<div class="h-card h-card--flat">`
   + row(true,'Presupuesto',`Hasta ${money(p.budget)} por mes`,`<button class="h-plain" data-act="go" data-to="t-w1" aria-label="Editar presupuesto">${ic('chev')}</button>`)
   + row(true,'DNI','Datos leídos y confirmados',badge('Verificado','ok'))
   + row(p.proof,'Comprobante de ingresos',p.proof?(p.incomeEdited?'Ingreso corregido':'Leído y verificado'):'Pendiente',p.proof?badge(p.incomeEdited?'No verificado':'Verificado',p.incomeEdited?'warn':'ok'):btn('Subir','go',{kind:'secondary',sm:true,d:{to:'t-w2'}}))
   + row(true,'Antigüedad laboral',`${p.seniority} ${p.seniority===1?'año':'años'} · declarada`,`<button class="h-plain" data-act="go" data-to="t-w1" aria-label="Editar">${ic('chev')}</button>`)
   + row(p.guarantee,'Garantía',p.guarantee?'Declarás tener garantía':'No declarada',`<button class="h-plain" data-act="go" data-to="t-w1" aria-label="Editar">${ic('chev')}</button>`) + `</div>`
   + (S.apps.length===0 ? `<p class="h-help">Probá: subí un comprobante, buscá un depto y postulate. Después cambiá a “Propietario” para ver tu postulación.</p>` : '')};
};
sc['t-w1'] = () => { const p = S.p; return {id:'I2',title:'Presupuesto y trabajo',cus:'CU-05 · 13 · 15',back:'t-pas',
  body: steps(1,4,'Presupuesto y trabajo')
   + field('¿Cuánto podés pagar por mes?',`<div class="h-input"><span class="h-pre">$</span><input id="budget" class="h-bare" inputmode="numeric" value="${String(p.budget).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}" data-bind="budget" aria-label="Presupuesto mensual"></div>`,'Es lo que vas a ver filtrado cuando busques.')
   + `<div class="h-col" style="gap:8px"><span class="h-field__label">¿Tenés comprobante de ingresos?</span>${choice('Sí, tengo','Recibo de sueldo o factura de monotributo.',p.declared,'decl:1')}${choice('Por ahora no','Podés seguir y sumarlo después.',!p.declared,'decl:0')}</div>`
   + (p.declared ? '' : banner('warn','Tu score va a ser menor','Sin comprobante sumás menos puntos. No te bloquea: podés postularte y subirlo cuando quieras.'))
   + field('Antigüedad laboral',`<div class="h-input"><select id="sen" class="h-bare" data-bind="sen" aria-label="Antigüedad laboral">${[0,1,2,3,4,5,6,8,10].map(n=>`<option value="${n}" ${n===p.seniority?'selected':''}>${n===0?'Menos de 1 año':n===1?'1 año':n+' años'}</option>`).join('')}</select></div>`)
   + check('Tengo garantía',p.guarantee,'guar') + `<p class="h-help" style="margin:-8px 0 0 34px">La inmobiliaria revisa qué tipo de garantía es, fuera de Hogar.</p>`,
  cta:btn('Continuar','go',{block:true,d:{to:'t-w2'}})}; };
sc['t-w2'] = () => { const p = S.p;
  let comp;
  if (p.processing) comp = `<div class="h-file"><span class="h-file__i"><span class="h-spin"></span></span><div class="h-file__b"><div class="h-file__t">Leyendo documento…</div><div class="h-file__d">Extrayendo datos y calculando tu score</div></div>${badge('En revisión','info','clock')}</div>`;
  else if (p.proof) comp = `<div class="h-file"><span class="h-file__i">${ic('file')}</span><div class="h-file__b"><div class="h-file__t">${p.type==='Monotributo'?'factura_monotributo.pdf':'recibo_octubre.pdf'}</div><div class="h-file__d">Leído · se borró el archivo</div></div>${badge('Confianza media','info','info')}</div>`;
  else if (p.error) comp = `<div class="h-file h-file--error"><span class="h-file__i">${ic('alert')}</span><div class="h-file__b"><div class="h-file__t">recibo_otra_persona.pdf</div><div class="h-file__d" style="color:var(--danger-ink)">Está a nombre de otra persona. Tiene que coincidir con el titular del DNI.</div></div></div>`;
  else comp = '';
  return {id:'I3',title:'Subir documentos',cus:'CU-06 · 07 · 08 · 10',back:'t-w1',
  body: steps(2,4,'Documentos')
   + `<div class="h-file"><span class="h-file__i">${ic('file')}</span><div class="h-file__b"><div class="h-file__t">DNI frente y dorso</div><div class="h-file__d">Leído hace un momento</div></div>${badge('Confianza alta','ok','check')}</div>`
   + section('Comprobante de ingresos')
   + `<div class="h-chips">${['Recibo de sueldo','Monotributo'].map(t=>`<button class="h-chip h-plain${p.type===t?' h-chip--on':''}" data-act="ctype" data-v="${t}">${t}</button>`).join('')}</div>` + comp
   + (p.proof || p.processing ? '' : `<div class="h-drop">${ic('upload')}<div class="label">Subí tu comprobante</div><div class="h-help">En esta demo elegí un archivo de ejemplo:</div><div class="h-col" style="width:100%;gap:8px">${btn('Recibo a mi nombre','upload',{kind:'secondary',block:true,d:{ok:'1'}})}${btn('Recibo de otra persona','upload',{kind:'secondary',block:true,d:{ok:'0'}})}</div></div>`)
   + banner('info','Leemos los datos y borramos el archivo','No guardamos tu documento. Guardamos solo los datos, la fecha y qué tan segura fue la lectura.','shield'),
  cta: btn('Continuar','go',{block:true,disabled:!p.proof,d:{to:'t-w3'}}) + (p.proof?'':btn('Seguir sin comprobante','skip',{kind:'ghost',block:true}))}; };
sc['t-w3'] = () => { const p = S.p; const d = (k,v,r) => `<div class="h-datarow"><span class="h-datarow__k">${k}</span><span class="h-datarow__v">${v}${r||''}</span></div>`;
  return {id:'I4',title:'Revisá tus datos',cus:'CU-09 · 12',back:'t-w2',
  body: steps(3,4,'Revisión') + `<p class="body-sm">Esto fue lo que leímos. Confirmalo o corregilo.</p><div class="h-card h-card--flat">`
   + d('Nombre','Lucía Benítez',badge('Verificado','ok','check')) + d('DNI','38.412.907',badge('Verificado','ok','check'))
   + (p.editing ? `<div class="h-datarow"><span class="h-datarow__k">Ingreso neto</span><span class="h-datarow__v"><span class="h-input" style="min-height:40px;width:160px"><span class="h-pre">$</span><input id="inc" class="h-bare" inputmode="numeric" value="${String(p.incomeNet).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}" data-bind="income" aria-label="Ingreso neto"></span><button class="h-link h-plain" data-act="editIncome">Listo</button></span></div>`
       : d('Ingreso neto',money(p.incomeNet), (p.incomeEdited?badge('No verificado','warn','alert'):badge('Confianza media','info','info')) + `<button class="h-link h-plain" data-act="editIncome">Corregir</button>`))
   + d('Antigüedad',`${p.seniority} ${p.seniority===1?'año':'años'}`,badge('Declarada','neutral')) + `</div>`
   + (p.incomeEdited ? banner('warn','Editaste un dato','El ingreso quedó como “No verificado” hasta que subas un comprobante que coincida. Los propietarios lo ven así y tu score baja.') : '')
   + `<p class="h-help">Al confirmar se recalcula tu score.</p>`,
  cta:btn('Confirmar y ver mi score','confirm',{block:true})}; };
sc['t-score'] = () => { const p = S.p, c = calc(p), st = pstatus(p);
  const tips = []; if(!p.proof) tips.push(['upload','Subí un recibo de sueldo o factura de monotributo: es lo que más suma.']);
  if(p.proof && p.incomeEdited) tips.push(['upload','Subí un comprobante que respalde el ingreso que corregiste.']);
  if(c.ratio && c.ratio>.4) tips.push(['edit','Un presupuesto más bajo mejora la relación alquiler / ingreso.']);
  if(!p.guarantee) tips.push(['shield','Si tenés garantía, marcala: suma al score.']);
  if(p.seniority<5) tips.push(['clock','La antigüedad laboral suma hasta los 5 años.']);
  tips.push(['clock','Cuando pagues en término tus alquileres, tu historial se suma al score (próximamente).']);
  return {id:'I5',title:'Mi score',cus:'CU-11 · 12 · 14',nav:'t',
  body:`<div class="h-card h-col" style="align-items:center;text-align:center;gap:8px">${ring(c.total,132)}${st==='complete'?badge('Completo','ok','check'):badge('Incompleto','warn','clock')}<p class="body-sm">Es una guía. Cada propietario decide.</p></div>`
   + `<div class="h-card" style="padding-top:4px;padding-bottom:4px">${factor('Alquiler sobre ingreso',c.f1)}${factor('Comprobante de ingresos',c.f2)}${factor('Antigüedad laboral',c.f3)}${factor('Garantía',c.f4)}</div>`
   + section('Qué lo mejoraría') + tips.map(([i,t])=>`<div class="h-tip">${ic(i)}<span>${t}</span></div>`).join('')
   + `<div class="h-row">${btn('Editar mis datos','go',{kind:'secondary',d:{to:'t-w1'}})}</div>`}; };
sc['t-buscar'] = () => { const list = S.props.filter(x=>x.status==='active' && (!S.filterBudget || x.price<=S.p.budget));
  return {wide:true,id:'I6',title:'Buscar',cus:'CU-20',nav:'t',top:'logo',
  body:`<div class="h-input">${ic('search')}<span class="h-help">Zona, barrio o dirección</span></div><div class="h-chips"><button class="h-chip h-plain${S.filterBudget?' h-chip--on':''}" data-act="fb">${S.filterBudget?ic('check'):''}Hasta ${money(S.p.budget)} · tu presupuesto</button></div>`
   + `<p class="h-help">${list.length} ${list.length===1?'propiedad':'propiedades'}${S.filterBudget?' dentro de tu presupuesto':''}${S.filterBudget?` · <button class="h-link h-plain" data-act="fb">ver todas</button>`:''}</p>`
   + (list.length ? list.map(x=>propCard(x)).join('') : banner('info','Nada dentro de tu presupuesto','Probá subir el presupuesto en tu Pasaporte o ver todas las propiedades.'))}; };
sc['t-prop'] = () => { const pr = S.props.find(x=>x.id===S.curPropT); const app = S.apps.find(a=>a.pid===pr.id && a.status!=='withdrawn'); const c = calc(S.p); const inB = pr.price<=S.p.budget;
  const d = (k,v) => `<div class="h-datarow"><span class="h-datarow__k">${k}</span><span class="h-datarow__v">${v}</span></div>`;
  return {id:'I7',title:'Detalle de propiedad',cus:'CU-21',back:'t-buscar',
  body:`<div class="h-photo" style="aspect-ratio:4/3">${scene(pr.id)}</div><div class="h-col" style="gap:6px"><div class="h-row" style="justify-content:space-between;flex-wrap:nowrap"><div class="h-price" style="font-size:24px;line-height:32px">${money(pr.price)}<small> /mes</small></div>${inB?badge('En tu presupuesto','ok'):badge('Sobre tu presupuesto','warn','alert')}</div><div class="h-li__t">${pr.title}</div><div class="h-meta"><span>${ic('pin')}${pr.zone}</span>${pr.feats.map(f=>`<span>${f}</span>`).join('')}</div></div><p class="body-sm">${pr.desc}</p>`
   + `<div class="h-card h-card--flat">${d('Contrato',pr.contract)}${d('Expensas',pr.exp?money(pr.exp):'Sin expensas')}${d('Mascotas',pr.pets)}${d('Garantía','Requerida')}</div>`
   + banner('info','Compartís tus datos, no tus documentos','El propietario ve tu score y los datos de tu Pasaporte.','shield'),
  cta: app ? btn('Ya te postulaste · ver estado','tab',{block:true,kind:'secondary',d:{to:'t-post'}}) : btn('Postularme con mi Pasaporte','apply',{block:true,icon:'check'}) + `<p class="h-help" style="text-align:center">Tu score: ${c.total} · Pasaporte ${pstatus(S.p)==='complete'?'Completo':'Incompleto'}</p>`}; };
sc['t-post'] = () => { const act = S.apps.filter(a=>a.status==='sent'||a.status==='selected'), cl = S.apps.filter(a=>a.status==='discarded'||a.status==='withdrawn');
  const list = S.postTab==='act'?act:cl; const lb = {sent:badge('Enviada','info','clock'),selected:badge('Seleccionado','ok','check'),discarded:badge('No seleccionado','neutral'),withdrawn:badge('Retirada','neutral')};
  return {wide:true,id:'I8',title:'Mis postulaciones',cus:'CU-22 · 23',nav:'t',
  body:`<div class="h-seg"><button class="h-plain ${S.postTab==='act'?'on':''}" data-act="ptab" data-v="act">Activas</button><button class="h-plain ${S.postTab==='cl'?'on':''}" data-act="ptab" data-v="cl">Cerradas</button></div>`
   + (list.length ? list.map(a=>{const pr=S.props.find(x=>x.id===a.pid); return `<div class="h-col" style="gap:8px">${rowProp(pr,a.status==='sent'?'Enviada hoy':a.status==='selected'?'Hoy':'Cerrada',lb[a.status])}${a.status==='selected'?banner('ok','La inmobiliaria te seleccionó','Te van a contactar para los próximos pasos.'):''}${a.status==='sent'?`<div class="h-row" style="justify-content:flex-end">${btn('Retirar postulación','withdraw',{kind:'ghost',sm:true,d:{id:a.pid}})}</div>`:''}</div>`;}).join('')
      : `<div class="h-card h-col" style="align-items:center;text-align:center;gap:8px"><div class="h-tick" style="width:44px;height:44px">${ic('file')}</div><div class="h-li__t">${S.postTab==='act'?'Todavía no te postulaste':'No hay postulaciones cerradas'}</div>${S.postTab==='act'?`<p class="body-sm">Buscá una propiedad dentro de tu presupuesto y postulate con tu Pasaporte.</p>${btn('Buscar propiedades','tab',{d:{to:'t-buscar'}})}`:''}</div>`)};};
sc['t-cuenta'] = () => ({id:'I9',title:'Cuenta y privacidad',cus:'CU-16 (deseable)',nav:'t',
  body:`<div class="h-row" style="flex-wrap:nowrap;gap:12px"><span class="h-avatar" style="width:56px;height:56px">LB</span><div><div class="h-li__t">Lucía Benítez</div><div class="h-li__d">lucia@email.com</div></div></div>`
   + `<div class="h-card h-card--flat"><div class="h-li"><div class="h-li__b"><div class="h-li__t">Mis datos y consentimiento</div></div>${ic('chev')}</div><div class="h-li"><div class="h-li__b"><div class="h-li__t">Cambiar contraseña</div></div>${ic('chev')}</div><button class="h-li h-plain" style="width:100%" data-act="go" data-to="a1"><div class="h-li__b" style="text-align:left"><div class="h-li__t">Cerrar sesión</div></div>${ic('logout')}</button></div>`
   + section('Zona de cuidado') + `<div class="h-card h-col"><div class="h-li__t">Eliminar mi cuenta y mis datos</div><p class="body-sm">Borramos tu Pasaporte, tus datos y tus postulaciones. No se puede deshacer.</p>${btn('Eliminar mi cuenta','sheet',{kind:'danger',block:true,icon:'trash',d:{v:'del'}})}</div>`});

/* propietario */
sc['o-panel'] = () => { const act = S.props.filter(x=>x.status==='active').length; let nuevos=0,pre=0; Object.keys(S.cands).forEach(k=>candList(+k).forEach(c=>{if(c.status==='new'){nuevos++; if(preq(c))pre++;}}));
  return {wide:true,id:'P1',title:'Panel',cus:'CU-24 · 28',nav:'o',top:'logoO',
  body:`<div class="h-grid2"><div class="h-stat"><span class="h-stat__k">Propiedades activas</span><span class="h-stat__v">${act}</span></div><div class="h-stat"><span class="h-stat__k">Postulantes nuevos</span><span class="h-stat__v">${nuevos}</span></div><div class="h-stat"><span class="h-stat__k">Precalificados</span><span class="h-stat__v">${pre}</span></div><div class="h-stat"><span class="h-stat__k">Cierres, 12 meses</span><span class="h-stat__v">${closingsOf(OWNER_AGENCY,365)}</span></div></div>`
   + section('Para revisar') + S.props.filter(x=>x.status==='active').map(x=>{const l=candList(x.id).filter(c=>c.status==='new'); return rowProp(x,l.length?`${l.length} postulantes nuevos`:'Sin postulantes',l.length?badge(`${l.filter(preq).length} precalif.`,'ok'):badge('Activa','neutral'),'ocands');}).join('')}; };
sc['o-props'] = () => { const segs=[['all','Todas'],['active','Activas'],['paused','Pausadas']]; const list=S.props.filter(x=>S.ownerSeg==='all'||x.status===S.ownerSeg);
  const sb = {active:badge('Activa','ok'),paused:badge('Pausada','warn','pause'),rented:badge('Alquilada','info','check')};
  return {wide:true,id:'P2',title:'Propiedades',cus:'CU-18 · 19',nav:'o',top:'propsTop',
  body:`<div class="h-seg">${segs.map(([k,l])=>`<button class="h-plain ${S.ownerSeg===k?'on':''}" data-act="oseg" data-v="${k}">${l}</button>`).join('')}</div>`
   + list.map(x=>`<div class="h-prop"><button class="h-plain h-card-btn" style="display:flex;flex-direction:column;gap:12px" data-act="ocands" data-id="${x.id}" aria-label="Ver candidatos de ${esc(x.title)}">${photo(x.id)}<div class="h-col" style="gap:6px"><div class="h-row" style="justify-content:space-between;flex-wrap:nowrap"><div class="h-price">${money(x.price)}<small> /mes</small></div>${sb[x.status]}</div><div class="h-li__t">${x.title}</div><div class="h-li__d">${x.zone} · ${x.agent?'Agente: '+x.agent:'Sin agente asignado'}</div></div></button><div class="h-row" style="justify-content:space-between;gap:4px"><label class="h-btn h-btn--secondary h-btn--sm h-filebtn">${ic('image')}${PHOTOS[x.id]?'Cambiar foto':'Poner foto real'}<input class="vh" type="file" accept="image/*" data-bind="photo" data-id="${x.id}" aria-label="Elegir foto de la propiedad"></label>${x.status!=='rented'?btn(x.status==='paused'?'Reanudar':'Pausar','pausep',{kind:'ghost',sm:true,d:{id:x.id}}):''}</div></div>`).join('')}; };
sc['o-new'] = () => { const f=S.newForm; return {id:'P3',title:'Nueva propiedad',cus:'CU-17 · 19',back:'o-props',
  body: steps(2,4,'Condiciones y valor')
   + field('Título',`<div class="h-input"><input id="nt" class="h-bare" placeholder="Ej: Depto 1 dormitorio" value="${esc(f.title)}" data-bind="nt" aria-label="Título"></div>`)
   + field('Zona',`<div class="h-input"><input id="nz" class="h-bare" placeholder="Ej: Centro" value="${esc(f.zone)}" data-bind="nz" aria-label="Zona"></div>`)
   + field('Valor mensual',`<div class="h-input"><span class="h-pre">$</span><input id="np" class="h-bare" inputmode="numeric" placeholder="780.000" value="${f.price}" data-bind="np" aria-label="Valor mensual"></div>`,'En pesos argentinos.')
   + field('Agente a cargo',`<div class="h-input"><select id="na" class="h-bare" data-bind="na" aria-label="Agente">${['Marcos P.','Sofía R.'].map(a=>`<option ${a===f.agent?'selected':''}>${a}</option>`).join('')}</select></div>`,'Solo ese agente la va a ver.')
   + `<div class="h-col" style="gap:8px"><span class="h-field__label">Foto</span><div class="h-grid2"><div class="h-photo">${f.photo?`<img src="${f.photo}" alt="Vista previa" class="realph">`:SCENES[3]}</div><label class="h-drop h-filebtn" style="padding:8px">${ic('upload')}<span class="h-help">${f.photo?'Cambiar foto':'Subir foto'}</span><input class="vh" type="file" accept="image/*" data-bind="newphoto" aria-label="Subir foto de la propiedad"></label></div></div>`,
  cta:btn('Publicar propiedad','publish',{block:true,disabled:!(f.title&&f.zone&&+String(f.price).replace(/\D/g,'')>0)})}; };
sc['o-cands'] = () => { const pr=S.props.find(x=>x.id===S.curProp); let l=candList(pr.id); if(S.candFilter) l=l.filter(preq);
  return {wide:true,id:'P4',title:'Candidatos',cus:'CU-24 · 25',back:'o-props',nav:'o',
  body: rowProp(pr,pr.zone,pr.status==='rented'?badge('Alquilada','info','check'):'')
   + `<div class="h-row" style="justify-content:space-between;flex-wrap:nowrap"><div class="h-row" style="flex-wrap:nowrap;gap:10px">${sw(S.candFilter,'cf')}<span class="label">Solo precalificados</span></div><span class="h-help">Mayor score</span></div>`
   + (l.length ? l.map((c,i)=>`<button class="h-cand h-plain h-card-btn" data-act="opencand" data-id="${c.id}"><span class="h-cand__rank">${i+1}</span><span class="h-avatar">${c.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</span><div class="h-cand__b"><div class="h-cand__t">${c.name}${c.me?' <span class="caption">(vos)</span>':''}</div><div class="h-cand__d">Postuló ${c.days}</div><div class="h-row" style="gap:4px 6px">${candBadges(c)}</div></div>${ring(c.score,48,true)}</button>`).join('')
      : `<div class="h-card h-col" style="align-items:center;text-align:center;gap:8px"><div class="h-li__t">${S.candFilter?'Ningún candidato precalificado':'Todavía no hay postulantes'}</div><p class="body-sm">${S.candFilter?'Apagá el filtro para ver a todos los que se postularon.':'Cuando alguien se postule con su Pasaporte, aparece acá ordenado por score.'}</p></div>`)}; };
sc['o-cand'] = () => { const pr=S.props.find(x=>x.id===S.curProp); const c=candList(pr.id).find(x=>x.id===S.curCand); const ratio=c.income?Math.round(pr.price/c.income*100):null;
  const d=(k,v,r)=>`<div class="h-datarow"><span class="h-datarow__k">${k}</span><span class="h-datarow__v">${v}${r||''}</span></div>`;
  const ini=c.name.split(' ').map(w=>w[0]).slice(0,2).join('');
  let cta='';
  if(c.status==='new') cta=btn('Seleccionar candidato','decide',{block:true,icon:'check',d:{v:'selected'}})+btn('Descartar','decide',{kind:'secondary',block:true,d:{v:'discarded'}});
  else if(c.status==='selected') cta=pr.status!=='rented'?btn('Marcar como alquilado','sheet',{block:true,d:{v:'rent'}})+btn('Volver a candidatos','back',{kind:'secondary',block:true}):btn('Volver a candidatos','back',{kind:'secondary',block:true});
  else cta=btn('Volver a candidatos','back',{kind:'secondary',block:true});
  return {id:'P5',title:'Candidato',cus:'CU-26 · 27 · 28',back:'o-cands',
  body:`<div class="h-card"><div class="h-row" style="flex-wrap:nowrap;gap:12px"><span class="h-avatar" style="width:56px;height:56px">${ini}</span><div class="h-li__b"><div class="h-li__t">${c.name}</div><div class="h-li__d">Postuló ${c.days} · ${c.proof?'Pasaporte Completo':'Pasaporte Incompleto'}</div></div>${ring(c.score,64,true)}</div><div class="h-row" style="margin-top:10px">${candBadges(c)}</div></div>`
   + `<div class="h-card h-card--flat">${d('Ingreso neto',c.income?money(c.income):'No informado',c.income?(c.unv?badge('No verificado','warn','alert'):badge('Verificado','ok','check')):badge('Sin comprobante','warn','alert'))}${d('Alquiler sobre ingreso',ratio?ratio+'%':'—')}${d('Antigüedad laboral',`${c.sen} ${c.sen===1?'año':'años'}`,badge('Declarada','neutral'))}${d('Garantía','Declara tener',badge('A validar con la inmobiliaria','neutral'))}</div>`
   + banner('info','Solo ves datos','Los documentos originales no se guardan: ni vos ni nosotros los tenemos.','shield'), cta}; };
sc['o-equipo'] = () => { const pm=S.perms; return {id:'P7',title:'Equipo',cus:'CU-03 · 19 (solo inmobiliaria)',nav:'o',top:'equipoTop',
  body:`<div class="h-card h-card--flat">${[['MP','Marcos P.','6 propiedades','Agente','neutral'],['SR','Sofía R.','2 propiedades','Agente','neutral'],['AD','Ana D.','Administradora','Admin','ok']].map(([i,n,d,r,k])=>`<div class="h-li"><span class="h-avatar">${i}</span><div class="h-li__b"><div class="h-li__t">${n}</div><div class="h-li__d">${d}</div></div>${badge(r,k)}</div>`).join('')}</div>`
   + section('Permisos de Marcos P.') + `<div class="h-card h-col" style="gap:14px">${[['pub','Publicar propiedades'],['view','Ver candidatos'],['decide','Seleccionar y descartar'],['close','Marcar alquileres cerrados']].map(([k,l])=>`<div class="h-row" style="justify-content:space-between;flex-wrap:nowrap"><span class="body-sm">${l}</span>${sw(pm[k],'perm','data-k="'+k+'"')}</div>`).join('')}</div><p class="h-help">Un agente solo ve las propiedades que le asignaron.</p>`}; };

/* admin */
const ADM = [['a-met','chart','Métricas'],['a-cie','building','Cierres y canon'],['a-ocr','file','Auditoría OCR'],['a-inm','users','Inmobiliarias']];
const canon = c => 20000*(1+0.02*Math.min(c,25));
sc['a-met'] = () => { const m = S.metrics;
  const vals = m.weeklySignups.slice(); vals[vals.length-1] += S.signups;   // los registros de la demo caen en la semana actual
  const k = 125 / Math.max(...vals);
  const bars=vals.map((v,i)=>`<rect x="${20+i*58}" y="${150-v*k}" width="38" height="${v*k}" rx="6" fill="var(--bamboo-600)"/><text x="${39+i*58}" y="170" text-anchor="middle" font-size="12" fill="var(--ink-muted)">S${i+1}</text><text x="${39+i*58}" y="${144-v*k}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)">${v}</text>`).join('');
  const regs = vals.reduce((a,b)=>a+b,0);
  const comp = m.passportsComplete + (pstatus(S.p)==='complete'?1:0), post = m.applications + S.apps.length;
  const cie = closingsOf(null, 56);
  return {id:'D1',title:'Métricas',cus:'CU-29',admin:true,
  body:`<div class="h-row"><div class="h-input" style="width:190px;min-height:40px"><span>Últimas 8 semanas</span><span class="h-end">${ic('down')}</span></div><div class="h-input" style="width:210px;min-height:40px"><span>Todas las inmobiliarias</span><span class="h-end">${ic('down')}</span></div></div>`
   + `<div class="h-grid4"><div class="h-stat"><span class="h-stat__k">Registros</span><span class="h-stat__v">${regs}</span><span class="h-stat__d">${Math.round(m.tenantShare*100)}% inquilinos</span></div><div class="h-stat"><span class="h-stat__k">Pasaportes completos</span><span class="h-stat__v">${comp}</span><span class="h-stat__d">${Math.round(comp/regs*100)}% de los registros</span></div><div class="h-stat"><span class="h-stat__k">Postulaciones</span><span class="h-stat__v">${post}</span><span class="h-stat__d">${(post/comp).toFixed(1).replace('.',',')} por pasaporte</span></div><div class="h-stat"><span class="h-stat__k">Cierres</span><span class="h-stat__v">${cie}</span><span class="h-stat__d">en el período</span></div></div>`
   + `<div class="h-card"><div class="h-li__t" style="margin-bottom:8px">Registros por semana</div><svg viewBox="0 0 480 180" width="100%" role="img" aria-label="Registros por semana, de ${vals[0]} a ${vals[vals.length-1]}" style="font-family:var(--font-sans);max-height:210px">${bars}<path d="M12 150H470" stroke="var(--line-strong)"/></svg></div>`}; };
sc['a-cie'] = () => { const rows = S.agencies.map(a=>({n:a.n, acc:closingsOf(a.n), c:closingsOf(a.n,365)})); const dc = demoClosings();
  return {id:'D2',title:'Cierres y canon',cus:'CU-30',admin:true,
  body: banner('info','Piloto sin cobro','El canon es una referencia: canon = $20.000 × (1 + 0,02 × cierres de 12 meses, hasta 25). El cobro arranca en Fase 2.')
   + (dc?banner('ok','Cierre de la demo registrado',`${OWNER_AGENCY} sumó ${dc} ${dc===1?'cierre':'cierres'} desde el panel del propietario.`):'')
   + `<div class="h-tablewrap"><div class="h-scrollx"><table class="h-table"><thead><tr><th>Inmobiliaria</th><th class="num">Cierres acumulados</th><th class="num">Últimos 12 meses</th><th class="num">Canon calculado</th><th>Estado</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.n}</td><td class="num">${r.acc}</td><td class="num">${r.c}</td><td class="num">${money(canon(r.c))}</td><td>${r.c>=25?badge('Tope +50%','earth'):badge('Piloto sin cobro','neutral')}</td></tr>`).join('')}</tbody></table></div></div>`}; };
sc['a-ocr'] = () => { const rows = S.ocr.slice().sort((a,b)=>b.at-a.at);
  const avg = Math.round(rows.reduce((s,r)=>s+r.conf,0)/rows.length), low = rows.filter(r=>r.conf<70).length;
  const cnt = {}; let tot = 0; rows.forEach(r=>r.fixed.forEach(f=>{ cnt[f]=(cnt[f]||0)+1; tot++; }));
  const top = Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
  const st = r => r.st==='rejected' ? badge('Titular no coincide','danger','alert') : r.conf<70 ? badge('Confianza baja','warn','alert') : badge('Ok','ok','check');
  return {id:'D3',title:'Auditoría OCR',cus:'CU-31',admin:true,
  body:`<div class="h-grid4" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"><div class="h-stat"><span class="h-stat__k">Confianza promedio</span><span class="h-stat__v">${avg}%</span></div><div class="h-stat"><span class="h-stat__k">Documentos con confianza baja</span><span class="h-stat__v">${low}</span></div><div class="h-stat"><span class="h-stat__k">Campo más corregido</span><span class="h-stat__v" style="font-size:24px">${top?top[0]:'—'}</span><span class="h-stat__d">${top?Math.round(top[1]/tot*100)+'% de las correcciones':'Sin correcciones'}</span></div></div>`
   + `<div class="h-tablewrap"><div class="h-scrollx"><table class="h-table"><thead><tr><th>Fecha</th><th>Documento</th><th class="num">Confianza</th><th class="num">Campos corregidos</th><th>Estado</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fdate(r.at)}</td><td>${r.kind}${r.mine?' <span class="h-help">· Lucía (demo)</span>':''}</td><td class="num">${r.conf}%</td><td class="num" title="${esc(r.fixed.join(', '))}">${r.fixed.length}</td><td>${st(r)}</td></tr>`).join('')}</tbody></table></div></div>`}; };
sc['a-inm'] = () => ({id:'D4',title:'Inmobiliarias piloto',cus:'CU-32 (deseable)',admin:true,
  body:`<div class="h-tablewrap"><div class="h-scrollx"><table class="h-table"><thead><tr><th>Inmobiliaria</th><th>Administrador</th><th class="num">Agentes</th><th class="num">Propiedades</th><th>Estado</th><th></th></tr></thead><tbody>${S.agencies.map((a,i)=>`<tr><td>${a.n}</td><td>${a.a}</td><td class="num">${a.g}</td><td class="num">${a.p}</td><td>${badge(a.s,{Activa:'ok',Pausada:'warn',Baja:'neutral'}[a.s])}</td><td style="text-align:right">${btn(a.s==='Activa'?'Pausar':'Activar','agency',{kind:'secondary',sm:true,d:{i}})}</td></tr>`).join('')}</tbody></table></div></div>`});

/* ---------- render ---------- */
const ROLES = [['land','Inicio'],['reg','Registro'],['t','Inquilino'],['o','Propietario'],['adm','Admin CRM']];
function topbar(d){
  if (d.top==='none') return '';
  if (d.top==='logo') return `<header class="h-top"><span class="h-top__t">${d.title}</span></header>`;
  if (d.top==='logoO') return `<header class="h-top"><span class="h-top__t">${d.title}</span><span class="h-top__t" style="text-align:right;font-size:14px;color:var(--ink-muted)">Inmobiliaria Del Sur</span></header>`;
  if (d.top==='propsTop') return `<header class="h-top"><span class="h-top__t">Propiedades</span>${btn('Publicar','go',{sm:true,icon:'plus',d:{to:'o-new'}})}</header>`;
  if (d.top==='equipoTop') return `<header class="h-top"><span class="h-top__t">Equipo</span>${btn('Agregar','toast',{sm:true,icon:'plus',d:{v:'En la versión real se invita al agente por email.'}})}</header>`;
  return `<header class="h-top">${d.back?`<button class="h-plain h-iconbtn" data-act="back" aria-label="Volver">${ic('back')}</button>`:''}<span class="h-top__t">${d.title}</span></header>`;
}
function sheetHtml(){
  if(!S.sheet) return '';
  const k=S.sheet;
  const pr=S.props.find(x=>x.id===S.curProp);
  const content = k==='rent' ? `<h2 class="title">¿Marcar como alquilado?</h2><p class="body-sm">${pr.title}. Se pausa la publicación y se registra el cierre.</p>${btn('Marcar como alquilado','rent',{block:true})}${btn('Cancelar','closeSheet',{kind:'ghost',block:true})}`
    : `<h2 class="title">¿Eliminar tu cuenta?</h2><p class="body-sm">En esta demo se reinicia todo al estado inicial.</p>${btn('Sí, eliminar','reset',{kind:'danger',block:true})}${btn('Cancelar','closeSheet',{kind:'ghost',block:true})}`;
  return `<div class="h-scrim" data-act="closeSheet"></div><div class="h-sheet" role="dialog" aria-modal="true"><span class="h-sheet__grab"></span>${content}</div>`;
}
/* ---------- persistencia: la partida queda guardada en este navegador ---------- */
const STORE_KEY = 'hogar-demo-state-v' + SEED_VERSION;   // cambia con la semilla: datos viejos no se mezclan
function saveState(){ try { localStorage.setItem(STORE_KEY, JSON.stringify({...S, toast:null, sheet:null})); } catch (e) {} }
function clearSaved(){ try { localStorage.removeItem(STORE_KEY); } catch (e) {} }
function loadSaved(){
  try {
    const raw = localStorage.getItem(STORE_KEY); if (!raw) return null;
    const saved = JSON.parse(raw), base = fresh();
    // se mezcla con fresh() para que un campo nuevo en la semilla no rompa partidas viejas
    const s = {...base, ...saved, p:{...base.p, ...saved.p, processing:false, editing:false}, sheet:null, toast:null};
    if (!sc[s.screen]) { s.role = 'land'; s.screen = 'l1'; s.hist = []; }
    return s;
  } catch (e) { return null; }
}

let lastScreen = null;
function render(keepScroll=true){
  const d = sc[S.screen]();
  const y = window.scrollY; const same = keepScroll && lastScreen === S.screen; lastScreen = S.screen;
  const role = S.role;
  document.getElementById('tabs').innerHTML = ROLES.map(([k,l])=>`<button class="rtab${role===k?' on':''}" data-act="role" data-v="${k}" ${role===k?'aria-current="true"':''}>${l}</button>`).join('');
  const dev = document.getElementById('device');
  dev.className = 'device' + (d.admin?' wide':'');
  const toastHtml = S.toast ? `<div class="toast" role="status">${S.toast}</div>` : '';
  let inner;
  if (d.landing) {
    inner = d.body;
  } else if (d.admin) {
    inner = `<div class="adm"><aside class="h-sidenav">${ADM.map(([k,i,l])=>`<button class="h-plain navb ${S.screen===k?'on':''}" data-act="tab" data-to="${k}">${ic(i)}${l}</button>`).join('')}</aside><div class="appmain admmain"><header class="h-top"><span class="h-top__t">${d.title}</span></header><main class="admbody">${d.body}</main></div></div>`;
  } else {
    const dock = d.nav?nav(d.nav==='t'?NAV_T:NAV_O,S.screen):'';
    const items = d.nav ? (d.nav==='t'?NAV_T:NAV_O) : null;
    const side = items ? `<aside class="h-sidenav side">${items.map(([k,i,l])=>`<button class="h-plain navb ${((tabOf[S.screen]||S.screen)===k)?'on':''}" data-act="tab" data-to="${k}">${ic(i)}${l}</button>`).join('')}</aside>` : '';
    inner = `<div class="app${items?' has-side':''}">${side}<div class="appmain">${topbar(d)}<main class="scroll"><div class="h-body" data-w="${d.wide?'wide':'narrow'}">${d.body}${d.cta?`<div class="h-cta h-cta--inline">${d.cta}</div>`:''}</div></main>${dock?`<div class="dock">${dock}</div>`:''}</div></div>`;
  }
  dev.innerHTML = inner + sheetHtml() + toastHtml;
  window.scrollTo(0, same ? y : 0);
  document.getElementById('cap').innerHTML = `<span class="id">${d.id}</span><span>${d.title}</span><span class="cu">${d.cus}</span>`;
  saveState();
}
let toastT;
function toast(t){ S.toast=t; clearTimeout(toastT); toastT=setTimeout(()=>{S.toast=null;render();},2600); }
function go(to,push=true){ if(S.role==='land' && /^a\d/.test(to)) S.role='reg'; if(push) S.hist.push(S.screen); S.screen=to; S.sheet=null; render(false); }
function enter(role,to){ S.role=role; S.screen=to; S.hist=[]; S.sheet=null; render(false); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if(!el || el.disabled) return;
  const a = el.dataset.act, v = el.dataset.v, id = el.dataset.id;
  if (a==='noop'){ e.preventDefault(); return; }
  if (a==='scrollto'){ e.preventDefault(); const t=document.getElementById(el.dataset.to); if(t) t.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}); return; }
  if (a.startsWith('start:')){ S.rolePick=a.split(':')[1]; enter('reg','a1'); return; }
  if (a==='role'){ const m={land:'l1',reg:'a1',t:'t-pas',o:'o-panel',adm:'a-met'}; enter(v,m[v]); return; }
  if (a==='go'){ e.preventDefault(); go(el.dataset.to); return; }
  if (a==='back'){ const to=S.hist.pop()||sc[S.screen]().back; S.screen=to; S.sheet=null; render(false); return; }
  if (a==='tab'){ S.hist=[]; if(el.dataset.to==='a1'){enter('reg','a1');return;} S.screen=el.dataset.to; S.sheet=null; render(false); return; }
  if (a.startsWith('pick:')){ S.rolePick=a.split(':')[1]; render(); return; }
  if (a==='terms'){ S.terms=!S.terms; render(); return; }
  if (a==='consent'){ S.consent=!S.consent; render(); return; }
  if (a==='a1next'){ go('a3'); return; }
  if (a==='a3next'||a==='enterT'){ if(a==='a3next') S.signups++; if(S.rolePick==='t'||a==='enterT') enter('t','t-pas'); else enter('o','o-panel'); toast('Cuenta creada. Esto es una demo.'); return; }
  if (a==='decl'||a.startsWith('decl:')){ S.p.declared = a==='decl:1'; render(); return; }
  if (a==='guar'){ S.p.guarantee=!S.p.guarantee; render(); return; }
  if (a==='ctype'){ S.p.type=v; render(); return; }
  if (a==='upload'){ S.p.error=false; S.p.processing=true; render();
    const ok=el.dataset.ok==='1'; setTimeout(()=>{ S.p.processing=false; S.ocr.push({at:Date.now(),kind:S.p.type,conf:ok?84:93,fixed:[],st:ok?'ok':'rejected',mine:true}); if(ok){S.myOcr=S.ocr.length-1;S.p.proof=true;S.p.incomeEdited=false;S.p.error=false;S.p.declared=true;toast('Comprobante leído y archivo borrado. Score recalculado.');} else {S.p.error=true;} render(); },1300); return; }
  if (a==='skip'){ S.hist=[]; S.screen='t-pas'; toast('Podés subir el comprobante más tarde. Tu score es menor sin él.'); render(false); return; }
  if (a==='editIncome'){ S.p.editing=!S.p.editing; render(); return; }
  if (a==='confirm'){ go('t-score'); toast('Score recalculado.'); return; }
  if (a==='fb'){ S.filterBudget=!S.filterBudget; render(); return; }
  if (a==='openProp'){ S.curPropT=+id; go('t-prop'); return; }
  if (a==='apply'){ S.apps.push({pid:S.curPropT,status:'sent'}); toast('Postulación enviada con tu Pasaporte.'); render(); return; }
  if (a==='ptab'){ S.postTab=v; render(); return; }
  if (a==='withdraw'){ const ap=S.apps.find(x=>x.pid===+id&&x.status==='sent'); if(ap) ap.status='withdrawn'; toast('Retiraste tu postulación.'); render(); return; }
  if (a==='sheet'){ S.sheet=v; render(); return; }
  if (a==='closeSheet'){ S.sheet=null; render(); return; }
  if (a==='reset'){ clearSaved(); S=fresh(); enter('land','l1'); toast('Cuenta eliminada. Demo reiniciada.'); return; }
  if (a==='toast'){ toast(v); return; }
  /* owner */
  if (a==='oseg'){ S.ownerSeg=v; render(); return; }
  if (a==='ocands'){ S.curProp=+id; go('o-cands'); return; }
  if (a==='pausep'){ const x=S.props.find(p=>p.id===+id); x.status=x.status==='paused'?'active':'paused'; toast(x.status==='paused'?'Publicación pausada.':'Publicación reanudada.'); render(); return; }
  if (a==='cf'){ S.candFilter=!S.candFilter; render(); return; }
  if (a==='opencand'){ S.curCand=id; go('o-cand'); return; }
  if (a==='decide'){ const l=candList(S.curProp); const c=l.find(x=>x.id===S.curCand);
    if (c.me){ const ap=S.apps.find(x=>x.pid===S.curProp&&x.status==='sent'); if(ap) ap.status=v; } else c.status=v;
    toast(v==='selected'?'Candidato seleccionado.':'Candidato descartado.'); render(); return; }
  if (a==='rent'){ const pr=S.props.find(x=>x.id===S.curProp); pr.status='rented'; S.closings.push({agency:OWNER_AGENCY,at:Date.now(),demo:true,pid:pr.id}); const l=candList(pr.id); const c=l.find(x=>x.id===S.curCand); if(c&&!c.me) c.status='rented'; S.sheet=null; toast('Alquiler cerrado. Se registró el cierre.'); render(); return; }
  if (a==='publish'){ const f=S.newForm; const n=Math.max(...S.props.map(p=>p.id))+1; S.props.push({id:n,sc:0,title:f.title,zone:f.zone,price:+String(f.price).replace(/\D/g,''),feats:[],status:'active',agent:f.agent,desc:'Propiedad publicada desde la demo.',exp:0,pets:'—',contract:'24 meses'}); S.cands[n]=[]; if(f.photo){PHOTOS[n]=f.photo; if(!savePhotos()) toast('La foto se ve ahora, pero no entra en la memoria del navegador.');} S.newForm={title:'',zone:'',price:'',agent:'Marcos P.',photo:''}; S.hist=[]; S.screen='o-props'; toast('Propiedad publicada. Ya aparece en la búsqueda del inquilino.'); render(false); return; }
  if (a==='perm'){ const k=el.dataset.k; S.perms[k]=!S.perms[k]; render(); return; }
  if (a==='agency'){ const ag=S.agencies[+el.dataset.i]; ag.s=ag.s==='Activa'?'Pausada':'Activa'; render(); return; }
});
document.addEventListener('change', async e => {
  const b = e.target.dataset && e.target.dataset.bind; if(!b) return;
  if (b==='photo' || b==='newphoto') {
    const file = e.target.files && e.target.files[0]; if(!file) return;
    try { const url = await readPhoto(file);
      if (b==='photo') { PHOTOS[e.target.dataset.id==='hero'?'hero':+e.target.dataset.id] = url; if(!savePhotos()) toast('La foto se ve ahora, pero no entra en la memoria del navegador.'); else toast('Foto actualizada. Ya se ve en la búsqueda del inquilino.'); }
      else { S.newForm.photo = url; }
    } catch (err) { toast('No pude leer esa imagen. Probá con un JPG o PNG.'); }
    render(); return;
  }
  const num = s => parseInt(String(s).replace(/\D/g,''),10)||0;
  if (b==='budget'){ S.p.budget = Math.max(100000, num(e.target.value)); }
  if (b==='income'){ const n=num(e.target.value); if(n!==S.p.incomeNet){S.p.incomeNet=Math.max(1,n);S.p.incomeEdited=true; const r=S.ocr[S.myOcr]; if(r&&!r.fixed.includes('Ingreso neto')) r.fixed.push('Ingreso neto');} }
  if (b==='sen'){ S.p.seniority=+e.target.value; }
  if (b==='nt') S.newForm.title=e.target.value; if (b==='nz') S.newForm.zone=e.target.value; if (b==='np') S.newForm.price=e.target.value; if (b==='na') S.newForm.agent=e.target.value;
  render();
});
document.getElementById('reset').addEventListener('click',()=>{ clearSaved(); S=fresh(); toast('Demo reiniciada con los datos de ejemplo.'); render(false); });
const restored = loadSaved();
if (restored) S = restored;
try { render(false); } catch (e) { clearSaved(); S = fresh(); render(false); }   // partida guardada corrupta: arranca limpio
if (restored && S.screen !== 'l1') { toast('Retomaste la demo donde la dejaste. “Reiniciar demo” vuelve al inicio.'); render(); }

/* theme: arranca siempre en claro; el botón alterna */
let theme = 'light';
try { theme = localStorage.getItem('hogar-theme') || 'light'; } catch (e) {}
const themeBtn = document.getElementById('theme');
function applyTheme(){ document.documentElement.setAttribute('data-theme', theme); themeBtn.textContent = theme === 'dark' ? 'Tema oscuro' : 'Tema claro'; themeBtn.setAttribute('aria-pressed', theme === 'dark'); }
themeBtn.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('hogar-theme', theme); } catch (e) {} applyTheme(); });
applyTheme();
