import cors from 'cors';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { WhatsAppBot } from '../bot';
import { MessageData, WebConfig, WebSocketMessage } from '../types';
import { Logger } from '../utils';

export class WebPanel {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private config: WebConfig;
  private bot: WhatsAppBot;

  constructor(config: WebConfig, bot: WhatsAppBot) {
    this.config = config;
    this.bot = bot;

    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupBotListeners();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  private setupRoutes(): void {
    // Ruta principal - servir el panel web
    this.app.get('/', (_req: Request, res: Response) => {
      res.send(this.getWebPanelHTML());
    });

    // API para obtener el estado del bot
    this.app.get('/api/status', (_req: Request, res: Response) => {
      res.json(this.bot.getStatus());
    });

    // API para enviar mensajes - DISABLED
    // this.app.post('/api/send-message', async (req: Request, res: Response) => {
    //   res.status(403).json({ error: 'Message sending from web panel is disabled' });
    // });

    // API de salud
    this.app.get('/api/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      Logger.info(`Web client connected: ${socket.id}`);

      // Enviar estado actual del bot al conectarse
      socket.emit('status', this.bot.getStatus());

      // Manejar envío de mensajes desde la web - DISABLED
      // socket.on('send-message', async (data) => {
      //   socket.emit('message-sent', { success: false, error: 'Message sending from web is disabled' });
      // });

      socket.on('disconnect', () => {
        Logger.info(`Web client disconnected: ${socket.id}`);
      });
    });
  }

  private setupBotListeners(): void {
    // Escuchar eventos del bot y retransmitirlos a los clientes web
    this.bot.on('qr', (qr: string) => {
      this.broadcastMessage({
        type: 'qr',
        data: qr,
        timestamp: new Date()
      });
    });

    this.bot.on('ready', () => {
      this.broadcastMessage({
        type: 'status',
        data: this.bot.getStatus(),
        timestamp: new Date()
      });
    });

    this.bot.on('message', (message: MessageData) => {
      this.broadcastMessage({
        type: 'message',
        data: message,
        timestamp: new Date()
      });
    });

    this.bot.on('messageSent', (message: MessageData) => {
      this.broadcastMessage({
        type: 'message',
        data: message,
        timestamp: new Date()
      });
    });

    this.bot.on('disconnected', (_reason: string) => {
      this.broadcastMessage({
        type: 'status',
        data: this.bot.getStatus(),
        timestamp: new Date()
      });
    });
  }

