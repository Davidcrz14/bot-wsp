import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';
import { saveBotStatus } from '../config/database.js';
import { handleMessage } from '../services/whatsapp.js';
const { Client, LocalAuth } = pkg;

let client = null;
let botStatus = 'disconnected';

export function getBotStatus() {
    return botStatus;
}

export function getClient() {
    return client;
}

export function initializeClient() {
    client = new Client({
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
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('\nEscanea el código QR con tu WhatsApp:');
        qrcode.generate(qr, { small: true });
        console.log('\nEsperando escaneo del código QR...');
    });

    client.on('ready', async () => {
        console.log('\nBot de WhatsApp conectado y listo');
        botStatus = 'connected';
        saveBotStatus('connected');

        try {
            const info = client.info;
            console.log(`Conectado como: ${info.pushname} (${info.wid.user})`);
        } catch (error) {
            console.log('Bot conectado correctamente');
        }
    });

    client.on('message', handleMessage);

    client.on('disconnected', (reason) => {
        console.log('\nCliente desconectado:', reason);
        botStatus = 'disconnected';
        saveBotStatus('disconnected');
    });

    client.on('auth_failure', (msg) => {
        console.error('\nError de autenticación:', msg);
        botStatus = 'auth_failed';
        saveBotStatus('auth_failed');
    });

    return client;
}

export async function disconnectClient() {
    if (client) {
        try {
            await client.destroy();
            botStatus = 'disconnected';
            saveBotStatus('disconnected');
            console.log('Cliente desconectado correctamente');
        } catch (error) {
            console.error('Error al desconectar cliente:', error);
        }
    }
}

export async function sendMessage(number, message) {
    if (!client || botStatus !== 'connected') {
        throw new Error('Cliente no conectado');
    }

    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        await client.sendMessage(chatId, message);
        return true;
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        throw error;
    }
}

export async function getChats() {
    if (!client || botStatus !== 'connected') {
        throw new Error('Cliente no conectado');
    }

    try {
        return await client.getChats();
    } catch (error) {
        console.error('Error obteniendo chats:', error);
        throw error;
    }
}

export async function getContactInfo(number) {
    if (!client || botStatus !== 'connected') {
        throw new Error('Cliente no conectado');
    }

    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        const contact = await client.getContactById(chatId);
        return contact;
    } catch (error) {
        console.error('Error obteniendo información del contacto:', error);
        throw error;
    }
}
