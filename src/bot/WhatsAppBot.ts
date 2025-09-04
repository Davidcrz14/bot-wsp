import { EventEmitter } from 'events';
import QRCode from 'qrcode-terminal';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { NvidiaGPTService } from '../gpt';
import { BotConfig, BotStatus, CommandHandler, MessageData } from '../types';
import { Logger, parseCommand } from '../utils';
import { aiCommand, helpCommand, infoCommand, pingCommand } from './commands';

export class WhatsAppBot extends EventEmitter {
  private client: Client;
  private config: BotConfig;
  private gptService: NvidiaGPTService;
  private commands: Map<string, CommandHandler>;
  private status: BotStatus;

  // Sistema de agrupación de mensajes
  private messageQueue: Map<string, {
    messages: string[];
    lastMessageTime: number;
    timeout?: NodeJS.Timeout | undefined;
  }>;
  private readonly MESSAGE_WAIT_TIME = 3000; // 3 segundos de espera
  private readonly MAX_QUEUE_SIZE = 5; // Máximo 5 mensajes en cola

  constructor(config: BotConfig, gptService: NvidiaGPTService) {
    super();
    this.config = config;
    this.gptService = gptService;
    this.commands = new Map();
    this.messageQueue = new Map();
    this.status = {
      isConnected: false,
      sessionStatus: 'loading'
    };

    // Inicializar cliente de WhatsApp
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    this.setupCommands();
    this.setupEventHandlers();
    this.startQueueCleanup();
  }

