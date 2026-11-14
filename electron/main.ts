import { app, BrowserWindow, dialog, ipcMain, screen } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let operatorWindow: BrowserWindow | null = null;
let projectionWindow: BrowserWindow | null = null;
let selectedDisplayId: number | null = null;

const isDev = !app.isPackaged;
const appUrl = isDev ? 'http://127.0.0.1:5173' : pathToFileURL(path.join(__dirname, '../dist/index.html')).toString();

function createOperatorWindow() {
  operatorWindow = new BrowserWindow({
    width: 1500, height: 950, minWidth: 1100, minHeight: 700,
    title: 'Naciones Presentaciones', backgroundColor: '#111318',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  void operatorWindow.loadURL(appUrl);
  operatorWindow.on('closed', () => { operatorWindow = null; });
}

function createProjectionWindow(displayId?: number) {
  const displays = screen.getAllDisplays();
  const display = displays.find(d => d.id === displayId) ?? displays.find(d => d.id !== screen.getPrimaryDisplay().id);
  selectedDisplayId = display?.id ?? null;
  const bounds = display?.bounds ?? screen.getPrimaryDisplay().bounds;
  if (projectionWindow) projectionWindow.close();
  projectionWindow = new BrowserWindow({
    x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
    fullscreen: true, frame: false, backgroundColor: '#000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  void projectionWindow.loadURL(`${appUrl}#/projection`);
  projectionWindow.on('closed', () => { projectionWindow = null; });
  return { opened: true, displayId: selectedDisplayId };
}

app.whenReady().then(() => {
  createOperatorWindow();
  ipcMain.handle('display:list', () => screen.getAllDisplays().map((d, index) => ({
    id: d.id, label: d.id === screen.getPrimaryDisplay().id ? 'Pantalla principal' : `Pantalla ${index + 1}`,
    primary: d.id === screen.getPrimaryDisplay().id, bounds: d.bounds, scaleFactor: d.scaleFactor
  })));
  ipcMain.handle('projection:open', (_event, displayId: number) => createProjectionWindow(displayId));
  ipcMain.handle('projection:close', () => { projectionWindow?.close(); projectionWindow = null; return true; });
  ipcMain.on('projection:update', (_event, payload) => projectionWindow?.webContents.send('projection:render', payload));
  ipcMain.handle('media:select-images', async () => {
    const result = await dialog.showOpenDialog(operatorWindow!, {
      title: 'Importar imágenes', properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('media:select-video', async () => {
    const result = await dialog.showOpenDialog(operatorWindow!, {
      title: 'Seleccionar video', properties: ['openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'm4v', 'webm'] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!operatorWindow) createOperatorWindow(); });
