export interface BotConfig {
  name: string;
  prefix: string;
  autoReconnect: boolean;
}

export interface WebConfig {
  port: number;
  host: string;
}

export interface NvidiaConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

export interface AppConfig {
  bot: BotConfig;
  web: WebConfig;
  nvidia: NvidiaConfig;
  nodeEnv: string;
}

export interface MessageData {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  isFromMe: boolean;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
}

export interface CommandHandler {
  name: string;
  description: string;
  execute: (message: MessageData, args: string[]) => Promise<string>;
}

export interface WebSocketMessage {
  type: 'message' | 'status' | 'qr' | 'ready';
  data: any;
  timestamp: Date;
}

export interface BotStatus {
  isConnected: boolean;
  qrCode?: string | undefined;
  sessionStatus: 'loading' | 'qr' | 'authenticated' | 'ready' | 'disconnected';
}
