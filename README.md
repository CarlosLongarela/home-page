# Home Page - Página de Inicio para el Navegador

Aplicación de página de inicio para el navegador que muestra enlaces organizados por categorías en tarjetas visuales. Los datos se leen de un archivo markdown (`bookmarks.md`), lo que permite personalizar los enlaces sin tocar el código.

## Características

- **Configuración vía Markdown** - Los enlaces se definen en `bookmarks.md`, sin necesidad de editar HTML ni JS
- **Tema claro/oscuro** - Toggle manual y detección automática de la preferencia del sistema, con persistencia en `localStorage`
- **Paletas de color** - 4 esquemas de color (Oceano, Rosa, Bosque, Atardecer) seleccionables desde el header
- **Enlace de edición** - El pie de página enlaza directamente al archivo `bookmarks.md` en GitHub (configurable)
- **Búsqueda en tiempo real** - Filtra enlaces por nombre o URL. Atajo `/` para enfocar el buscador, `Escape` para limpiar
- **Diseño responsive** - Grid adaptable a cualquier tamaño de pantalla
- **Favicons automáticos** - Muestra el icono de cada sitio web
- **Reloj en vivo** - Hora actual en la esquina inferior derecha
- **Animaciones suaves** - Entrada escalonada de tarjetas, con respeto a `prefers-reduced-motion`
- **Sin frameworks** - HTML, CSS y JS vanilla. Sin dependencias externas

## CSS Moderno

La hoja de estilos utiliza funcionalidades modernas de CSS:

- Custom properties (variables) para todo el sistema de diseño
- `color-mix()` para mezclas de color dinámicas
- `backdrop-filter` para efecto glass en el header
- Container queries para adaptar el contenido de cada tarjeta
- `clamp()` para tipografía fluida
- `100dvh` para viewport dinámico en móviles

## Uso

La página necesita servirse a través de un servidor HTTP porque usa `fetch()` para leer el archivo markdown.

```bash
# Con Python
python3 -m http.server 8080

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8080
```

Después abre `http://localhost:8080` en el navegador y configúralo como página de inicio.

## Configuración de `bookmarks.md`

El archivo `bookmarks.md` sigue este formato:

```markdown
# Título de la Página
<!-- edit_url: https://github.com/tu-usuario/tu-repo/edit/main/bookmarks.md -->

## Nombre de la Sección
<!-- color: #6366f1 -->
- [Nombre del enlace](https://url.com)
- [Otro enlace](https://otra-url.com)

## Otra Sección
<!-- color: #ec4899 -->
- [Enlace](https://ejemplo.com)
```

### Elementos

| Elemento | Sintaxis | Descripción |
|---|---|---|
| Título de página | `# Título` | Heading H1. Define el título principal que aparece en el header y en la pestaña del navegador |
| URL de edición | `<!-- edit_url: URL -->` | Comentario HTML después del H1. Enlaza `bookmarks.md` en el footer a esa URL (ej. editar en GitHub). Opcional |
| Sección | `## Nombre` | Heading H2. Crea una nueva tarjeta/recuadro |
| Color | `<!-- color: #hex -->` | Comentario HTML justo después del H2. Define el color de la tarjeta. Si se omite, usa `#6366f1` por defecto |
| Enlace | `- [Texto](URL)` | Elemento de lista con enlace markdown. Cada uno aparece como una fila dentro de la tarjeta |

### Ejemplo mínimo

```markdown
# Mi Inicio

## Trabajo
<!-- color: #10b981 -->
- [Gmail](https://mail.google.com)
- [Calendar](https://calendar.google.com)

## Redes
- [Twitter](https://twitter.com)
- [Reddit](https://reddit.com)
```

## Estructura de archivos

```
home-page/
├── index.html       # Estructura HTML
├── styles.css       # Estilos con CSS moderno
├── app.js           # Parser de markdown y lógica de la aplicación
├── bookmarks.md     # Datos de enlaces (edita este archivo)
├── LICENSE
└── README.md
```

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `/` | Enfocar el buscador |
| `Escape` | Limpiar búsqueda y desenfocar |
