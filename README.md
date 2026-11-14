# Naciones Presentaciones — prototipo web V1

Este proyecto es una primera versión web local-first para probar el flujo de operador y proyección.

## Qué incluye
- Importar imágenes PNG/JPG/WebP y videos MP4/WebM.
- Guardar los archivos en IndexedDB del navegador (no se suben a un servidor).
- Crear canciones y dividir sus letras en diapositivas usando líneas en blanco.
- Vista de diapositivas, vista previa y controles anterior/siguiente.
- Ventana independiente de proyección.
- Pantalla negra (tecla B) y navegación (flechas).
- Service Worker para cachear la interfaz después de la primera visita.

## Cómo probarlo sin programar
Para que funcionen las ventanas de proyección, el almacenamiento y el modo offline, la página debe servirse desde HTTPS o localhost. No abras `index.html` con doble clic.

La forma más sencilla de publicarlo es subir estos archivos a un repositorio de GitHub y activar GitHub Pages:
1. Sube el contenido de esta carpeta a la raíz del repositorio.
2. En GitHub abre Settings → Pages.
3. En Build and deployment elige Deploy from a branch.
4. Selecciona `main` y `/ (root)`, guarda.
5. GitHub generará un enlace HTTPS para abrir la plataforma.

## Importante
- Es un prototipo inicial; todavía no es una versión de producción ni un reemplazo completo de ProPresenter.
- La proyección usa una ventana emergente del navegador. Permite pop-ups para el sitio y mueve esa ventana a la segunda pantalla.
- El video se reproduce en la ventana de proyección; la reproducción automática puede requerir un clic inicial según el navegador.
- Los datos quedan en el perfil local del navegador y equipo. No borres los datos del sitio sin exportar/respaldar primero.
- La primera visita requiere internet para cargar la página. Después de instalar el Service Worker, la interfaz puede abrirse offline; los archivos importados ya están locales.
- La compatibilidad de la segunda pantalla y reproducción de video/audio debe probarse en la computadora de la iglesia.

## V1.1 — mejoras de flujo y proyección
- Las imágenes y videos importados se agregan automáticamente al final de la presentación y quedan seleccionados.
- Se agregó un apartado independiente para Videos.
- Se agregó transición Fade configurable entre 0 y 2,000 ms, en pasos de 100 ms. La preferencia se conserva en ese navegador.
- Las imágenes pueden fijarse desde la biblioteca y aparecen como accesos rápidos en la franja inferior de Presentación.
