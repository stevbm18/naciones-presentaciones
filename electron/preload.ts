import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('naciones', {
  getDisplays: () => ipcRenderer.invoke('display:list'),
  openProjection: (displayId: number) => ipcRenderer.invoke('projection:open', displayId),
  sendToProjection: (payload: ProjectionPayload) => ipcRenderer.send('projection:update', payload),
  closeProjection: () => ipcRenderer.invoke('projection:close'),
  onProjectionUpdate: (callback: (payload: ProjectionPayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ProjectionPayload) => callback(payload);
    ipcRenderer.on('projection:render', listener);
    return () => ipcRenderer.removeListener('projection:render', listener);
  },
  selectImages: () => ipcRenderer.invoke('media:select-images'),
  selectVideo: () => ipcRenderer.invoke('media:select-video')
});

type ProjectionPayload = { type: 'image' | 'text' | 'video' | 'black' | 'clear'; src?: string; text?: string; title?: string };
