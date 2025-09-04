import OpenAI from 'openai';
import { NvidiaConfig } from '../types';
import { Logger } from '../utils';

export class NvidiaGPTService {
  private client: OpenAI;
  private config: NvidiaConfig;

  constructor(config: NvidiaConfig) {
    this.config = config;
    this.client = new OpenAI({
      baseURL: config.apiUrl,
      apiKey: config.apiKey
    });
  }

  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      if (!this.config.apiKey || this.config.apiKey === 'your_nvidia_api_key_here') {
        throw new Error('NVIDIA API key not configured properly');
      }

      const systemPrompt = `Eres un asistente útil de WhatsApp. Responde de manera concisa y amigable. ${context ? `Contexto: ${context}` : ''}`;

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4096,
        temperature: 1,
        top_p: 1,
        stream: false
      });

      const choice = response.choices?.[0];
      if (!choice || !choice.message) {
        throw new Error('Invalid response from NVIDIA API');
      }

      return choice.message.content?.trim() || '';
    } catch (error: any) {
      Logger.error('Error generating GPT response:', error.response?.data || error.message || error);

      // No retornar respuestas de error automáticas, solo lanzar el error
      if (error.status === 401) {
        throw new Error('API key inválida');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded');
      } else {
        throw new Error('Service temporarily unavailable');
      }
    }
  }

  async isConfigured(): Promise<boolean> {
    return !!(this.config.apiKey && this.config.apiKey !== 'your_nvidia_api_key_here');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.generateResponse('Hola, ¿funcionas correctamente?');
      return true;
    } catch {
      return false;
    }
  }
}
