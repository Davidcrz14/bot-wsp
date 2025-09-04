import { CommandHandler, MessageData } from '../types';

export const pingCommand: CommandHandler = {
  name: 'ping',
  description: 'Responde con pong para verificar que el bot está funcionando',
  execute: async (_message: MessageData, _args: string[]): Promise<string> => {
    return 'pong! 🏓';
  }
};

export const helpCommand: CommandHandler = {
  name: 'help',
  description: 'Muestra la lista de comandos disponibles',
  execute: async (_message: MessageData, _args: string[]): Promise<string> => {
    return `🤖 *Comandos disponibles:*

!ping - Verificar que el bot está activo
!help - Mostrar esta ayuda
!info - Información del bot
!ai [mensaje] - Conversar con IA

*Uso de IA:* También puedes enviar cualquier mensaje sin comando y responderé usando inteligencia artificial.`;
  }
};

export const infoCommand: CommandHandler = {
  name: 'info',
  description: 'Muestra información sobre el bot',
  execute: async (_message: MessageData, _args: string[]): Promise<string> => {
    return `🤖 *WhatsApp AI Bot*

Versión: 1.0.0
Desarrollado con Node.js + TypeScript
Integración con NVIDIA AI

✅ Estado: Activo
🚀 Panel web disponible en http://localhost:3000`;
  }
};

export const aiCommand: CommandHandler = {
  name: 'ai',
  description: 'Conversar con la IA',
  execute: async (_message: MessageData, args: string[]): Promise<string> => {
    const prompt = args.join(' ');
    if (!prompt) {
      return 'Por favor proporciona un mensaje para la IA. Ejemplo: !ai ¿Cómo estás?';
    }

    // Este comando será manejado por el bot principal que tiene acceso al servicio de IA
    return prompt;
  }
};
