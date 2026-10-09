let libros = JSON.parse(
  localStorage.getItem("libros") || "[]"
);

function guardarDatos() {
  localStorage.setItem(
    "libros",
    JSON.stringify(libros)
  );
}

function agregarLibro() {
  const titulo = document.getElementById("titulo").value;
  const autor = document.getElementById("autor").value;
  const isbn = document.getElementById("isbn").value;
  const fecha = document.getElementById("fecha").value;

  if (!titulo.trim()) {
    alert("Introduce un título");
    return;
  }

  libros.unshift({
    id: Date.now(),
    titulo,
    autor,
    isbn,
    fecha
  });

  guardarDatos();

  document.getElementById("titulo").value = "";
  document.getElementById("autor").value = "";
  document.getElementById("isbn").value = "";
  document.getElementById("fecha").value = "";

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
