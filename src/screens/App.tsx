import { useEffect, useMemo, useState } from 'react';
import { Aperture, ArrowLeft, ArrowRight, AudioLines, Images, Library, Monitor, MonitorPlay, Music2, Play, Plus, Search, Settings, Square, Video, X } from 'lucide-react';
import Projection from './Projection';

type Slide = { id: string; kind: 'image' | 'text' | 'video'; title: string; src?: string; text?: string };

const demoSlides: Slide[] = [
  { id: 'welcome', kind: 'text', title: 'Bienvenidos', text: 'BIENVENIDOS\nA IGLESIA NACIONES' },
  { id: 'worship', kind: 'text', title: 'Alabanza', text: 'GRANDE Y FUERTE\nES NUESTRO DIOS' },
  { id: 'verse', kind: 'text', title: 'Versículo', text: '“Todo lo que respira\nalabe al Señor”\n\nSalmos 150:6' },
  { id: 'message', kind: 'text', title: 'Predicación', text: 'JESÚS\nES EL CENTRO' },
];

export default function App() {
  const isProjection = window.location.hash === '#/projection';
  const [slides, setSlides] = useState<Slide[]>(demoSlides);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [displays, setDisplays] = useState<Awaited<ReturnType<typeof window.naciones.getDisplays>>>([]);
  const [displayId, setDisplayId] = useState<number | null>(null);
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [query, setQuery] = useState('');
  const activeSlide = slides.find(s => s.id === activeId) ?? null;
  const liveSlide = slides.find(s => s.id === liveId) ?? null;
  const filteredSlides = useMemo(() => slides.filter(s => s.title.toLowerCase().includes(query.toLowerCase())), [slides, query]);

  useEffect(() => {
    if (isProjection) return;
    void window.naciones.getDisplays().then(found => {
      setDisplays(found);
      const secondary = found.find(d => !d.primary) ?? found[0];
      if (secondary) setDisplayId(secondary.id);
    });
  }, [isProjection]);

  if (isProjection) return <Projection />;

  function broadcast(slide: Slide) {
    setLiveId(slide.id);
    window.naciones.sendToProjection({ type: slide.kind, src: slide.src, text: slide.text, title: slide.title });
  }
  function goBlack() {
    setLiveId(null);
    window.naciones.sendToProjection({ type: 'black' });
  }
  async function openProjection() {
    if (displayId === null) return;
    await window.naciones.openProjection(displayId);
    setProjectionOpen(true);
    if (liveSlide) window.setTimeout(() => broadcast(liveSlide), 500);
  }
  async function importImages() {
    const paths = await window.naciones.selectImages();
    const next = paths.map((src, index) => ({ id: `${Date.now()}-${index}`, kind: 'image' as const, title: src.split(/[\\/]/).pop() ?? 'Imagen', src: `file://${src.replace(/\\/g, '/')}` }));
    setSlides(current => [...current, ...next]);
    if (next[0]) setActiveId(next[0].id);
  }
  async function importVideo() {
    const src = await window.naciones.selectVideo();
    if (!src) return;
    const slide: Slide = { id: `${Date.now()}`, kind: 'video', title: src.split(/[\\/]/).pop() ?? 'Video', src: `file://${src.replace(/\\/g, '/')}` };
    setSlides(current => [...current, slide]);
    setActiveId(slide.id);
  }
  function addSong() {
    const title = window.prompt('Nombre de la canción');
    if (!title?.trim()) return;
    const text = window.prompt('Escribe la letra de esta diapositiva');
    if (text === null) return;
    const slide: Slide = { id: `${Date.now()}`, kind: 'text', title: title.trim(), text };
    setSlides(current => [...current, slide]);
    setActiveId(slide.id);
  }
  function moveLive(direction: number) {
    const index = slides.findIndex(s => s.id === liveId);
    const next = slides[index + direction];
    if (next) { setActiveId(next.id); broadcast(next); }
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Aperture size={20}/></div><div><strong>NACIONES</strong><span>PRESENTACIONES</span></div></div>
      <div className="service-name"><span className="status-dot"/> <span>Presentación sin guardar</span></div>
      <div className="top-actions"><button className="icon-button" title="Configuración"><Settings size={17}/></button><div className="avatar">N</div></div>
    </header>

    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-section-label">BIBLIOTECA</div>
        <button className="nav-item active"><Library size={17}/> Presentación actual</button>
        <button className="nav-item" onClick={importImages}><Images size={17}/> Imágenes</button>
        <button className="nav-item" onClick={addSong}><Music2 size={17}/> Canciones</button>
        <button className="nav-item" onClick={importVideo}><Video size={17}/> Videos</button>
        <div className="sidebar-bottom"><div className="sidebar-section-label">SALIDA</div><div className="output-card"><div className="output-icon"><MonitorPlay size={17}/></div><div><strong>Proyección</strong><span>{projectionOpen ? 'Conectada' : 'Sin iniciar'}</span></div><span className={projectionOpen ? 'connection on' : 'connection'} /></div></div>
      </aside>

      <main className="main-area">
        <div className="content-heading"><div><div className="eyebrow">ESPACIO DE TRABAJO</div><h1>Presentación actual</h1><p>Organiza y controla el contenido que verá la audiencia.</p></div><button className="primary-button" onClick={importImages}><Plus size={16}/> Importar imágenes</button></div>
        <section className="slides-section">
          <div className="section-heading"><div><h2>Diapositivas</h2><span>{slides.length} elementos</span></div><div className="search-box"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar contenido" /></div></div>
          <div className="slide-grid">
            {filteredSlides.map((slide, index) => <button key={slide.id} className={`slide-card ${activeId === slide.id ? 'selected' : ''} ${liveId === slide.id ? 'on-air' : ''}`} onClick={() => setActiveId(slide.id)}>
              <div className="slide-thumb">
                {slide.kind === 'image' && slide.src ? <img src={slide.src} /> : slide.kind === 'video' ? <div className="thumb-media"><Video size={24}/></div> : <div className="thumb-text">{slide.text?.split('\n').slice(0, 3).join('\n')}</div>}
                {liveId === slide.id && <span className="live-label">EN VIVO</span>}
              </div><div className="slide-meta"><span className="slide-number">{String(index + 1).padStart(2, '0')}</span><span className="slide-title">{slide.title}</span></div>
            </button>)}
            <button className="add-slide" onClick={addSong}><Plus size={22}/><span>Agregar letra</span></button>
          </div>
        </section>

        <section className="preview-section">
          <div className="section-heading"><div><h2>Monitor de control</h2><span>Vista previa y salida en vivo</span></div><div className="monitor-select"><Monitor size={15}/><select value={displayId ?? ''} onChange={e => setDisplayId(Number(e.target.value))}>{displays.map((d, i) => <option key={d.id} value={d.id}>{d.label}{d.primary ? ' (principal)' : ''}</option>)}</select></div></div>
          <div className="monitor-grid">
            <div className="monitor-panel"><div className="panel-label"><span>VISTA PREVIA</span><span className="muted">{activeSlide?.title ?? 'Sin selección'}</span></div><div className="preview-screen">{activeSlide?.kind === 'image' && activeSlide.src ? <img src={activeSlide.src}/> : activeSlide?.kind === 'video' ? <div className="screen-placeholder"><Video size={26}/><span>Video seleccionado</span></div> : <div className="preview-lyrics">{activeSlide?.text ?? 'Selecciona una diapositiva'}</div>}</div></div>
            <div className="monitor-panel"><div className="panel-label"><span>SALIDA EN VIVO</span><span className="live-indicator"><i/> {liveSlide ? 'EN VIVO' : 'SIN PROYECCIÓN'}</span></div><div className="preview-screen live-screen">{liveSlide?.kind === 'image' && liveSlide.src ? <img src={liveSlide.src}/> : liveSlide?.kind === 'video' ? <div className="screen-placeholder"><Video size={26}/><span>Video en reproducción</span></div> : <div className="preview-lyrics">{liveSlide?.text ?? ''}</div>}</div></div>
          </div>
          <div className="control-bar"><div className="transport"><button className="control-button" onClick={() => moveLive(-1)} title="Anterior"><ArrowLeft size={17}/></button><button className="control-button" onClick={() => moveLive(1)} title="Siguiente"><ArrowRight size={17}/></button></div><div className="control-center"><button className="secondary-button" onClick={goBlack}><Square size={13}/> Negro</button><button className="primary-button project-button" onClick={() => activeSlide && broadcast(activeSlide)} disabled={!activeSlide}><Play size={15} fill="currentColor"/> Proyectar selección</button></div><div className="control-right"><button className="secondary-button" onClick={projectionOpen ? () => { void window.naciones.closeProjection(); setProjectionOpen(false); } : openProjection}><MonitorPlay size={15}/>{projectionOpen ? 'Cerrar salida' : 'Iniciar proyección'}</button></div></div>
        </section>
      </main>
      <aside className="inspector"><div className="inspector-title">DETALLES</div>{activeSlide ? <><div className="inspector-preview">{activeSlide.kind === 'image' && activeSlide.src ? <img src={activeSlide.src}/> : <div className="inspector-text">{activeSlide.text ?? <Video size={30}/>}</div>}</div><div className="field-label">NOMBRE</div><div className="field-value">{activeSlide.title}</div><div className="field-label">TIPO DE CONTENIDO</div><div className="field-value type-value">{activeSlide.kind === 'image' ? <Images size={14}/> : activeSlide.kind === 'video' ? <Video size={14}/> : <AudioLines size={14}/>} {activeSlide.kind === 'image' ? 'Imagen' : activeSlide.kind === 'video' ? 'Video' : 'Texto / canción'}</div>{activeSlide.kind === 'text' && <><div className="field-label">TEXTO</div><textarea className="text-editor" value={activeSlide.text ?? ''} onChange={e => setSlides(current => current.map(s => s.id === activeSlide.id ? {...s, text:e.target.value} : s))}/></>}<button className="remove-button" onClick={() => { setSlides(current => current.filter(s => s.id !== activeSlide.id)); setActiveId(null); }}> <X size={14}/> Quitar de presentación</button></> : <div className="empty-inspector">Selecciona una diapositiva para ver sus detalles.</div>}</aside>
    </div>
    <footer className="statusbar"><span><span className="status-dot"/> Aplicación local</span><span>{displays.length} pantalla(s) detectada(s)</span><span>VERSIÓN 0.1.0 · PROTOTIPO</span></footer>
  </div>;
}
