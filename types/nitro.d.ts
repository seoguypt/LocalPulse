import type { NitroApp } from 'nitropack';
import { Camoufox } from 'camoufox-js';

declare module 'nitropack' {
  interface NitroApp {
    browser: Awaited<ReturnType<typeof Camoufox>>;
  }
}
