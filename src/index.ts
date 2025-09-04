import { WhatsAppBot } from './bot';
import config from './config';
import { NvidiaGPTService } from './gpt';
import { Logger } from './utils';
import { WebPanel } from './web';

class WhatsAppAIBotApp {
  private bot: WhatsAppBot;
  private webPanel: WebPanel;
  private gptService: NvidiaGPTService;

  constructor() {
    // Inicializar servicios
    this.gptService = new NvidiaGPTService(config.nvidia);
    this.bot = new WhatsAppBot(config.bot, this.gptService);
    this.webPanel = new WebPanel(config.web, this.bot);

    this.setupGracefulShutdown();
  }

  public async start(): Promise<void> {
    try {
      Logger.info('🚀 Starting WhatsApp AI Bot Application...');

      // Verificar configuración de NVIDIA
      if (await this.gptService.isConfigured()) {
        Logger.info('✅ NVIDIA GPT service configured');
        const isWorking = await this.gptService.testConnection();
        if (isWorking) {
          Logger.info('✅ NVIDIA GPT service connection test passed');
        } else {
          Logger.warn('⚠️ NVIDIA GPT service connection test failed');
        }
      } else {
        Logger.warn('⚠️ NVIDIA GPT service not configured - AI features will be disabled');
        Logger.info('💡 Configure NVIDIA_API_KEY in your .env file to enable AI features');
      }

      // Iniciar panel web
      await this.webPanel.start();
      Logger.info(`🌐 Web panel available at: http://${config.web.host}:${config.web.port}`);

      // Iniciar bot de WhatsApp
      Logger.info('📱 Initializing WhatsApp bot...');
      await this.bot.initialize();

      Logger.info('🎉 WhatsApp AI Bot started successfully!');
      Logger.info('📋 Instructions:');
      Logger.info('   1. Open the web panel in your browser');
      Logger.info('   2. Scan the QR code with WhatsApp');
      Logger.info('   3. Start chatting!');
      Logger.info('');
      Logger.info('💬 Available commands:');
      Logger.info('   !ping - Test bot connection');
      Logger.info('   !help - Show help message');
      Logger.info('   !info - Show bot information');
      Logger.info('   !ai [message] - Chat with AI');
      Logger.info('');
      Logger.info('🤖 You can also send any message and the bot will respond with AI (if configured)');

    } catch (error) {
      Logger.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      Logger.info('🛑 Stopping WhatsApp AI Bot Application...');

      // Detener bot
      await this.bot.destroy();
      Logger.info('✅ WhatsApp bot stopped');

      // Detener panel web
      await this.webPanel.stop();
      Logger.info('✅ Web panel stopped');

      Logger.info('👋 Application stopped successfully');
    } catch (error) {
      Logger.error('❌ Error stopping application:', error);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      Logger.info(`\n📡 Received ${signal}, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      Logger.error('💥 Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      Logger.error(`💥 Unhandled Rejection at: ${promise.toString()}, reason:`, reason);
      shutdown('unhandledRejection');
    });
  }
}

// Ejecutar aplicación
async function main() {
  const app = new WhatsAppAIBotApp();
  await app.start();
}

if (require.main === module) {
  main().catch((error) => {
    Logger.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { WhatsAppAIBotApp };
export default main;
