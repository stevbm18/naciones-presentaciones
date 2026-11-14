const DB_NAME = "naciones-presentaciones";
const DB_VERSION = 1;
let db, media = [], songs = [], slides = [], current = -1, projector = null, blackout = false;
const channel = "BroadcastChannel" in window ? new BroadcastChannel("naciones-projection") : null;
const $ = id => document.getElementById(id);
const isProjection = new URLSearchParams(location.search).has("projection");

function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains("media"))d.createObjectStore("media",{keyPath:"id"});if(!d.objectStoreNames.contains("songs"))d.createObjectStore("songs",{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function store(name,mode="readonly"){return db.transaction(name,mode).objectStore(name);}
function all(name){return new Promise((resolve,reject)=>{const r=store(name).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function put(name,value){return new Promise((resolve,reject)=>{const r=store(name,"readwrite").put(value);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});}
function del(name,id){return new Promise((resolve,reject)=>{const r=store(name,"readwrite").delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});}
function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random();}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function urlFor(item){return URL.createObjectURL(item.blob);}
function slideData(s){if(s.type==="song")return {type:"text",text:s.text,title:s.title};const m=media.find(x=>x.id===s.mediaId);return m?{type:m.type,blob:m.blob,name:m.name}:null;}
function activeData(){return current>=0?slideData(slides[current]):null;}
function sendState(){const d=activeData();if(!d)return;const msg={type:"state",slide:d,index:current,total:slides.length,blackout};if(channel)channel.postMessage(msg);try{if(projector&&!projector.closed)projector.postMessage(msg,location.origin);}catch(e){}}
function selectSlide(i){if(i<0||i>=slides.length)return;current=i;blackout=false;renderSlides();renderPreview();sendState();}
function renderSlides(){
  const grid=$("slides-grid");$("slide-count").textContent=`${slides.length} elementos en la presentación`;
  if(!slides.length){grid.innerHTML='<div class="empty-state"><div class="empty-icon">▧</div><strong>Tu presentación está vacía</strong><p>Agrega imágenes o crea una canción para comenzar.</p><button class="btn btn-primary" id="empty-add">Agregar archivos</button></div>';$("empty-add").onclick=()=> $("file-picker").click();return;}
  grid.innerHTML=slides.map((s,i)=>{const d=slideData(s);let thumb=d?.type==="text"?`<div class="text-thumb">${esc(d.text.slice(0,100))}</div>`:d?.type==="image"?`<img src="${urlFor(d)}">`:`<div>▶ VIDEO</div>`;return `<button class="slide-card ${i===current?"selected":""}" data-index="${i}"><span class="slide-number">${i+1}</span><div class="slide-thumb">${thumb||"Archivo no disponible"}</div><div class="slide-meta">${esc(s.title||d?.name||"Diapositiva")}</div></button>`;}).join("");
  grid.querySelectorAll(".slide-card").forEach(b=>b.onclick=()=>selectSlide(Number(b.dataset.index)));
}
function renderPreview(){
  const d=activeData(),screen=$("preview-screen");$("preview-position").textContent=current>=0?`${current+1} / ${slides.length}`:"— / —";$("preview-name").textContent=d?.title||d?.name||"Selecciona una diapositiva";
  if(!d){screen.innerHTML="<span>Sin diapositiva seleccionada</span>";return;}
  if(d.type==="image")screen.innerHTML=`<img src="${urlFor(d)}">`;
  else if(d.type==="video")screen.innerHTML=`<video src="${urlFor(d)}" muted></video>`;
  else screen.innerHTML=`<div class="preview-text">${esc(d.text)}</div>`;
}
function renderLibrary(){
  const grid=$("library-grid");$("library-empty").style.display=media.length?"none":"flex";
  grid.innerHTML=media.map(m=>`<article class="media-card"><div class="media-preview">${m.type==="image"?`<img src="${urlFor(m)}">`:"▶ VIDEO"}</div><div class="media-details"><strong title="${esc(m.name)}">${esc(m.name)}</strong><small>${m.type==="image"?"Imagen":"Video"} · ${(m.size/1048576).toFixed(1)} MB</small></div><div class="media-actions"><button class="btn" data-add="${m.id}">＋ Presentar</button><button class="btn" data-del="${m.id}">Eliminar</button></div></article>`).join("");
  grid.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const m=media.find(x=>x.id===b.dataset.add);slides.push({mediaId:m.id,title:m.name});selectSlide(slides.length-1);showView("presentacion");});
  grid.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{const id=b.dataset.del;await del("media",id);media=media.filter(m=>m.id!==id);slides=slides.filter(s=>s.mediaId!==id);current=Math.min(current,slides.length-1);renderLibrary();renderSlides();renderPreview();toast("Archivo eliminado");});
}
function renderSongs(){
  $("song-count").textContent=`${songs.length} canciones guardadas`;
  $("songs-list").innerHTML=songs.length?songs.map(s=>`<div class="song-row"><div><strong>${esc(s.title)}</strong><small>${s.parts.length} diapositivas</small></div><button class="btn" data-song="${s.id}">＋ Agregar</button></div>`).join(""):'<div class="empty-state" style="min-height:180px"><strong>Aún no hay canciones</strong><p>Las canciones que guardes aparecerán aquí.</p></div>';
  $("songs-list").querySelectorAll("[data-song]").forEach(b=>b.onclick=()=>{const s=songs.find(x=>x.id===b.dataset.song);s.parts.forEach((text,i)=>slides.push({type:"song",title:`${s.title} · ${i+1}`,text}));selectSlide(slides.length-s.parts.length);showView("presentacion");});
}
function showView(view){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$("view-"+view).classList.add("active");document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$("page-title").textContent=({presentacion:"Presentación",biblioteca:"Biblioteca multimedia",canciones:"Canciones"})[view];}
async function importFiles(files){
  for(const f of files){const type=f.type.startsWith("image/")?"image":f.type.startsWith("video/")?"video":null;if(!type)continue;const item={id:uid(),name:f.name,type,size:f.size,blob:f,lastModified:f.lastModified};await put("media",item);media.push(item);}
  renderLibrary();toast("Archivos guardados en este equipo");
}
function openProjector(){projector=window.open(location.pathname+"?projection=1","naciones-projection","popup,width=1280,height=720");if(!projector){toast("Permite las ventanas emergentes para abrir la proyección");return;}setTimeout(sendState,500);}
function navigate(delta){if(!slides.length)return;selectSlide(Math.max(0,Math.min(slides.length-1,current+delta)));}
function initProjection(){
  document.body.innerHTML='<main class="projection" id="projection"><div class="projection-message">NACIONES PRESENTACIONES<br><small>Esperando contenido…</small></div></main>';
  const receive=msg=>{if(!msg||msg.type!=="state")return;const root=$("projection");if(msg.blackout){root.innerHTML="";root.style.background="#000";return;}root.style.background="#000";const s=msg.slide;if(!s)return;if(s.type==="image"){const u=URL.createObjectURL(s.blob);root.innerHTML=`<img class="projected-media" src="${u}">`;}else if(s.type==="video"){const u=URL.createObjectURL(s.blob);root.innerHTML=`<video class="projected-media" src="${u}" autoplay controls></video>`;const v=root.querySelector("video");v.play().catch(()=>{});}else{root.innerHTML=`<div class="projected-text">${esc(s.text).replace(/\n/g,"<br>")}</div>`;}};
  if(channel)channel.onmessage=e=>receive(e.data);
  window.addEventListener("message",e=>receive(e.data));
  window.addEventListener("keydown",e=>{if(e.key==="Escape")window.close();});
}
async function init(){
  if(isProjection){initProjection();return;}
  db=await openDB();media=await all("media");songs=await all("songs");
  document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>showView(b.dataset.view));
  $("open-projector").onclick=openProjector;
  $("add-media").onclick=()=>$("file-picker").click();
  $("import-files").onclick=()=>$("file-picker").click();
  $("file-picker").onchange=e=>importFiles([...e.target.files]);
  $("prev-slide").onclick=()=>navigate(-1);$("next-slide").onclick=()=>navigate(1);
  $("blackout").onclick=()=>{blackout=!blackout;if(channel)channel.postMessage({type:"state",blackout});if(projector&&!projector.closed)projector.postMessage({type:"state",blackout},location.origin);toast(blackout?"Pantalla negra activada":"Proyección restaurada");};
  $("save-song").onclick=async()=>{const title=$("song-title").value.trim(),lyrics=$("song-lyrics").value.trim();if(!title||!lyrics){toast("Escribe el nombre y la letra");return;}const parts=lyrics.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);const s={id:uid(),title,parts};await put("songs",s);songs.push(s);renderSongs();$("song-title").value="";$("song-lyrics").value="";toast("Canción guardada");};
  window.addEventListener("keydown",e=>{if(e.target.matches("input,textarea"))return;if(e.key==="ArrowRight")navigate(1);if(e.key==="ArrowLeft")navigate(-1);if(e.key.toLowerCase()==="b")$("blackout").click();});
  if(channel)channel.onmessage=e=>{if(e.data?.type==="request-state")sendState();};
  renderLibrary();renderSongs();renderSlides();renderPreview();
  if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
init().catch(e=>{console.error(e);toast("No se pudo iniciar el almacenamiento local");});
