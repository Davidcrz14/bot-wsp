import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas de archivos de datos
export const DATA_PATHS = {
    PROFILES: path.join(__dirname, '../../profiles.json'),
    MESSAGES: path.join(__dirname, '../../messages.json'),
    CHAT_HISTORY: path.join(__dirname, '../../chat-history.json'),
    BLACKLIST: path.join(__dirname, '../../blacklist.json'),
    BOT_STATUS: path.join(__dirname, '../../bot-status.json')
};

export let profiles = [];
export let messages = [];
export let chatHistory = {};
export let blacklist = [];
export let activeProfile = null;

export async function loadData() {
    try {
        if (await fs.pathExists(DATA_PATHS.PROFILES)) {
            profiles = await fs.readJson(DATA_PATHS.PROFILES);
        } else {
            profiles = [{
                id: 1,
                name: 'David',
                phone: '+1234567890',
                tone: 'casual',
                active: true,
                systemInstruction: 'Eres David, un joven mexicano real de 20 años. Hablas de manera muy natural y casual como cualquier chavo de tu edad. Usas expresiones mexicanas como "xd", "ps", "we", "bro", "tons", "sha", "nel", "ajam", "nmms", "alv", "oc", "ntp", "smn". Respondes de forma corta y directa, a veces con una sola palabra o expresión. Eres relajado, amigable pero no demasiado efusivo. Si alguien pregunta por David, dices que no se encuentra por el momento. Nunca revelas que eres una IA.',
                learnFromChat: null,
                customStyle: 'Habla como un joven mexicano real, usa modismos del español mexicano, respuestas cortas y naturales, expresiones como "xd", "ps", "we", "bro", "tons", "nel", "ajam", etc. Sé casual y relajado.'
            }];
            await saveProfiles();
        }

        // Cargar mensajes
        if (await fs.pathExists(DATA_PATHS.MESSAGES)) {
            messages = await fs.readJson(DATA_PATHS.MESSAGES);
        }

        // Cargar historial de chat
        if (await fs.pathExists(DATA_PATHS.CHAT_HISTORY)) {
            chatHistory = await fs.readJson(DATA_PATHS.CHAT_HISTORY);
        }

        // Cargar blacklist
        if (await fs.pathExists(DATA_PATHS.BLACKLIST)) {
            blacklist = await fs.readJson(DATA_PATHS.BLACKLIST);
        }

        // Establecer perfil activo
        activeProfile = profiles.find(p => p.active) || profiles[0];
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

// Funciones de guardado
export async function saveProfiles() {
    try {
        await fs.writeJson(DATA_PATHS.PROFILES, profiles, { spaces: 2 });
    } catch (error) {
        console.error('Error guardando perfiles:', error);
    }
}

export async function saveMessages() {
    try {
        await fs.writeJson(DATA_PATHS.MESSAGES, messages, { spaces: 2 });
    } catch (error) {
        console.error('Error guardando mensajes:', error);
    }
}

export async function saveChatHistory() {
    try {
        await fs.writeJson(DATA_PATHS.CHAT_HISTORY, chatHistory, { spaces: 2 });
    } catch (error) {
        console.error('Error guardando historial de chat:', error);
    }
}

export async function saveBlacklist() {
    try {
        await fs.writeJson(DATA_PATHS.BLACKLIST, blacklist, { spaces: 2 });
    } catch (error) {
        console.error('Error guardando blacklist:', error);
    }
}

// Función para guardar y cargar estado del bot
export function saveBotStatus(status) {
    try {
        const statusData = {
            status: status,
            timestamp: new Date().toISOString(),
            pid: process.pid
        };
        fs.writeFileSync(DATA_PATHS.BOT_STATUS, JSON.stringify(statusData, null, 2));
    } catch (error) {
        console.log('Error guardando estado del bot:', error.message);
    }
}

export function loadBotStatus() {
    try {
        if (fs.existsSync(DATA_PATHS.BOT_STATUS)) {
            const statusData = JSON.parse(fs.readFileSync(DATA_PATHS.BOT_STATUS, 'utf8'));
            // Verificar si el proceso aún existe
            try {
                process.kill(statusData.pid, 0);
                return statusData.status;
            } catch (error) {
                return 'disconnected';
            }
        }
        return 'disconnected';
    } catch (error) {
        return 'disconnected';
    }
}

// Funciones para actualizar datos globales
export function updateProfiles(newProfiles) {
    profiles.length = 0;
    profiles.push(...newProfiles);
}

export function updateMessages(newMessages) {
    messages.length = 0;
    messages.push(...newMessages);
}

export function updateChatHistory(newChatHistory) {
    Object.keys(chatHistory).forEach(key => delete chatHistory[key]);
    Object.assign(chatHistory, newChatHistory);
}

export function updateBlacklist(newBlacklist) {
    blacklist.length = 0;
    blacklist.push(...newBlacklist);
}

export function setActiveProfile(profile) {
    activeProfile = profile;
}
