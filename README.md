# Entre páginas — Mi biblioteca lectora

Aplicación web para organizar libros, registrar fechas de lectura y completar metadatos a partir de un ISBN.

## Funciones

- Añadir, editar, filtrar y eliminar libros.
- Escanear códigos ISBN con la cámara (usa `@zxing/browser`).
- Consultar metadatos en Google Books y Open Library.
- Buscar una referencia en Wikipedia.
- Registrar estado, fechas de inicio y fin, páginas, género, valoración y notas.
- Guardar la biblioteca en el navegador con `localStorage`.
- Importar y exportar la biblioteca como JSON.
- Diseño adaptable a móvil y escritorio; manifiesto PWA y service worker básico.

## Requisitos

- Node.js 20 o superior recomendado.
- Un navegador moderno.
- Para escanear con la cámara, servir la app en `localhost` durante el desarrollo o mediante HTTPS en producción, y aceptar el permiso de cámara.

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre la URL local que indique Vite.

## Compilar

```bash
npm run build
npm run preview
```

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube estos archivos.
2. En `vite.config.js`, define `base` con el nombre de tu repositorio si la web se publicará en `https://usuario.github.io/nombre-repo/`.
3. Añade un flujo de GitHub Actions que ejecute `npm ci`, `npm run build` y publique la carpeta `dist`.
4. Activa Pages desde **Settings → Pages → GitHub Actions**.

Nota: si publicas en una ruta de repositorio, ajusta también las rutas del manifiesto y del service worker para que respeten esa base. Para un despliegue de GitHub Pages más robusto, añade `vite.config.js` y el workflow incluidos en las instrucciones siguientes.

## APIs utilizadas

- Google Books: `https://www.googleapis.com/books/v1/volumes?q=isbn:...`
- Open Library ISBN: `https://openlibrary.org/isbn/{ISBN}.json`
- Wikipedia en español: API de MediaWiki.

La disponibilidad y calidad de los metadatos depende de la edición y de cada fuente. Los géneros son categorías editoriales y no siempre están presentes o normalizados.

## Privacidad y límites

Esta versión guarda los datos en el navegador actual. No hay cuentas ni sincronización entre dispositivos: exporta el JSON para hacer una copia de seguridad o migrar la biblioteca. No se envían tus notas personales a las APIs; las consultas externas buscan únicamente los datos bibliográficos.
