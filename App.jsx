let libros = JSON.parse(
  localStorage.getItem("libros") || "[]"
);

let lectorISBN = null;

/* =========================
   UTILIDADES ISBN
========================= */

function guardarDatos() {
  localStorage.setItem(
    "libros",
    JSON.stringify(libros)
  );
}

function limpiarISBN(isbn) {
  return isbn.replace(/[-\s]/g, "");
}

function validarISBN10(isbn) {

  if (!/^\d{9}[\dX]$/i.test(isbn)) {
    return false;
  }

  let suma = 0;

  for (let i = 0; i < 9; i++) {
    suma += (i + 1) * parseInt(isbn[i]);
  }

  const ultimo =
    isbn[9].toUpperCase() === "X"
      ? 10
      : parseInt(isbn[9]);

  suma += 10 * ultimo;

  return suma % 11 === 0;
}

function validarISBN13(isbn) {

  if (!/^\d{13}$/.test(isbn)) {
    return false;
  }

  let suma = 0;

  for (let i = 0; i < 12; i++) {

    const numero = parseInt(isbn[i]);

    suma +=
      i % 2 === 0
        ? numero
        : numero * 3;
  }

  const control =
    (10 - (suma % 10)) % 10;

  return control === parseInt(isbn[12]);
}

function validarISBN(isbn) {

  isbn = limpiarISBN(
    isbn.toUpperCase()
  );

  return (
    validarISBN10(isbn) ||
    validarISBN13(isbn)
  );
}

/* =========================
   GOOGLE BOOKS
========================= */

async function buscarISBN() {

  const isbn = limpiarISBN(
    document.getElementById("isbn")
      .value
      .trim()
  );

  if (!isbn) {
    alert("Introduce un ISBN");
    return;
  }

  if (!validarISBN(isbn)) {
    alert("ISBN inválido");
    return;
  }

  try {

    const respuesta = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );

    const datos = await respuesta.json();

    if (!datos.items || !datos.items.length) {

      alert("Libro no encontrado");

      return;
    }

    const libro =
      datos.items[0].volumeInfo;

    document.getElementById("titulo").value =
      libro.title || "";

    document.getElementById("autor").value =
      libro.authors
        ? libro.authors.join(", ")
        : "";

    document.getElementById("paginas").value =
      libro.pageCount || "";

    document.getElementById("genero").value =
      libro.categories
        ? libro.categories.join(", ")
        : "";

    document.getElementById("portada").value =
      libro.imageLinks?.thumbnail || "";

  } catch (error) {

    console.error(error);

    alert(
      "Error consultando Google Books"
    );
  }
}

/* =========================
   ESCÁNER ISBN
========================= */

function iniciarEscaner() {

  const reader =
    document.getElementById("reader");

  reader.style.display = "block";

  lectorISBN =
    new Html5Qrcode("reader");

  lectorISBN.start(
    {
      facingMode: "environment"
    },
    {
      fps: 10,
      qrbox: 250
    },
    (codigoLeido) => {

      document.getElementById(
        "isbn"
      ).value = codigoLeido;

      lectorISBN
        .stop()
        .then(() => {

          reader.innerHTML = "";

          buscarISBN();

        });

    },
    () => {}
  )
  .catch(error => {

    console.error(error);

    alert(
      "No se pudo abrir la cámara"
    );

  });
}

/* =========================
   LIBROS
========================= */

function agregarLibro() {

  const titulo =
    document.getElementById("titulo").value;

  const autor =
    document.getElementById("autor").value;

  const isbn =
    document.getElementById("isbn").value;

  const fecha =
    document.getElementById("fecha").value;

  const paginas =
    document.getElementById("paginas").value;

  const genero =
    document.getElementById("genero").value;

  const portada =
    document.getElementById("portada").value;

  const estado =
    document.getElementById("estado").value;

  if (!titulo.trim()) {

    alert("Introduce un título");

    return;
  }

  libros.unshift({

    id: Date.now(),

    titulo,
    autor,
    isbn,

    fecha,

    paginas,

    genero,

    portada,

    estado

  });

  guardarDatos();

  document.getElementById("titulo").value = "";
  document.getElementById("autor").value = "";
  document.getElementById("isbn").value = "";
  document.getElementById("fecha").value = "";
  document.getElementById("paginas").value = "";
  document.getElementById("genero").value = "";
  document.getElementById("portada").value = "";

  render();
}

function borrarLibro(id) {

  libros = libros.filter(
    libro => libro.id !== id
  );

  guardarDatos();

  render();
}

/* =========================
   ESTADÍSTICAS
========================= */

function actualizarEstadisticas() {

  document.getElementById(
    "totalLibros"
  ).textContent = libros.length;

  const totalPaginas =
    libros.reduce(
      (total, libro) =>
        total +
        (Number(libro.paginas) || 0),
      0
    );

  const paginasElemento =
    document.getElementById(
      "totalPaginas"
    );

  if (paginasElemento) {

    paginasElemento.textContent =
      totalPaginas.toLocaleString(
        "es-ES"
      );
  }

  const generos = {};
  const autores = {};

  libros.forEach(libro => {

    if (libro.genero) {

      generos[libro.genero] =
        (generos[libro.genero] || 0) + 1;
    }

    if (libro.autor) {

      autores[libro.autor] =
        (autores[libro.autor] || 0) + 1;
    }

  });

  const generoFavorito =
    Object.keys(generos).length
      ? Object.keys(generos)
          .sort(
            (a,b) =>
              generos[b] - generos[a]
          )[0]
      : "-";

  const autorFavorito =
    Object.keys(autores).length
      ? Object.keys(autores)
          .sort(
            (a,b) =>
              autores[b] - autores[a]
          )[0]
      : "-";

  const generoElemento =
    document.getElementById(
      "generoFavorito"
    );

  const autorElemento =
    document.getElementById(
      "autorFavorito"
    );

  if (generoElemento) {
    generoElemento.textContent =
      generoFavorito;
  }

  if (autorElemento) {
    autorElemento.textContent =
      autorFavorito;
  }
}

/* =========================
   RENDER
========================= */

function render() {

  actualizarEstadisticas();

  const contenedor =
    document.getElementById(
      "listaLibros"
    );

  contenedor.innerHTML = "";

  libros.forEach(libro => {

    contenedor.innerHTML += `

      <div class="libro">

        ${
          libro.portada
          ? `
            ${libro.portada}
          `
          : ""
        }

        <h3>${libro.titulo}</h3>

        <p>
          <strong>Autor:</strong>
          ${libro.autor || "-"}
        </p>

        <p>
          <strong>ISBN:</strong>
          ${libro.isbn || "-"}
        </p>

        <p>
          <strong>Páginas:</strong>
          ${libro.paginas || "-"}
        </p>

        <p>
          <strong>Género:</strong>
          ${libro.genero || "-"}
        </p>

        <p>
          <strong>Fecha:</strong>
          ${libro.fecha || "-"}
        </p>

        <p>
          <span
            
