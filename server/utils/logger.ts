import { createConsola, ConsolaInstance } from 'consola';

// Extended logger with additional formatting methods
export class EnhancedLogger {
  private consola: ConsolaInstance;

  constructor(consola: ConsolaInstance) {
    this.consola = consola;
  }

  // Standard logging methods that pass through to consola
  log(...args: any[]) { return this.consola.log(...args); }
  info(...args: any[]) { return this.consola.info(...args); }
  start(...args: any[]) { return this.consola.start(...args); }
  success(...args: any[]) { return this.consola.success(...args); }
  ready(...args: any[]) { return this.consola.ready(...args); }
  debug(...args: any[]) { return this.consola.debug(...args); }
  warn(...args: any[]) { return this.consola.warn(...args); }
  error(...args: any[]) { return this.consola.error(...args); }
  fatal(...args: any[]) { return this.consola.fatal(...args); }

  // Enhanced methods
  section(title: string) {
    this.consola.log('\n' + '━'.repeat(80) + '\n' + `  ${title.toUpperCase()}  ` + '\n' + '━'.repeat(80));
  }

  // Create distinct visual groups
  startGroup(title: string) {
    this.consola.log('\n▶ ' + title + ' ▶');
  }

  endGroup(summary?: string) {
    if (summary) {
      this.consola.log('◀ ' + summary + ' ◀\n');
    } else {
      this.consola.log('◀ Completed ◀\n');
    }
  }

  // Status updates with clearer formatting
  step(message: string) {
    this.consola.info('→ ' + message);
  }
  
  result(message: string) {
    this.consola.success('✓ ' + message);
  }
}

// Create a configured consola instance
const consolaInstance = createConsola({
  // Default log level - can be adjusted via env variables
  level: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : 3, // Lower default level to reduce noise
  // Enable fancy reporter in development
  formatOptions: {
    date: true,
    colors: true,
    compact: false,
  },
});

// Create and export enhanced logger
export const logger = new EnhancedLogger(consolaInstance);

// Export as default 
export default logger;