  private broadcastMessage(message: WebSocketMessage): void {
    this.io.emit('bot-event', message);
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => {
        Logger.info(`Web panel started on http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        Logger.info('Web panel stopped');
        resolve();
      });
    });
  }

  private getWebPanelHTML(): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp AI Bot - Panel de Control</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            color: white;
            padding: 20px 30px;
            text-align: center;
        }

        .status-bar {
            padding: 15px 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #dc3545;
        }

        .status-dot.connected {
            background: #28a745;
        }

        .main-content {
            display: grid;
            grid-template-columns: 1fr 350px;
            min-height: 500px;
        }

        .messages-panel {
            padding: 20px;
            border-right: 1px solid #e9ecef;
        }

        .messages-container {
            height: 450px;
            overflow-y: auto;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            background: #fafafa;
        }

        .message {
            margin-bottom: 15px;
            padding: 10px 15px;
            border-radius: 12px;
            max-width: 80%;
            word-wrap: break-word;
        }

        .message.incoming {
            background: #e3f2fd;
            margin-right: auto;
        }

        .message.outgoing {
            background: #dcf8c6;
            margin-left: auto;
        }

        .message-header {
            font-size: 0.8em;
            color: #666;
            margin-bottom: 5px;
        }

        .send-panel {
            display: none;
        }

        .send-input {
            display: none;
        }

        .send-button {
            display: none;
        }

        .control-panel {
            background: #f8f9fa;
            padding: 20px;
        }

        .qr-section {
            text-align: center;
            margin-bottom: 20px;
        }

        .qr-code {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 8px;
            line-height: 1;
            white-space: pre;
            overflow: auto;
        }

        .controls {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .control-button {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            transition: all 0.3s;
        }

        .control-button:hover {
            background: #e9ecef;
        }

        @media (max-width: 768px) {
            .main-content {
                grid-template-columns: 1fr;
            }

            .status-bar {
                flex-direction: column;
                gap: 10px;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 WhatsApp AI Bot</h1>
            <p>Panel de Control y Monitoreo</p>
        </div>

        <div class="status-bar">
            <div class="status-indicator">
                <div class="status-dot" id="statusDot"></div>
                <span id="statusText">Conectando...</span>
            </div>
            <div id="sessionInfo">Iniciando sesión...</div>
        </div>

        <div class="main-content">
            <div class="messages-panel">
                <h3>💬 Mensajes en Tiempo Real</h3>
                <div class="messages-container" id="messagesContainer">
                    <div style="text-align: center; color: #666; padding: 20px;">
                        Esperando mensajes...
                    </div>
                </div>
            </div>

            <div class="control-panel">
                <div class="qr-section" id="qrSection" style="display: none;">
                    <h4>📱 Escanea el código QR</h4>
                    <div class="qr-code" id="qrCode"></div>
                </div>

                <div class="controls">
                    <h4>🔧 Controles</h4>
                    <button class="control-button" onclick="refreshStatus()">🔄 Actualizar Estado</button>
                    <button class="control-button" onclick="clearMessages()">🗑️ Limpiar Mensajes</button>
                    <button class="control-button" onclick="exportMessages()">💾 Exportar Mensajes</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        let messages = [];

        // Elementos del DOM
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        const sessionInfo = document.getElementById('sessionInfo');
        const messagesContainer = document.getElementById('messagesContainer');
        const qrSection = document.getElementById('qrSection');
        const qrCode = document.getElementById('qrCode');

        // Eventos de Socket.IO
        socket.on('connect', () => {
            console.log('Conectado al servidor');
        });

        socket.on('bot-event', (event) => {
            handleBotEvent(event);
        });

        socket.on('status', (status) => {
            updateStatus(status);
        });

        // Manejar eventos del bot
        function handleBotEvent(event) {
            switch(event.type) {
                case 'qr':
                    showQRCode(event.data);
                    break;
                case 'status':
                    updateStatus(event.data);
                    break;
                case 'message':
                    addMessage(event.data);
                    break;
            }
        }

        // Actualizar estado
        function updateStatus(status) {
            const dot = document.getElementById('statusDot');
            const text = document.getElementById('statusText');
            const info = document.getElementById('sessionInfo');

            if (status.isConnected) {
                dot.classList.add('connected');
                text.textContent = 'Conectado';
                info.textContent = 'WhatsApp conectado y listo';
                hideQRCode();
            } else {
                dot.classList.remove('connected');
                text.textContent = 'Desconectado';
                info.textContent = \`Estado: \${status.sessionStatus}\`;
            }
        }

        // Mostrar código QR
        function showQRCode(qr) {
            qrSection.style.display = 'block';
            qrCode.textContent = qr;
        }

        // Ocultar código QR
        function hideQRCode() {
            qrSection.style.display = 'none';
        }

        // Agregar mensaje al panel
        function addMessage(message) {
            messages.push(message);

            const messageEl = document.createElement('div');
            messageEl.className = \`message \${message.isFromMe ? 'outgoing' : 'incoming'}\`;

            const time = new Date(message.timestamp).toLocaleTimeString();
            const from = message.isFromMe ? 'Bot' : message.from.split('@')[0];

            messageEl.innerHTML = \`
                <div class="message-header">\${from} - \${time}</div>
                <div>\${escapeHtml(message.body)}</div>
            \`;

            messagesContainer.appendChild(messageEl);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // Limpiar mensaje de "esperando"
            const waiting = messagesContainer.querySelector('div[style*="text-align: center"]');
            if (waiting) waiting.remove();
        }

        // Enviar mensaje - DISABLED
        // function sendMessage() { }

        // Controles
        function refreshStatus() {
            fetch('/api/status')
                .then(response => response.json())
                .then(status => updateStatus(status))
                .catch(error => console.error('Error:', error));
        }

        function clearMessages() {
            messagesContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Mensajes limpiados</div>';
            messages = [];
        }

        function exportMessages() {
            const data = JSON.stringify(messages, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`messages-\${new Date().toISOString().split('T')[0]}.json\`;
            a.click();
            URL.revokeObjectURL(url);
        }

        // Utilidades
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Enviar mensaje con Enter - DISABLED
        // messageInput.addEventListener('keypress', (e) => { });

        // Solicitar estado inicial
        refreshStatus();
    </script>
</body>
</html>
    `;
  }
}
