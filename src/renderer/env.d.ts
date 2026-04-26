/// <reference types="vite/client" />

import type { StacherAPI } from '../preload';

declare global {
  interface Window {
    stacher: StacherAPI;
  }
}

export {};
