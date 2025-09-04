import dotenv from 'dotenv';
import { AppConfig } from './types';

dotenv.config();

export const config: AppConfig = {
  bot: {
    name: process.env.BOT_NAME || 'WhatsApp AI Bot',
    prefix: process.env.BOT_PREFIX || '!',
    autoReconnect: true
  },
  web: {
    port: parseInt(process.env.WEB_PORT || '3000'),
    host: process.env.WEB_HOST || 'localhost'
  },
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY || 'nvapi-S-i0GEYYUnhkwuEAXuxLp7dDUzwpuSUeA8-3I8XXbrf_h_kdP',
    apiUrl: process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1',
    model: 'openai/gpt-oss-20b'
  },
  nodeEnv: process.env.NODE_ENV || 'development'
};

export default config;
