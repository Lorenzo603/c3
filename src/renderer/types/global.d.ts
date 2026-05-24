import type { C3DesktopApi } from '../../shared/process';

declare global {
  interface Window {
    c3Desktop?: C3DesktopApi;
  }
}

export {};
