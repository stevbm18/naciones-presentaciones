# Naciones Presentaciones

Aplicación de escritorio para Windows para controlar presentaciones multimedia de Iglesia Naciones.

## Stack

- Electron + React + TypeScript + Vite
- Dos ventanas independientes: operador y salida de proyección
- SQLite se integrará en la siguiente etapa para persistencia local

## Requisitos

- Windows 10/11 (x64)
- Node.js 20 o superior
- npm

## Desarrollo

```bash
npm install
npm run dev
```

## Crear instalador de Windows

```bash
npm run dist:win
```

El instalador NSIS se generará en `release/`.

## Estado actual — 0.1.0

- Interfaz inicial del operador.
- Detección de pantallas conectadas.
- Ventana de proyección independiente en el monitor seleccionado.
- Importación de imágenes PNG/JPG/WebP.
- Diapositivas de texto editables dentro del inspector.
- Controles básicos: proyectar selección, anterior, siguiente y negro.

## Próximos pasos

- Persistencia en SQLite y biblioteca multimedia administrable.
- Editor de canciones con secciones (estrofa, coro, puente) y generación automática de slides.
- Reproducción de video con audio y controles.
- Playlists y guardado de servicios.
- Copias de seguridad y pruebas de estabilidad en múltiples resoluciones.

## Nota

La primera versión es un prototipo funcional de la interfaz y el flujo de proyección. El almacenamiento persistente, el reproductor multimedia avanzado y el editor de canciones completo aún están pendientes.
