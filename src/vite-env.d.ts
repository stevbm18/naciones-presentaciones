/// <reference types="vite/client" />
interface ProjectionPayload { type: 'image' | 'text' | 'video' | 'black' | 'clear'; src?: string; text?: string; title?: string }
interface Window {
  naciones: {
    getDisplays: () => Promise<Array<{id:number;label:string;primary:boolean;bounds:{x:number;y:number;width:number;height:number};scaleFactor:number}>>;
    openProjection: (displayId:number) => Promise<{opened:boolean;displayId:number|null}>;
    sendToProjection: (payload:ProjectionPayload) => void;
    closeProjection: () => Promise<boolean>;
    onProjectionUpdate: (callback:(payload:ProjectionPayload)=>void) => () => void;
    selectImages: () => Promise<string[]>;
    selectVideo: () => Promise<string|null>;
  }
}
