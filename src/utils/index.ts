export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  static info(message: string, ...args: any[]): void {
    console.log(`[${this.formatTimestamp()}] [INFO]`, message, ...args);
  }

  static error(message: string, error?: any): void {
    console.error(`[${this.formatTimestamp()}] [ERROR]`, message, error);
  }

  static warn(message: string, ...args: any[]): void {
    console.warn(`[${this.formatTimestamp()}] [WARN]`, message, ...args);
  }

  static debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.formatTimestamp()}] [DEBUG]`, message, ...args);
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function formatPhoneNumber(phone: string): string {
  const sanitized = sanitizePhoneNumber(phone);
  return `${sanitized}@c.us`;
}

export function parseCommand(message: string, prefix: string): { command: string; args: string[] } | null {
  if (!message.startsWith(prefix)) {
    return null;
  }

  const parts = message.slice(prefix.length).trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  return { command, args };
}
