import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BookOpen, Plus, Search, ScanLine, LibraryBig, CalendarDays, Star, Trash2, Pencil, X, Check, Download, Upload, Sparkles } from "lucide-react";

const STORAGE_KEY = "entre-paginas-books-v1";
const blankBook = {
  title: "", authors: "", isbn: "", publisher: "", publishedDate: "",
  pageCount: "", categories: "", thumbnail: "", status: "leyendo",
  startDate: "", finishDate: "", rating: 0, notes: ""
};

function readBooks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function cleanISBN(value) { return (value || "").replace(/[^0-9Xx]/g, "").toUpperCase(); }
function first(...values) { return values.find(v => v !== undefined && v !== null && v !== ""); }

async function fetchBookByISBN(rawISBN) {
  const isbn = cleanISBN(rawISBN);
  if (!isbn) throw new Error("Introduce un ISBN válido.");
  let google = null, openLibrary = null;
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`);
    const data = await res.json();
    google = data.items?.[0]?.volumeInfo || null;
  } catch {}
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
    if (res.ok) openLibrary = await res.json();
  } catch {}
  if (!google && !openLibrary) throw new Error("No encontramos ese ISBN. Puedes introducir los datos manualmente.");
  const olAuthors = Array.isArray(openLibrary?.authors) ? openLibrary.authors.map(a => a.name).filter(Boolean) : [];
  const authors = first(google?.authors?.join(", "), olAuthors.join(", "), "");
  const cover = first(
    google?.imageLinks?.thumbnail?.replace("http://", "https://"),
    `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
    ""
  );
  return {
    ...blankBook,
    title: first(google?.title, openLibrary?.title, ""),
    authors,
    isbn,
    publisher: first(google?.publisher, openLibrary?.publishers?.join(", "), ""),
    publishedDate: first(google?.publishedDate, openLibrary?.publish_date, ""),
    pageCount: first(google?.pageCount, openLibrary?.number_of_pages, ""),
    categories: first(google?.categories?.join(", "), openLibrary?.subjects?.slice(0, 4).join(", "), ""),
    thumbnail: cover,
    source: [google && "Google Books", openLibrary && "Open Library"].filter(Boolean).join(" + ")
  };
}

async function lookupWikipedia(title, authors) {
  const query = `${title} ${authors}`.trim();
  if (!query) return "";
  try {
    const url = `https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=0&gsrlimit=1&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json&origin=*`;
    const response = await fetch(url);
    const data = await response.json();
    const page = Object.values(data.query?.pages || {})[0];
    if (page?.extract) return `Wikipedia: ${page.extract.slice(0, 700)}${page.extract.length > 700 ? "…" : ""}\n${page.fullurl || ""}`;
  } catch {}
  return "";
}

