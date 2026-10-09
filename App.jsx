let libros = JSON.parse(
  localStorage.getItem("libros") || "[]"
);

function guardarDatos() {
  localStorage.setItem(
    "libros",
    JSON.stringify(libros)
  );
}

async function buscarISBN() {

  const isbn =
    document.getElementById("isbn").value.trim();

  if (!isbn) {
    alert("Introduce un ISBN");
    return;
  }

  try {

    const respuesta =
      await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
      );

    const datos =
      await respuesta.json();

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

    alert("Error buscando ISBN");
  }
}

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
    portada
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

function render() {

  document.getElementById(
    "totalLibros"
  ).textContent = libros.length;

  const contenedor =
    document.getElementById("listaLibros");

  contenedor.innerHTML = "";

  libros.forEach(libro => {

    contenedor.innerHTML += `

      <div class="libro">

        ${
          libro.portada
            ? `${libro.portada}`
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
          <strong>Fecha fin:</strong>
          ${libro.fecha || "-"}
        </p>

        <button
          class="borrar"
          onclick="borrarLibro(${libro.id})"
        >
          Eliminar
        </button>

      </div>

    `;
  });

}

render();