  private startQueueCleanup(): void {
    // Limpiar colas antiguas cada 5 minutos
    setInterval(() => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000;

      this.messageQueue.forEach((queue, userId) => {
        if (now - queue.lastMessageTime > maxAge) {
          if (queue.timeout) {
            clearTimeout(queue.timeout);
          }
          this.messageQueue.delete(userId);
        }
      });
    }, 5 * 60 * 1000);
  }

  private setupCommands(): void {
    this.commands.set(pingCommand.name, pingCommand);
    this.commands.set(helpCommand.name, helpCommand);
    this.commands.set(infoCommand.name, infoCommand);
    this.commands.set(aiCommand.name, aiCommand);
  }

  private setupEventHandlers(): void {
    this.client.on('qr', (qr: string) => {
      Logger.info('QR Code received, scan with your phone');
      QRCode.generate(qr, { small: true });
      this.status.qrCode = qr;
      this.status.sessionStatus = 'qr';
      this.emit('qr', qr);
    });

    this.client.on('ready', () => {
      Logger.info('WhatsApp client is ready!');
      this.status.isConnected = true;
      this.status.sessionStatus = 'ready';
      this.status.qrCode = undefined;
      this.emit('ready');
    });

    this.client.on('authenticated', () => {
      Logger.info('WhatsApp client authenticated');
      this.status.sessionStatus = 'authenticated';
      this.emit('authenticated');
    });

    this.client.on('disconnected', (reason: string) => {
      Logger.warn('WhatsApp client disconnected:', reason);
      this.status.isConnected = false;
      this.status.sessionStatus = 'disconnected';
      this.emit('disconnected', reason);

      if (this.config.autoReconnect) {
        Logger.info('Attempting to reconnect...');
        setTimeout(() => this.initialize(), 5000);
      }
    });

    this.client.on('message', async (message: Message) => {
      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: Message): Promise<void> {
    try {
      if (message.fromMe || message.from === 'status@broadcast') return;

      const messageData: MessageData = {
        id: message.id.id,
        from: message.from,
        to: message.to || '',
        body: message.body,
        timestamp: new Date(message.timestamp * 1000),
        isFromMe: message.fromMe,
        type: message.type as any
      };

      Logger.info(`Message received from ${message.from}: ${message.body}`);
      this.emit('message', messageData);

      // Parsear comando
      const commandData = parseCommand(message.body, this.config.prefix);

      if (commandData) {
        // Los comandos se ejecutan inmediatamente, sin agrupación
        await this.handleCommand(message, commandData.command, commandData.args);
      } else {
        // Mensajes normales van al sistema de agrupación
        await this.addToMessageQueue(message);
      }

    } catch (error) {
      Logger.error('Error handling message:', error);
    }
  }

  private async handleCommand(message: Message, command: string, args: string[]): Promise<void> {
    const handler = this.commands.get(command);

    if (!handler) {
      await message.reply(`❌ Comando desconocido: ${command}. Usa ${this.config.prefix}help para ver los comandos disponibles.`);
      return;
    }

    try {
      const messageData: MessageData = {
        id: message.id.id,
        from: message.from,
        to: message.to || '',
        body: message.body,
        timestamp: new Date(message.timestamp * 1000),
        isFromMe: message.fromMe,
        type: message.type as any
      };

      let response: string;

      // Manejo especial para el comando AI
      if (command === 'ai') {
        const prompt = args.join(' ');
        response = await this.gptService.generateResponse(prompt);
      } else {
        response = await handler.execute(messageData, args);
      }

      await message.reply(response);

      // Emitir evento de mensaje enviado
      this.emit('messageSent', {
        id: Date.now().toString(),
        from: 'bot',
        to: message.from,
        body: response,
        timestamp: new Date(),
        isFromMe: true,
        type: 'text'
      } as MessageData);

    } catch (error) {
      Logger.error(`Error executing command ${command}:`, error);
      await message.reply('❌ Error al ejecutar el comando. Intenta de nuevo más tarde.');
    }
  }

  private async addToMessageQueue(message: Message): Promise<void> {
    const userId = message.from;
    const currentTime = Date.now();

    // Obtener o crear la cola de mensajes para este usuario
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, {
        messages: [],
        lastMessageTime: currentTime,
        timeout: undefined
      });
    }

    const userQueue = this.messageQueue.get(userId)!;

    // Agregar el mensaje a la cola
    userQueue.messages.push(message.body);
    userQueue.lastMessageTime = currentTime;

    // Si hay un timeout previo, cancelarlo
    if (userQueue.timeout) {
      clearTimeout(userQueue.timeout);
    }

    // Si la cola está llena o es el primer mensaje, procesar inmediatamente
    if (userQueue.messages.length >= this.MAX_QUEUE_SIZE || userQueue.messages.length === 1) {
      await this.processMessageQueue(message, userId);
    } else {
      // Establecer un nuevo timeout para procesar los mensajes acumulados
      userQueue.timeout = setTimeout(async () => {
        await this.processMessageQueue(message, userId);
      }, this.MESSAGE_WAIT_TIME);
    }
  }

  private async processMessageQueue(message: Message, userId: string): Promise<void> {
    const userQueue = this.messageQueue.get(userId);

    if (!userQueue || userQueue.messages.length === 0) {
      return;
    }

    // Limpiar el timeout si existe
    if (userQueue.timeout) {
      clearTimeout(userQueue.timeout);
      userQueue.timeout = undefined;
    }

    // Combinar todos los mensajes de la cola
    const combinedMessages = userQueue.messages.join('\n\n');

    // Limpiar la cola
    userQueue.messages = [];

    // Generar respuesta de IA para los mensajes combinados
    await this.handleAIResponse(message, combinedMessages);
  }

  private async handleAIResponse(message: Message, customPrompt?: string): Promise<void> {
    try {
      if (!await this.gptService.isConfigured()) {
        // Solo responder con comandos disponibles en mensajes únicos, no múltiples
        if (!customPrompt || !customPrompt.includes('\n\n')) {
          await message.reply('🤖 IA no configurada. Usa comandos como !ping o !help para interactuar conmigo.');
        }
        return;
      }

      // Usar el prompt personalizado (mensajes combinados) o el mensaje original
      const prompt = customPrompt || message.body;

      // Generar respuesta sin mensaje de "procesando"
      const response = await this.gptService.generateResponse(prompt);

      // Solo responder si la generación fue exitosa y no hay error
      if (response && !response.startsWith('Error:') && !response.startsWith('Lo siento')) {
        await message.reply(response);

        // Emitir evento de mensaje enviado
        this.emit('messageSent', {
          id: Date.now().toString(),
          from: 'bot',
          to: message.from,
          body: response,
          timestamp: new Date(),
          isFromMe: true,
          type: 'text'
        } as MessageData);
      }

    } catch (error) {
      Logger.error('Error generating AI response:', error);
    }
  }

  public async initialize(): Promise<void> {
    try {
      Logger.info('Initializing WhatsApp bot...');
      this.status.sessionStatus = 'loading';
      await this.client.initialize();
    } catch (error) {
      Logger.error('Error initializing WhatsApp bot:', error);
      this.status.sessionStatus = 'disconnected';
      throw error;
    }
  }

  public async sendMessage(to: string, message: string): Promise<void> {
    try {
      // Validar que el mensaje no esté vacío y que el destinatario sea válido
      if (!message || message.trim() === '') {
        throw new Error('Message cannot be empty');
      }

      if (!to || !to.includes('@')) {
        throw new Error('Invalid recipient format');
      }

      // Validar que el cliente esté conectado
      if (!this.status.isConnected) {
        throw new Error('WhatsApp client not connected');
      }

      await this.client.sendMessage(to, message.trim());

      // Emitir evento de mensaje enviado
      this.emit('messageSent', {
        id: Date.now().toString(),
        from: 'bot',
        to: to,
        body: message,
        timestamp: new Date(),
        isFromMe: true,
        type: 'text'
      } as MessageData);

    } catch (error) {
      Logger.error('Error sending message:', error);
      throw error;
    }
  }

  public getStatus(): BotStatus {
    return { ...this.status };
  }

  public async destroy(): Promise<void> {
    try {
      // Limpiar todas las colas de mensajes y timeouts
      this.messageQueue.forEach((queue) => {
        if (queue.timeout) {
          clearTimeout(queue.timeout);
        }
      });
      this.messageQueue.clear();

      await this.client.destroy();
      this.status.isConnected = false;
      this.status.sessionStatus = 'disconnected';
    } catch (error) {
      Logger.error('Error destroying WhatsApp client:', error);
    }
  }
}