function App() {
  const [books, setBooks] = useState(readBooks);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(blankBook);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [wikiText, setWikiText] = useState("");
  const [selected, setSelected] = useState(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(books)); }, [books]);
  useEffect(() => () => { try { controlsRef.current?.stop(); readerRef.current?.reset(); } catch {} }, []);

  const visibleBooks = useMemo(() => books.filter(book => {
    const text = `${book.title} ${book.authors} ${book.isbn} ${book.categories}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === "todos" || book.status === filter);
  }), [books, query, filter]);

  const finished = books.filter(b => b.status === "terminado").length;
  const pages = books.filter(b => b.status === "terminado").reduce((sum, b) => sum + (Number(b.pageCount) || 0), 0);

  function startAdd() {
    setDraft({ ...blankBook, startDate: new Date().toISOString().slice(0, 10) });
    setEditingId(null); setWikiText(""); setShowForm(true); setMessage("");
  }
  function startEdit(book) {
    setDraft({ ...blankBook, ...book });
    setEditingId(book.id); setWikiText(book.wikipedia || ""); setShowForm(true); setMessage("");
  }
  function change(field, value) { setDraft(prev => ({ ...prev, [field]: value })); }

  async function searchISBN(value = draft.isbn) {
    setBusy(true); setMessage("Buscando datos en Google Books y Open Library…");
    try {
      const found = await fetchBookByISBN(value);
      setDraft(prev => ({ ...prev, ...found, status: prev.status || "leyendo" }));
      setMessage(`Datos encontrados${found.source ? ` (${found.source})` : ""}. Revisa los campos antes de guardar.`);
    } catch (error) { setMessage(error.message || "No se pudo consultar el ISBN."); }
    finally { setBusy(false); }
  }

  async function findWiki() {
    setBusy(true); setMessage("Buscando referencia en Wikipedia…");
    const result = await lookupWikipedia(draft.title, draft.authors);
    setWikiText(result);
    setMessage(result ? "Referencia de Wikipedia encontrada." : "No encontramos una entrada clara en Wikipedia.");
    setBusy(false);
  }

  async function openScanner() {
    setScanOpen(true); setMessage("Solicitando acceso a la cámara…");
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const deviceId = devices.find(d => /back|rear|trasera|environment/i.test(d.label))?.deviceId || devices[0]?.deviceId;
      if (!deviceId) throw new Error("No se encontró una cámara. Comprueba los permisos del navegador.");
      controlsRef.current = await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
        if (result?.getText()) {
          const isbn = cleanISBN(result.getText());
          if (isbn.length === 10 || isbn.length === 13) {
            controlsRef.current?.stop();
            setScanOpen(false);
            change("isbn", isbn);
            searchISBN(isbn);
          }
        }
      });
      setMessage("Apunta al código de barras del ISBN.");
    } catch (error) {
      setMessage(error.message || "No se pudo abrir la cámara. Usa HTTPS y permite el acceso.");
    }
  }
  function closeScanner() {
    try { controlsRef.current?.stop(); readerRef.current?.reset(); } catch {}
    setScanOpen(false);
  }

  function saveBook(event) {
    event.preventDefault();
    if (!draft.title.trim()) { setMessage("El título es obligatorio."); return; }
    const book = { ...draft, id: editingId || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`), pageCount: draft.pageCount === "" ? "" : Number(draft.pageCount), wikipedia: wikiText };
    setBooks(prev => editingId ? prev.map(b => b.id === editingId ? book : b) : [book, ...prev]);
    setShowForm(false); setMessage(""); setSelected(book);
  }
  function removeBook(id) {
    if (confirm("¿Quieres eliminar este libro de tu biblioteca?")) {
      setBooks(prev => prev.filter(b => b.id !== id));
      if (selected?.id === id) setSelected(null);
    }
  }
  function exportBooks() {
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mi-biblioteca.json"; a.click();
    URL.revokeObjectURL(url);
  }
  function importBooks(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error();
        setBooks(prev => [...data, ...prev.filter(old => !data.some(item => item.id === old.id))]);
        setMessage(`Importados ${data.length} libros.`);
      } catch { setMessage("El archivo no tiene un formato de biblioteca válido."); }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="Entre páginas inicio"><span className="brand-icon"><BookOpen size={22}/></span><span>entre páginas<small>tu diario de lectura</small></span></a>
      <div className="top-actions">
        <button className="button secondary desktop" onClick={exportBooks}><Download size={16}/> Exportar</button>
        <button className="button secondary desktop" onClick={() => fileRef.current?.click()}><Upload size={16}/> Importar</button>
        <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={importBooks}/>
        <button className="button primary" onClick={startAdd}><Plus size={17}/> Añadir libro</button>
      </div>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={14}/> TU RINCÓN LECTOR</span>
          <h1>Cada libro deja<br/><em>una huella.</em></h1>
          <p>Guarda tus historias favoritas, sigue tu progreso y descubre cuánto has leído.</p>
          <button className="button dark" onClick={startAdd}><Plus size={17}/> Añadir una lectura</button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun"></div><div className="plant plant-one"></div><div className="book-stack"><div className="book book-a"></div><div className="book book-b"></div><div className="book book-c"></div><div className="book book-d"></div></div>
          <div className="art-label">un capítulo más <span>✳</span></div>
        </div>
      </section>

      <section className="stats">
        <div className="stat"><span className="stat-icon peach"><BookOpen size={18}/></span><div><strong>{books.length}</strong><span>Libros en tu biblioteca</span></div></div>
        <div className="stat"><span className="stat-icon green"><Check size={18}/></span><div><strong>{finished}</strong><span>Libros terminados</span></div></div>
        <div className="stat"><span className="stat-icon lavender"><LibraryBig size={18}/></span><div><strong>{pages.toLocaleString("es-ES")}</strong><span>Páginas leídas</span></div></div>
      </section>

      <section className="library-section">
        <div className="section-heading"><div><span className="eyebrow">TU COLECCIÓN</span><h2>Mi biblioteca <span className="count">{books.length}</span></h2></div>
          <div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar título, autor…"/></div>
        </div>
        <div className="filters">
          {[["todos","Todos"],["leyendo","Leyendo"],["terminado","Terminados"],["pendiente","Por leer"]].map(([value,label]) => <button key={value} className={`filter ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)}>{label}</button>)}
        </div>
        {message && !showForm && <p className="notice">{message}</p>}
        {visibleBooks.length === 0 ? <div className="empty-state"><div className="empty-icon"><BookOpen size={30}/></div><h3>{books.length ? "No hay libros con ese filtro" : "Tu próxima historia empieza aquí"}</h3><p>{books.length ? "Prueba otra búsqueda o cambia el filtro." : "Añade un libro manualmente o escanea su ISBN para completar sus datos."}</p>{!books.length && <button className="button primary" onClick={startAdd}><Plus size={17}/> Añadir mi primer libro</button>}</div> :
          <div className="book-grid">{visibleBooks.map(book => <article className="book-card" key={book.id}>
            <button className="cover-button" onClick={() => setSelected(book)} aria-label={`Ver ${book.title}`}>
              {book.thumbnail ? <img className="cover" src={book.thumbnail} alt={`Portada de ${book.title}`} onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "grid"; }}/> : null}
              <div className="cover-placeholder" style={{ display: book.thumbnail ? "none" : "grid" }}><BookOpen size={29}/><span>{book.title}</span></div>
              <span className={`status status-${book.status}`}>{book.status === "terminado" ? "Terminado" : book.status === "leyendo" ? "Leyendo" : "Por leer"}</span>
            </button>
            <div className="book-info"><button className="title-button" onClick={() => setSelected(book)}>{book.title}</button><p>{book.authors || "Autor desconocido"}</p>
              <div className="book-meta">{book.pageCount ? <span>{book.pageCount} págs.</span> : null}{book.categories ? <span className="genre">{book.categories.split(",")[0]}</span> : null}</div>
              {book.finishDate && <div className="finish-date"><CalendarDays size={13}/> {book.finishDate}</div>}
              <div className="card-actions"><button onClick={() => startEdit(book)} aria-label="Editar"><Pencil size={15}/> Editar</button><button onClick={() => removeBook(book.id)} aria-label="Eliminar"><Trash2 size={15}/></button></div>
            </div>
          </article>)}</div>
        }
      </section>
      <footer><BookOpen size={16}/> <span>Hecho para quienes siempre tienen un libro entre manos.</span><span className="footer-right">Tus datos se guardan en este dispositivo.</span></footer>
    </main>

    {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <div className="modal-header"><div><span className="eyebrow">{editingId ? "ACTUALIZA TU FICHA" : "NUEVA LECTURA"}</span><h2 id="form-title">{editingId ? "Editar libro" : "Añadir un libro"}</h2></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Cerrar"><X/></button></div>
        {message && <p className="notice">{message}</p>}
        <div className="isbn-row"><label className="field grow"><span>ISBN</span><input value={draft.isbn} onChange={e => change("isbn", e.target.value)} placeholder="Ej. 9788401352836"/></label><button className="button secondary scan-button" onClick={openScanner}><ScanLine size={17}/> Escanear</button><button className="button secondary lookup-button" disabled={busy || !draft.isbn} onClick={() => searchISBN()}>{busy ? "Buscando…" : "Buscar ISBN"}</button></div>
        <form onSubmit={saveBook}>
          <div className="form-grid">
            <label className="field full"><span>Título *</span><input required value={draft.title} onChange={e => change("title", e.target.value)} placeholder="Título del libro"/></label>
            <label className="field full"><span>Autor / autora</span><input value={draft.authors} onChange={e => change("authors", e.target.value)} placeholder="Nombre del autor"/></label>
            <label className="field"><span>Editorial</span><input value={draft.publisher} onChange={e => change("publisher", e.target.value)} placeholder="Editorial"/></label>
            <label className="field"><span>Año de publicación</span><input value={draft.publishedDate} onChange={e => change("publishedDate", e.target.value)} placeholder="2024"/></label>
            <label className="field"><span>Número de páginas</span><input type="number" min="0" value={draft.pageCount} onChange={e => change("pageCount", e.target.value)} placeholder="320"/></label>
            <label className="field"><span>Género / categorías</span><input value={draft.categories} onChange={e => change("categories", e.target.value)} placeholder="Fantasía, novela…"/></label>
            <label className="field"><span>Estado</span><select value={draft.status} onChange={e => change("status", e.target.value)}><option value="pendiente">Por leer</option><option value="leyendo">Leyendo</option><option value="terminado">Terminado</option></select></label>
            <label className="field"><span>Fecha de inicio</span><input type="date" value={draft.startDate} onChange={e => change("startDate", e.target.value)}/></label>
            <label className="field"><span>Fecha de fin de lectura</span><input type="date" value={draft.finishDate} onChange={e => { change("finishDate", e.target.value); if (e.target.value) change("status", "terminado"); }}/></label>
            <label className="field"><span>Valoración</span><div className="stars">{[1,2,3,4,5].map(n => <button type="button" key={n} onClick={() => change("rating", n)} className={n <= Number(draft.rating) ? "star selected" : "star"} aria-label={`${n} estrellas`}><Star size={21} fill={n <= Number(draft.rating) ? "currentColor" : "none"}/></button>)}</div></label>
            <label className="field full"><span>Notas o reseña personal</span><textarea rows="3" value={draft.notes} onChange={e => change("notes", e.target.value)} placeholder="¿Qué te ha parecido? ¿Qué quieres recordar?"/></label>
          </div>
          <div className="enrichment"><button type="button" className="text-button" disabled={busy || !draft.title} onClick={findWiki}><Sparkles size={15}/> {busy ? "Consultando…" : "Buscar referencia en Wikipedia"}</button>{wikiText && <p className="wiki-result">{wikiText}</p>}</div>
          <div className="modal-footer"><button type="button" className="button secondary" onClick={() => setShowForm(false)}>Cancelar</button><button className="button primary" type="submit"><Check size={17}/> Guardar libro</button></div>
        </form>
      </section>
    </div>}

    {scanOpen && <div className="modal-backdrop scan-backdrop"><section className="modal scan-modal" role="dialog" aria-modal="true"><div className="modal-header"><div><span className="eyebrow">ESCÁNER ISBN</span><h2>Enfoca el código de barras</h2></div><button className="icon-button" onClick={closeScanner}><X/></button></div><video ref={videoRef} className="scanner-video" muted playsInline/><p className="muted">Coloca el código de barras dentro del encuadre. Si la cámara no se abre, comprueba los permisos del navegador y que estés usando HTTPS.</p><button className="button secondary full-button" onClick={closeScanner}>Cancelar escaneo</button></section></div>}

    {selected && !showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}><section className="modal detail-modal" role="dialog" aria-modal="true"><div className="modal-header"><span className="eyebrow">FICHA DE LECTURA</span><button className="icon-button" onClick={() => setSelected(null)}><X/></button></div><div className="detail-content">{selected.thumbnail ? <img className="detail-cover" src={selected.thumbnail} alt="Portada"/> : <div className="detail-cover cover-placeholder"><BookOpen/></div>}<div className="detail-copy"><h2>{selected.title}</h2><p className="detail-author">{selected.authors || "Autor desconocido"}</p><span className={`status status-${selected.status}`}>{selected.status === "terminado" ? "Terminado" : selected.status === "leyendo" ? "Leyendo" : "Por leer"}</span><div className="detail-facts">{selected.pageCount && <span>{selected.pageCount} páginas</span>}{selected.categories && <span>{selected.categories}</span>}{selected.publisher && <span>{selected.publisher}</span>}{selected.publishedDate && <span>{selected.publishedDate}</span>}{selected.isbn && <span>ISBN: {selected.isbn}</span>}{selected.startDate && <span>Inicio: {selected.startDate}</span>}{selected.finishDate && <span>Fin: {selected.finishDate}</span>}</div>{selected.rating > 0 && <p className="detail-rating">{"★".repeat(selected.rating)}{"☆".repeat(5-selected.rating)}</p>}</div></div>{selected.notes && <div className="detail-notes"><strong>Mis notas</strong><p>{selected.notes}</p></div>}{selected.wikipedia && <div className="detail-notes"><strong>Referencia de Wikipedia</strong><p>{selected.wikipedia}</p></div>}<div className="modal-footer"><button className="button secondary" onClick={() => { setSelected(null); startEdit(selected); }}><Pencil size={16}/> Editar ficha</button><button className="button primary" onClick={() => setSelected(null)}>Cerrar</button></div></section></div>}
  </div>;
}

export default App;
