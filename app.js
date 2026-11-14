/* Naciones Presentaciones - correcciones de proyección, canciones y arrastrar/soltar */
const DB_NAME = "naciones-presentaciones";
const DB_VERSION = 1; // No cambiar: conserva la biblioteca local existente.
let db, media = [], songs = [], slides = [], current = -1;
let projector = null, blackout = false;
let fadeMs = Number(localStorage.getItem("naciones-fade-ms") || 500);
const channel = ("BroadcastChannel" in window) ? new BroadcastChannel("naciones-projection") : null;
const $ = id => document.getElementById(id);
const isProjection = new URLSearchParams(location.search).has("projection");
const objectUrls = new Map();

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const d = request.result;
      if (!d.objectStoreNames.contains("media")) d.createObjectStore("media", { keyPath: "id" });
      if (!d.objectStoreNames.contains("songs")) d.createObjectStore("songs", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function store(name, mode = "readonly") { return db.transaction(name, mode).objectStore(name); }
function all(name) {
  return new Promise((resolve, reject) => {
    const r = store(name).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
function put(name, value) {
  return new Promise((resolve, reject) => {
    const r = store(name, "readwrite").put(value); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error);
  });
}
function del(name, id) {
  return new Promise((resolve, reject) => {
    const r = store(name, "readwrite").delete(id); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error);
  });
}
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function toast(message) {
  const el = $("toast"); if (!el) return;
  el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2400);
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function objectUrl(key, blob) {
  if (!blob) return "";
  const id = String(key || "blob");
  const existing = objectUrls.get(id);
  if (existing && existing.blob === blob) return existing.url;
  if (existing) URL.revokeObjectURL(existing.url);
  const url = URL.createObjectURL(blob);
  objectUrls.set(id, { blob, url });
  return url;
}
function findMedia(id) { return media.find(item => item.id === id); }

function getSlideData(slide) {
  if (!slide) return null;
  if (slide.type === "song" || slide.type === "text") {
    const background = slide.backgroundId && findMedia(slide.backgroundId);
    return {
      type: "song", key: `song-${slide.backgroundId || "black"}`,
      text: slide.text || "", title: slide.title || "Canción",
      background: background ? { id: background.id, type: background.type, blob: background.blob } : { id: "black", type: "black" }
    };
  }
  const item = slide.mediaId && findMedia(slide.mediaId);
  if (!item) return null;
  return { type: item.type, key: `media-${item.id}`, id: item.id, blob: item.blob, name: item.name, title: slide.title || item.name };
}
function activeData() { return current >= 0 ? getSlideData(slides[current]) : null; }

function sendState() {
  const message = { type: "state", slide: activeData(), index: current, total: slides.length, blackout, fadeMs };
  if (channel) channel.postMessage(message);
  else if (projector && !projector.closed) {
    try { projector.postMessage(message, location.origin); } catch (_) {}
  }
}
function selectSlide(index) {
  if (index < 0 || index >= slides.length) return;
  current = index;
  blackout = false;
  renderSlides();
  renderPreview();
  sendState();
}
function showView(view) {
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  const target = $("view-" + view); if (target) target.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("page-title").textContent = ({ presentacion:"Presentación", biblioteca:"Imágenes", videos:"Videos", canciones:"Canciones" })[view] || "Presentación";
}
function slideLabel(slide, data) { return slide.title || data?.name || "Diapositiva"; }

function renderSlides() {
  const grid = $("slides-grid"); if (!grid) return;
  $("slide-count").textContent = `${slides.length} elementos en la presentación`;
  if (!slides.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">▧</div><strong>Tu presentación está vacía</strong><p>Arrastra archivos aquí o utiliza el botón para agregarlos.</p><button class="btn btn-primary" id="empty-add">Agregar archivos</button></div>';
    $("empty-add").onclick = () => $("file-picker").click();
    return;
  }
  grid.innerHTML = slides.map((slide, index) => {
    const data = getSlideData(slide);
    let thumb = "";
    if (data?.type === "song") thumb = `<div class="text-thumb">${esc(data.text.slice(0, 100))}</div>`;
    else if (data?.type === "image") thumb = `<img src="${objectUrl(data.key, data.blob)}">`;
    else if (data?.type === "video") thumb = `<div class="video-thumb">▶ VIDEO</div>`;
    return `<button class="slide-card ${index === current ? "selected" : ""}" data-index="${index}" draggable="true">
      <span class="slide-number">${index + 1}</span><div class="slide-thumb">${thumb || "Archivo no disponible"}</div>
      <div class="slide-meta">${esc(slideLabel(slide, data))}</div></button>`;
  }).join("");
  grid.querySelectorAll(".slide-card").forEach(card => {
    card.addEventListener("click", () => selectSlide(Number(card.dataset.index)));
    card.addEventListener("dragstart", event => {
      event.dataTransfer.setData("application/x-naciones-slide-index", card.dataset.index);
      event.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", event => { event.preventDefault(); card.classList.add("drag-over"); });
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", event => {
      event.preventDefault(); card.classList.remove("drag-over");
      const from = Number(event.dataTransfer.getData("application/x-naciones-slide-index"));
      if (!Number.isNaN(from) && event.dataTransfer.getData("application/x-naciones-slide-index") !== "") {
        const to = Number(card.dataset.index);
        if (from !== to) {
          const [moved] = slides.splice(from, 1); slides.splice(to, 0, moved);
          current = to; renderSlides(); renderPreview(); sendState();
        }
        return;
      }
      const mediaId = event.dataTransfer.getData("application/x-naciones-media-id");
      if (mediaId) addMediaToPresentation(mediaId, to);
    });
  });
}
function renderMediaInto(container, data, className = "") {
  if (!container || !data) return;
  if (data.type === "image") {
    const img = document.createElement("img"); img.src = objectUrl(data.key || data.id, data.blob); img.className = className; container.appendChild(img);
  } else if (data.type === "video") {
    const video = document.createElement("video"); video.src = objectUrl(data.key || data.id, data.blob);
    video.className = className; video.muted = true; video.playsInline = true; container.appendChild(video);
  }
}
function renderPreview() {
  const data = activeData(), screen = $("preview-screen");
  if (!screen) return;
  $("preview-position").textContent = current >= 0 ? `${current + 1} / ${slides.length}` : "— / —";
  $("preview-name").textContent = data?.title || data?.name || "Selecciona una diapositiva";
  screen.innerHTML = "";
  if (!data) { screen.innerHTML = "<span>Sin diapositiva seleccionada</span>"; return; }
  if (data.type === "song") {
    if (data.background.type === "image" || data.background.type === "video") {
      renderMediaInto(screen, { ...data.background, key: `bg-${data.background.id}` }, "preview-background");
    }
    const text = document.createElement("div"); text.className = "preview-song-text"; text.textContent = data.text; screen.appendChild(text);
  } else renderMediaInto(screen, data, "preview-media");
}
function addMediaToPresentation(id, insertAt = null) {
  const item = findMedia(id); if (!item) return;
  const slide = { mediaId: item.id, title: item.name };
  if (insertAt === null || insertAt === undefined) slides.push(slide);
  else slides.splice(insertAt, 0, slide);
  selectSlide(insertAt === null || insertAt === undefined ? slides.length - 1 : insertAt);
  showView("presentacion"); toast("Agregado a la presentación");
}

async function deleteMedia(id) {
  await del("media", id);
  media = media.filter(item => item.id !== id);
  slides = slides.filter(slide => slide.mediaId !== id);
  // Si una canción usaba este fondo, conserva su letra y vuelve al fondo negro.
  slides.forEach(slide => { if (slide.backgroundId === id) slide.backgroundId = null; });
  current = Math.min(current, slides.length - 1);
  if (current < 0 && slides.length) current = 0;
  renderLibrary(); renderSlides(); renderPreview(); renderQuickImages(); populateSongBackgrounds(); sendState();
  toast("Archivo eliminado");
}
function makeMediaCard(item, isVideo = false) {
  const preview = isVideo ? `<video src="${objectUrl(item.id, item.blob)}" muted></video>` : `<img src="${objectUrl(item.id, item.blob)}">`;
  return `<article class="media-card" draggable="true" data-media-card="${item.id}">
    <div class="media-preview">${preview}</div>
    <div class="media-details"><strong title="${esc(item.name)}">${esc(item.name)}</strong><small>${isVideo ? "Video" : "Imagen"} · ${(item.size / 1048576).toFixed(1)} MB</small></div>
    <div class="media-actions"><button class="btn" data-add="${item.id}">＋ Presentar</button>
    ${isVideo ? "" : `<button class="btn" data-pin="${item.id}">${item.pinned ? "✓ Fijada" : "⌄ Fijar abajo"}</button>`}
    <button class="btn" data-del="${item.id}">Eliminar</button></div></article>`;
}
function wireMediaGrid(grid) {
  grid.querySelectorAll("[data-add]").forEach(button => button.onclick = () => addMediaToPresentation(button.dataset.add));
  grid.querySelectorAll("[data-pin]").forEach(button => button.onclick = async () => {
    const item = findMedia(button.dataset.pin); if (!item) return;
    item.pinned = !item.pinned; await put("media", item); renderLibrary(); renderQuickImages();
    toast(item.pinned ? "Imagen fijada abajo" : "Imagen quitada de accesos rápidos");
  });
  grid.querySelectorAll("[data-del]").forEach(button => button.onclick = () => deleteMedia(button.dataset.del));
  grid.querySelectorAll("[data-media-card]").forEach(card => {
    card.addEventListener("dragstart", event => {
      event.dataTransfer.setData("application/x-naciones-media-id", card.dataset.mediaCard);
      event.dataTransfer.effectAllowed = "copy";
    });
  });
}
function renderLibrary() {
  const images = media.filter(item => item.type === "image"), grid = $("library-grid");
  $("library-empty").style.display = images.length ? "none" : "flex";
  grid.innerHTML = images.map(item => makeMediaCard(item, false)).join("");
  wireMediaGrid(grid); renderVideos(); renderQuickImages(); populateSongBackgrounds();
}
function renderVideos() {
  const videos = media.filter(item => item.type === "video"), grid = $("videos-grid");
  if (!grid) return;
  $("videos-empty").style.display = videos.length ? "none" : "flex";
  grid.innerHTML = videos.map(item => makeMediaCard(item, true)).join("");
  wireMediaGrid(grid);
}
function renderQuickImages() {
  const dock = $("quick-images"); if (!dock) return;
  const pinned = media.filter(item => item.type === "image" && item.pinned);
  dock.innerHTML = pinned.length ? pinned.map(item => `<button class="quick-image" data-quick="${item.id}" title="${esc(item.name)}"><img src="${objectUrl(item.id, item.blob)}"><span>${esc(item.name)}</span></button>`).join("") :
    '<span class="quick-empty">Todavía no hay imágenes fijadas. En Imágenes, selecciona “Fijar abajo” para crear tus accesos rápidos.</span>';
  dock.querySelectorAll("[data-quick]").forEach(button => button.onclick = () => {
    let index = slides.findIndex(slide => slide.mediaId === button.dataset.quick);
    if (index < 0) { const item = findMedia(button.dataset.quick); slides.push({ mediaId: item.id, title: item.name }); index = slides.length - 1; }
    selectSlide(index);
  });
}

function populateSongBackgrounds() {
  const select = $("song-background"); if (!select) return;
  const selected = select.value || "black";
  const options = ['<option value="black">Negro (sin fondo)</option>'];
  media.forEach(item => options.push(`<option value="${item.id}">${item.type === "video" ? "▶ Video" : "▧ Imagen"} · ${esc(item.name)}</option>`));
  select.innerHTML = options.join("");
  select.value = [...select.options].some(option => option.value === selected) ? selected : "black";
  updateSongBackgroundPreview();
}
function updateSongBackgroundPreview() {
  const preview = $("song-background-preview"), value = $("song-background")?.value || "black";
  if (!preview) return;
  preview.innerHTML = "";
  if (value === "black") { preview.classList.add("is-black"); preview.textContent = "Fondo negro"; return; }
  preview.classList.remove("is-black");
  const item = findMedia(value);
  if (!item) { preview.textContent = "Selecciona un fondo"; return; }
  if (item.type === "image") {
    const img = document.createElement("img"); img.src = objectUrl(`bg-${item.id}`, item.blob); preview.appendChild(img);
  } else {
    const video = document.createElement("video"); video.src = objectUrl(`bg-${item.id}`, item.blob); video.muted = true; video.loop = true; video.autoplay = true; video.playsInline = true; preview.appendChild(video); video.play().catch(() => {});
  }
  const label = document.createElement("span"); label.textContent = item.name; preview.appendChild(label);
}
function renderSongs() {
  $("song-count").textContent = `${songs.length} canciones guardadas`;
  $("songs-list").innerHTML = songs.length ? songs.map(song => `<div class="song-row"><div><strong>${esc(song.title)}</strong><small>${(song.parts || []).length} diapositivas · Fondo: ${song.backgroundId ? esc(findMedia(song.backgroundId)?.name || "no disponible") : "negro"}</small></div><button class="btn" data-song="${song.id}">＋ Agregar</button></div>`).join("") :
    '<div class="empty-state" style="min-height:180px"><strong>Aún no hay canciones</strong><p>Las canciones que guardes aparecerán aquí.</p></div>';
  $("songs-list").querySelectorAll("[data-song]").forEach(button => button.onclick = () => {
    const song = songs.find(item => item.id === button.dataset.song); if (!song) return;
    const parts = song.parts || [];
    const start = slides.length;
    parts.forEach((text, index) => slides.push({
      type: "song", title: `${song.title} · ${index + 1}`, text,
      backgroundId: song.backgroundId || null
    }));
    if (parts.length) { selectSlide(start); showView("presentacion"); }
  });
}

async function importFiles(fileList, expectedType, addToPresentation = false) {
  let added = 0;
  for (const file of [...fileList]) {
    const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
    if (!type || (expectedType && type !== expectedType)) continue;
    const item = { id: uid(), name: file.name, type, size: file.size, blob: file, lastModified: file.lastModified, pinned: false };
    await put("media", item); media.push(item);
    if (addToPresentation) slides.push({ mediaId: item.id, title: item.name });
    added++;
  }
  if (!added) { toast("No encontré archivos compatibles. Usa PNG, JPG, WebP, MP4 o WebM."); return; }
  renderLibrary(); renderSlides(); renderPreview(); populateSongBackgrounds();
  if (addToPresentation) { current = slides.length - 1; selectSlide(current); showView("presentacion"); }
  toast(`${added} archivo(s) ${addToPresentation ? "agregados a la presentación" : "guardados en la biblioteca"}`);
}
function openProjector() {
  if (projector && !projector.closed) { projector.focus(); sendState(); return; }
  projector = window.open(`${location.pathname}?projection=1`, "naciones-projection", "popup,width=1280,height=720");
  if (!projector) { toast("Permite las ventanas emergentes para abrir la proyección"); return; }
  // El proyector solicita el estado al terminar de cargar; este envío es solo respaldo.
  setTimeout(sendState, 1200);
}
function navigate(delta) {
  if (!slides.length) return;
  selectSlide(Math.max(0, Math.min(slides.length - 1, current + delta)));
}

/* Ventana de proyección: capas separadas para que el fondo de canción no se reinicie al cambiar estrofa. */
function initProjection() {
  document.body.innerHTML = '<main class="projection" id="projection"><div class="projection-background-layer" id="projection-background"></div><div class="projection-lyrics-layer" id="projection-lyrics"></div><div class="projection-message" id="projection-message">NACIONES PRESENTACIONES<br><small>Conectando con el operador…</small></div></main>';
  let currentBackgroundKey = null, currentLyrics = null, currentMediaNode = null, currentBgNode = null;
  const urls = new Map();
  function projectionUrl(key, blob) {
    if (!blob) return "";
    const old = urls.get(key);
    if (old && old.blob === blob) return old.url;
    if (old) URL.revokeObjectURL(old.url);
    const url = URL.createObjectURL(blob); urls.set(key, { blob, url }); return url;
  }
  function fadeReplace(layer, node, duration) {
    const old = layer.firstElementChild;
    if (!duration) {
      layer.replaceChildren(node); node.style.opacity = "1"; return;
    }
    node.style.opacity = "0";
    node.style.transition = `opacity ${duration}ms ease-in-out`;
    layer.appendChild(node);
    requestAnimationFrame(() => { node.style.opacity = "1"; if (old) old.style.opacity = "0"; });
    if (old) setTimeout(() => { if (old.parentNode === layer) old.remove(); }, duration + 60);
  }
  function setBackground(key, type, blob, duration) {
    if (key === currentBackgroundKey) return;
    currentBackgroundKey = key;
    const layer = $("projection-background");
    let node = document.createElement("div"); node.className = "projection-background-item";
    if (type === "image") {
      const img = document.createElement("img"); img.src = projectionUrl(key, blob); node.appendChild(img);
    } else if (type === "video") {
      const video = document.createElement("video"); video.src = projectionUrl(key, blob);
      video.autoplay = true; video.loop = true; video.playsInline = true; video.controls = false;
      node.appendChild(video); video.play().catch(() => {});
    }
    fadeReplace(layer, node, duration);
  }
  function setLyrics(text, duration) {
    const layer = $("projection-lyrics");
    if (!text) { layer.replaceChildren(); currentLyrics = null; return; }
    if (text === currentLyrics) return;
    currentLyrics = text;
    const node = document.createElement("div"); node.className = "projection-lyrics";
    node.textContent = text;
    fadeReplace(layer, node, duration);
  }
  function showMedia(data, duration) {
    const layer = $("projection-background");
    const key = data.key || `${data.type}-${data.id}`;
    if (key === currentBackgroundKey) return;
    currentBackgroundKey = key;
    const node = document.createElement("div"); node.className = "projection-background-item";
    if (data.type === "image") {
      const img = document.createElement("img"); img.src = projectionUrl(key, data.blob); node.appendChild(img);
    } else if (data.type === "video") {
      const video = document.createElement("video"); video.src = projectionUrl(key, data.blob);
      video.autoplay = true; video.playsInline = true; video.controls = false;
      node.appendChild(video); video.play().catch(() => {});
    }
    fadeReplace(layer, node, duration);
  }
  function receive(message) {
    if (!message || message.type !== "state") return;
    const duration = Math.max(0, Number(message.fadeMs) || 0);
    const root = $("projection");
    $("projection-message")?.remove();
    if (message.blackout) {
      root.classList.add("is-blackout");
      $("projection-background").replaceChildren();
      $("projection-lyrics").replaceChildren();
      currentBackgroundKey = null; currentLyrics = null; return;
    }
    root.classList.remove("is-blackout");
    const data = message.slide;
    if (!data) {
      setBackground("black", "black", null, duration); setLyrics("", duration); return;
    }
    if (data.type === "song") {
      const bg = data.background || { id:"black", type:"black" };
      setBackground(`song-bg-${bg.id}`, bg.type, bg.blob, duration);
      setLyrics(data.text || "", duration);
    } else {
      setLyrics("", duration);
      showMedia(data, duration);
    }
  }
  if (channel) {
    channel.onmessage = event => receive(event.data);
    channel.postMessage({ type: "projection-ready" });
  }
  window.addEventListener("message", event => {
    if (event.origin !== location.origin) return;
    if (event.data?.type === "state") receive(event.data);
  });
  if (window.opener) {
    try { window.opener.postMessage({ type: "projection-ready" }, location.origin); } catch (_) {}
  }
  window.addEventListener("keydown", event => { if (event.key === "Escape") window.close(); });
}

function setupDragAndDrop() {
  const overlay = $("drop-overlay");
  let dragDepth = 0;
  document.addEventListener("dragenter", event => {
    if (event.dataTransfer?.types?.includes("Files")) { dragDepth++; overlay.classList.add("visible"); }
  });
  document.addEventListener("dragleave", event => {
    if (event.dataTransfer?.types?.includes("Files")) { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) overlay.classList.remove("visible"); }
  });
  document.addEventListener("dragover", event => { if (event.dataTransfer?.types?.includes("Files")) event.preventDefault(); });
  document.addEventListener("drop", async event => {
    if (!event.dataTransfer?.files?.length) return;
    event.preventDefault(); dragDepth = 0; overlay.classList.remove("visible");
    const target = event.target.closest("#image-library-dropzone, #video-library-dropzone, #slides-dropzone, #main-dropzone");
    const add = !!target?.matches("#slides-dropzone, #main-dropzone");
    await importFiles(event.dataTransfer.files, null, add);
  });
  const grid = $("slides-grid");
  grid.addEventListener("dragover", event => {
    if (event.dataTransfer?.types?.includes("application/x-naciones-media-id") || event.dataTransfer?.types?.includes("Files")) {
      event.preventDefault(); grid.classList.add("drop-target");
    }
  });
  grid.addEventListener("dragleave", () => grid.classList.remove("drop-target"));
  grid.addEventListener("drop", () => grid.classList.remove("drop-target"));
}

async function init() {
  if (isProjection) { initProjection(); return; }
  db = await openDB();
  media = await all("media"); songs = await all("songs");
  document.querySelectorAll(".nav-item").forEach(button => button.onclick = () => showView(button.dataset.view));
  $("open-projector").onclick = openProjector;
  $("add-media").onclick = () => $("file-picker").click();
  $("import-files").onclick = () => $("file-picker").click();
  $("file-picker").onchange = event => { importFiles(event.target.files, "image", false); event.target.value = ""; };
  $("import-videos").onclick = () => $("video-picker").click();
  $("video-picker").onchange = event => { importFiles(event.target.files, "video", false); event.target.value = ""; };
  $("fade-duration").value = fadeMs; $("fade-value").textContent = `${fadeMs} ms`;
  $("fade-duration").oninput = event => {
    fadeMs = Number(event.target.value); localStorage.setItem("naciones-fade-ms", fadeMs);
    $("fade-value").textContent = `${fadeMs} ms`;
  };
  $("prev-slide").onclick = () => navigate(-1); $("next-slide").onclick = () => navigate(1);
  $("blackout").onclick = () => {
    blackout = !blackout; sendState();
    toast(blackout ? "Pantalla negra activada" : "Proyección restaurada");
  };
  $("song-background").onchange = updateSongBackgroundPreview;
  $("save-song").onclick = async () => {
    const title = $("song-title").value.trim(), lyrics = $("song-lyrics").value.trim();
    if (!title || !lyrics) { toast("Escribe el nombre y la letra"); return; }
    const parts = lyrics.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
    const selectedBackground = $("song-background").value;
    const song = { id: uid(), title, parts, backgroundId: selectedBackground === "black" ? null : selectedBackground };
    await put("songs", song); songs.push(song);
    const start = slides.length;
    parts.forEach((text, index) => slides.push({ type:"song", title:`${title} · ${index + 1}`, text, backgroundId:song.backgroundId }));
    renderSongs(); renderSlides(); selectSlide(start); showView("presentacion");
    $("song-title").value = ""; $("song-lyrics").value = "";
    toast("Canción guardada y agregada a la presentación");
  };
  window.addEventListener("keydown", event => {
    if (event.target.matches("input,textarea,select")) return;
    if (event.key === "ArrowRight") navigate(1);
    if (event.key === "ArrowLeft") navigate(-1);
    if (event.key.toLowerCase() === "b") $("blackout").click();
  });
  if (channel) channel.onmessage = event => {
    if (event.data?.type === "projection-ready") sendState();
  };
  window.addEventListener("message", event => {
    if (event.origin === location.origin && event.data?.type === "projection-ready") sendState();
  });
  setupDragAndDrop();
  renderLibrary(); renderVideos(); renderQuickImages(); renderSongs(); renderSlides(); renderPreview();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}
init().catch(error => { console.error(error); toast("No se pudo iniciar el almacenamiento local"); });
