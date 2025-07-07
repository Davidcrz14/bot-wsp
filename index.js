import { GoogleGenerativeAI } from '@google/generative-ai';
import { Command } from 'commander';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import qrcode from 'qrcode-terminal';
import { fileURLToPath } from 'url';
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Archivos de datos
const PROFILES_FILE = path.join(__dirname, 'profiles.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const CHAT_HISTORY_FILE = path.join(__dirname, 'chat-history.json');
const BLACKLIST_FILE = path.join(__dirname, 'blacklist.json');


// Variables globales
let client = null;
let botStatus = 'disconnected';
let profiles = [];
let messages = [];
let chatHistory = {};
let activeProfile = null;
let blacklist = [];


// Función para guardar el estado del bot
function saveBotStatus(status) {
    try {
        const statusData = {
            status: status,
            timestamp: new Date().toISOString(),
            pid: process.pid
        };
        fs.writeFileSync(path.join(__dirname, 'bot-status.json'), JSON.stringify(statusData, null, 2));
    } catch (error) {
        console.log('Error guardando estado del bot:', error.message);
    }
}

// Función para cargar el estado del bot
function loadBotStatus() {
    try {
        const statusPath = path.join(__dirname, 'bot-status.json');
        if (fs.existsSync(statusPath)) {
            const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            // Verificar si el proceso aún existe
            try {
                process.kill(statusData.pid, 0); // No mata el proceso, solo verifica si existe
                return statusData.status;
            } catch (error) {
                // El proceso no existe, el bot está desconectado
                saveBotStatus('disconnected');
                return 'disconnected';
            }
        }
        return 'disconnected';
    } catch (error) {
        return 'disconnected';
    }
}

// Manejar cierre del proceso
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo bot...');
    saveBotStatus('disconnected');
    process.exit(0);
});

process.on('SIGTERM', () => {
    saveBotStatus('disconnected');
    process.exit(0);
});

process.on('exit', () => {
    saveBotStatus('disconnected');
});

// Inicializar Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Funciones de persistencia de datos
async function loadData() {
    try {
        if (await fs.pathExists(PROFILES_FILE)) {
            profiles = await fs.readJson(PROFILES_FILE);
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

        if (await fs.pathExists(MESSAGES_FILE)) {
            messages = await fs.readJson(MESSAGES_FILE);
        }

        if (await fs.pathExists(CHAT_HISTORY_FILE)) {
            chatHistory = await fs.readJson(CHAT_HISTORY_FILE);
        }

        if (await fs.pathExists(BLACKLIST_FILE)) {
            blacklist = await fs.readJson(BLACKLIST_FILE);
        }



        activeProfile = profiles.find(p => p.active) || profiles[0];
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

async function saveProfiles() {
    try {
        await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 });
    } catch (error) {
        console.error('Error guardando perfiles:', error);
    }
}

async function saveMessages() {
    try {
        await fs.writeJson(MESSAGES_FILE, messages, { spaces: 2 });
    } catch (error) {
        console.error('Error guardando mensajes:', error);
    }
}

async function saveChatHistory() {
    try {
        await fs.writeJson(CHAT_HISTORY_FILE, chatHistory, { spaces: 2 });
    } catch (error) {
        console.error('Error guardando historial de chat:', error);
    }
}

async function saveBlacklist() {
    try {
        await fs.writeJson(BLACKLIST_FILE, blacklist, { spaces: 2 });
    } catch (error) {
        console.error('Error guardando blacklist:', error);
    }
}

// Función para analizar el estilo de conversación
async function analyzeConversationStyle(chatNumber) {
    try {
        const history = chatHistory[chatNumber];
        if (!history || history.length < 5) {
            return 'No hay suficiente historial para analizar el estilo de conversación.';
        }

        const recentMessages = history.slice(-20);
        const conversationText = recentMessages.map(msg => `${msg.fromMe ? 'Yo' : 'Contacto'}: ${msg.body}`).join('\n');

        const analysisPrompt = `Analiza el siguiente historial de conversación y describe el estilo de comunicación de la persona (tono, uso de emojis, longitud de mensajes, expresiones características, etc.):\n\n${conversationText}\n\nDescribe el estilo en un párrafo conciso que pueda usarse para replicar este estilo de conversación.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        const result = await model.generateContent(analysisPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error al analizar estilo de conversación:', error);
        return 'Error al analizar el estilo de conversación.';
    }
}

// Variable global para almacenar memoria de conversación por chat
let chatMemory = {};

// Función para generar respuesta con Gemini
async function generateAIResponse(message, fromNumber) {
    try {
        let profile = profiles.find(p => p.phone === fromNumber) || activeProfile;
        if (!profile) profile = profiles.find(p => p.active) || profiles[0];

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                responseMimeType: "text/plain",
                maxOutputTokens: 50,
                temperature: 1.0
            },
            systemInstruction: profile.systemInstruction
        });

        // Inicializar memoria del chat si no existe
        if (!chatMemory[fromNumber]) {
            chatMemory[fromNumber] = [];
        }

        let tonePrompt = '';
        switch (profile.tone) {
            case 'amigable':
                tonePrompt = 'Responde de manera amigable, casual y cercana.';
                break;
            case 'casual':
                tonePrompt = 'Responde de manera muy casual, relajada y natural como un joven mexicano. Usa expresiones cortas y modismos. Mantén las respuestas breves (máximo 2-3 líneas).';
                break;
            case 'profesional':
                tonePrompt = 'Responde de manera profesional, formal y técnica.';
                break;
            case 'divertido':
                tonePrompt = 'Responde de manera divertida, con humor y emojis apropiados.';
                break;
            case 'serio':
                tonePrompt = 'Responde de manera seria, directa y concisa.';
                break;
            default:
                tonePrompt = 'Responde de manera útil y natural.';
        }

        // Construir el historial de conversación con formato contents
        const contents = [
            {
                role: "user",
                parts: [{
                    text: `${profile.systemInstruction} ${tonePrompt} ${profile.customStyle || ''} IMPORTANTE:
        - Mantén las respuestas EXTREMADAMENTE cortas (máximo 1-2 palabras o una línea corta)
        - Usa expresiones mexicanas naturales como "xd", "ps", "we", "bro", "tons", "nel", "ajam", "nmms", "alv", "oc", "ntp", "smn", "sha", "tranca"
        - Si te saludan con "hola" responde "ola" o "que tal" o "que pasho"
        - Si te preguntan cómo estás, responde cosas como "aquí andamos", "todo bien", "ps ahí", "tranca"
        - Para despedidas usa "nos vemos", "bye", "sha"
        - Para confirmaciones usa "ajam", "si", "oc", "zi"
        - Para negaciones usa "nel", "nop", "no"
        - Responde de manera muy casual y relajada
        - A veces responde solo con "xd" si algo es gracioso`
                }]
            }
        ];

        // Agregar historial de conversación (últimos 10 mensajes)
        const recentMemory = chatMemory[fromNumber].slice(-10);
        contents.push(...recentMemory);

        // Agregar el mensaje actual del usuario
        contents.push({
            role: "user",
            parts: [{ text: message }]
        });

        const result = await model.generateContent({ contents });
        const response = await result.response;
        let aiResponse = response.text().trim();

        // Limitar la longitud de la respuesta para que sea muy corta
        if (aiResponse.length > 80) {
            aiResponse = aiResponse.substring(0, 80).trim();
            // Si se cortó en medio de una palabra, buscar el último espacio
            const lastSpace = aiResponse.lastIndexOf(' ');
            if (lastSpace > 20) {
                aiResponse = aiResponse.substring(0, lastSpace);
            }
        }

        // Guardar el mensaje del usuario y la respuesta en la memoria del chat
        chatMemory[fromNumber].push({
            role: "user",
            parts: [{ text: message }]
        });

        chatMemory[fromNumber].push({
            role: "model",
            parts: [{ text: aiResponse }]
        });

        // Mantener solo los últimos 20 intercambios (40 mensajes total)
        if (chatMemory[fromNumber].length > 40) {
            chatMemory[fromNumber] = chatMemory[fromNumber].slice(-40);
        }

        return aiResponse;
    } catch (error) {
        console.error('Error al generar respuesta con Gemini:', error);
        return 'nel, algo salió mal xd';
    }
}

// Configurar cliente de WhatsApp
function initializeClient() {
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
        console.log('\n📱 Escanea el código QR con tu WhatsApp:');
        qrcode.generate(qr, { small: true });
        console.log('\n⏳ Esperando escaneo del código QR...');
    });

    client.on('ready', async () => {
        console.log('\n✅ ¡Bot de WhatsApp conectado y listo!');
        botStatus = 'connected';
        saveBotStatus('connected');

        try {
            const info = await client.info;
            console.log(`📱 Conectado como: +${info.wid.user}`);
        } catch (error) {
            console.log('📱 Bot conectado exitosamente');
        }
    });

    client.on('message', async (message) => {
        try {
            const chatKey = message.from;
            if (blacklist.includes(chatKey)) {
                return;
            }
            if (!chatHistory[chatKey]) {
                chatHistory[chatKey] = [];
            }

            chatHistory[chatKey].push({
                body: message.body,
                fromMe: message.fromMe,
                timestamp: new Date().toISOString(),
                type: message.type
            });

            if (chatHistory[chatKey].length > 100) {
                chatHistory[chatKey] = chatHistory[chatKey].slice(-100);
            }

            await saveChatHistory();

            if (message.from.includes('@g.us') || message.fromMe || message.type !== 'chat') {
                return;
            }

            console.log(`\n📨 Mensaje recibido de ${message.from}: ${message.body}`);

            await message.getChat().then(chat => chat.sendStateTyping());

            // Esperar 10 segundos antes de generar la respuesta para evitar rate limiting
            console.log('⏳ Esperando 10 segundos antes de responder...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            const aiResponse = await generateAIResponse(message.body, message.from);

            const messageData = {
                id: Date.now(),
                from: message.from,
                fromName: (await message.getContact()).pushname || message.from,
                message: message.body,
                response: aiResponse,
                timestamp: new Date().toISOString(),
                profileUsed: activeProfile.name
            };

            messages.unshift(messageData);

            if (messages.length > 100) {
                messages = messages.slice(0, 100);
            }

            await saveMessages();
            await message.reply(aiResponse);

            console.log(`✅ Respuesta enviada: ${aiResponse}`);
            console.log(`🎭 Perfil usado: ${activeProfile.name}`);
        } catch (error) {
            console.error('Error al procesar mensaje:', error);
            await message.reply('Lo siento, ocurrió un error al procesar tu mensaje.');
        }
    });

    client.on('disconnected', (reason) => {
        console.log('\n❌ Cliente desconectado:', reason);
        botStatus = 'disconnected';
        saveBotStatus('disconnected');
    });

    client.on('auth_failure', (msg) => {
        console.error('\n❌ Error de autenticación:', msg);
    });
}

// Comandos de la CLI
const program = new Command();

program
    .name('whatsapp-bot')
    .description('Bot de WhatsApp con IA - Interfaz de línea de comandos')
    .version('1.0.0');

// Comando para iniciar el bot
program
    .command('start')
    .description('Iniciar el bot de WhatsApp')
    .action(async () => {
        console.log('🤖 Iniciando bot de WhatsApp...');

        if (!process.env.GEMINI_API_KEY) {
            console.error('⚠️  ERROR: No se encontró GEMINI_API_KEY en las variables de entorno.');
            console.log('Por favor, crea un archivo .env con tu clave de API de Gemini.');
            process.exit(1);
        }

        await loadData();
        initializeClient();
        await client.initialize();

        console.log('\n📋 Comandos disponibles mientras el bot está ejecutándose:');
        console.log('  - Ctrl+C: Detener el bot');
        console.log('  - En otra terminal, usa: node index.js profiles, node index.js messages, etc.');
    });

// Comando para gestionar perfiles
program
    .command('profiles')
    .description('Gestionar perfiles de respuesta')
    .action(async () => {
        await loadData();

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '¿Qué deseas hacer con los perfiles?',
                choices: [
                    { name: '📋 Listar perfiles', value: 'list' },
                    { name: '➕ Crear nuevo perfil', value: 'create' },
                    { name: '✏️  Editar perfil', value: 'edit' },
                    { name: '🗑️  Eliminar perfil', value: 'delete' },
                    { name: '✅ Activar perfil', value: 'activate' },
                    { name: '🎭 Analizar estilo de chat', value: 'analyze' }
                ]
            }
        ]);

        switch (action) {
            case 'list':
                await listProfiles();
                break;
            case 'create':
                await createProfile();
                break;
            case 'edit':
                await editProfile();
                break;
            case 'delete':
                await deleteProfile();
                break;
            case 'activate':
                await activateProfile();
                break;
            case 'analyze':
                await analyzeStyle();
                break;
        }
    });

// Comando para ver mensajes
program
    .command('messages')
    .description('Ver mensajes recientes')
    .option('-n, --number <number>', 'Número de mensajes a mostrar', '10')
    .action(async (options) => {
        await loadData();

        const count = parseInt(options.number);
        const recentMessages = messages.slice(0, count);

        if (recentMessages.length === 0) {
            console.log('📭 No hay mensajes registrados.');
            return;
        }

        console.log(`\n📨 Últimos ${recentMessages.length} mensajes:`);
        console.log('='.repeat(60));

        recentMessages.forEach((msg, index) => {
            const date = new Date(msg.timestamp).toLocaleString();
            console.log(`\n${index + 1}. ${date}`);
            console.log(`👤 De: ${msg.fromName} (${msg.from})`);
            console.log(`💬 Mensaje: ${msg.message}`);
            console.log(`🤖 Respuesta: ${msg.response}`);
            console.log(`🎭 Perfil: ${msg.profileUsed}`);
            console.log('-'.repeat(40));
        });
    });

// Comando para limpiar mensajes
program
    .command('clear-messages')
    .description('Limpiar historial de mensajes')
    .action(async () => {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: '¿Estás seguro de que quieres eliminar todos los mensajes?',
                default: false
            }
        ]);

        if (confirm) {
            messages = [];
            await saveMessages();
            console.log('✅ Mensajes eliminados correctamente.');
        } else {
            console.log('❌ Operación cancelada.');
        }
    });

// Comando para ver estado del bot
program
    .command('status')
    .description('Ver estado del bot')
    .action(async () => {
        await loadData();
        const currentStatus = loadBotStatus();

        console.log('\n🤖 Estado del Bot de WhatsApp');
        console.log('='.repeat(40));
        console.log(`📊 Estado: ${currentStatus === 'connected' ? '✅ Conectado' : '❌ Desconectado'}`);
        console.log(`🎭 Perfil activo: ${activeProfile ? activeProfile.name : 'Ninguno'}`);
        console.log(`📋 Total de perfiles: ${profiles.length}`);
        console.log(`📨 Mensajes registrados: ${messages.length}`);
        console.log(`💬 Chats en historial: ${Object.keys(chatHistory).length}`);
    });

program
    .command('blacklist')
    .description('Gestionar la lista negra de contactos')
    .action(async () => {
        await loadData();

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '¿Qué deseas hacer con la lista negra?',
                choices: [
                    { name: '📋 Listar contactos bloqueados', value: 'list' },
                    { name: '➕ Añadir contacto a la lista negra', value: 'add' },
                    { name: '🗑️  Eliminar contacto de la lista negra', value: 'remove' },
                ]
            }
        ]);

        switch (action) {
            case 'list':
                await listBlacklist();
                break;
            case 'add':
                await addToBlacklist();
                break;
            case 'remove':
                await removeFromBlacklist();
                break;
        }
    });

program
    .command('broadcast')
    .description('Enviar un mensaje a todos los contactos')
    .action(async () => {
        await loadData();

        const { message } = await inquirer.prompt([
            {
                type: 'input',
                name: 'message',
                message: 'Escribe el mensaje a difundir:',
                validate: input => input.trim() !== '' || 'El mensaje no puede estar vacío'
            }
        ]);

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: '¿Estás seguro de que quieres enviar este mensaje a todos los contactos?',
                default: false
            }
        ]);

        if (confirm) {
            await broadcastMessage(message);
        } else {
            console.log('❌ Operación cancelada.');
        }
    });

// Funciones auxiliares para gestión de perfiles
async function listProfiles() {
    if (profiles.length === 0) {
        console.log('📭 No hay perfiles registrados.');
        return;
    }

    console.log('\n📋 Perfiles registrados:');
    console.log('='.repeat(60));

    profiles.forEach((profile, index) => {
        const status = profile.active ? '✅ ACTIVO' : '⭕ Inactivo';
        console.log(`\n${index + 1}. ${profile.name} ${status}`);
        console.log(`   📞 Teléfono: ${profile.phone}`);
        console.log(`   🎭 Tono: ${profile.tone}`);
        if (profile.systemInstruction) {
            console.log(`   📝 System Instruction: ${profile.systemInstruction}`);
        }
        if (profile.customStyle) {
            console.log(`   🎨 Estilo personalizado: ${profile.customStyle.substring(0, 100)}...`);
        }
    });
}

async function createProfile() {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Nombre del perfil:',
            validate: input => input.trim() !== '' || 'El nombre es requerido'
        },
        {
            type: 'input',
            name: 'phone',
            message: 'Número de teléfono:',
            validate: input => input.trim() !== '' || 'El teléfono es requerido'
        },
        {
            type: 'list',
            name: 'tone',
            message: 'Tono de respuesta:',
            choices: [
                { name: '😊 Amigable - Respuestas casuales y cercanas', value: 'amigable' },
                { name: '💼 Profesional - Formal y directo al punto', value: 'profesional' },
                { name: '😄 Divertido - Con humor y emojis', value: 'divertido' },
                { name: '😐 Serio - Respuestas concisas y formales', value: 'serio' }
            ]
        },
        {
            type: 'input',
            name: 'systemInstruction',
            message: 'System Instruction (opcional):'
        },
        {
            type: 'confirm',
            name: 'active',
            message: '¿Activar este perfil?',
            default: false
        }
    ]);

    const newProfile = {
        id: Date.now(),
        name: answers.name,
        phone: answers.phone,
        tone: answers.tone,
        systemInstruction: answers.systemInstruction || '',
        active: answers.active,
        learnFromChat: null,
        customStyle: ''
    };

    if (answers.active) {
        profiles.forEach(p => p.active = false);
        activeProfile = newProfile;
    }

    profiles.push(newProfile);
    await saveProfiles();

    console.log('✅ Perfil creado correctamente.');
}

async function editProfile() {
    if (profiles.length === 0) {
        console.log('📭 No hay perfiles para editar.');
        return;
    }

    const { profileId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'profileId',
            message: 'Selecciona el perfil a editar:',
            choices: profiles.map(p => ({
                name: `${p.name} (${p.phone}) - ${p.active ? 'ACTIVO' : 'Inactivo'}`,
                value: p.id
            }))
        }
    ]);

    const profile = profiles.find(p => p.id === profileId);

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Nombre del perfil:',
            default: profile.name
        },
        {
            type: 'input',
            name: 'phone',
            message: 'Número de teléfono:',
            default: profile.phone
        },
        {
            type: 'list',
            name: 'tone',
            message: 'Tono de respuesta:',
            default: profile.tone,
            choices: [
                { name: '😊 Amigable', value: 'amigable' },
                { name: '💼 Profesional', value: 'profesional' },
                { name: '😄 Divertido', value: 'divertido' },
                { name: '😐 Serio', value: 'serio' }
            ]
        },
        {
            type: 'input',
            name: 'systemInstruction',
            message: 'System Instruction:',
            default: profile.systemInstruction
        }
    ]);

    Object.assign(profile, answers);
    await saveProfiles();

    if (activeProfile && activeProfile.id === profileId) {
        activeProfile = profile;
    }

    console.log('✅ Perfil actualizado correctamente.');
}

async function deleteProfile() {
    if (profiles.length === 0) {
        console.log('📭 No hay perfiles para eliminar.');
        return;
    }

    const { profileId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'profileId',
            message: 'Selecciona el perfil a eliminar:',
            choices: profiles.map(p => ({
                name: `${p.name} (${p.phone})`,
                value: p.id
            }))
        }
    ]);

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: '¿Estás seguro de que quieres eliminar este perfil?',
            default: false
        }
    ]);

    if (confirm) {
        const profileIndex = profiles.findIndex(p => p.id === profileId);
        const deletedProfile = profiles[profileIndex];

        profiles.splice(profileIndex, 1);

        if (activeProfile && activeProfile.id === profileId && profiles.length > 0) {
            activeProfile = profiles[0];
            activeProfile.active = true;
        }

        await saveProfiles();
        console.log('✅ Perfil eliminado correctamente.');
    } else {
        console.log('❌ Operación cancelada.');
    }
}

async function activateProfile() {
    if (profiles.length === 0) {
        console.log('📭 No hay perfiles para activar.');
        return;
    }

    const { profileId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'profileId',
            message: 'Selecciona el perfil a activar:',
            choices: profiles.map(p => ({
                name: `${p.name} (${p.phone}) - ${p.active ? 'YA ACTIVO' : 'Inactivo'}`,
                value: p.id
            }))
        }
    ]);

    profiles.forEach(p => p.active = false);
    const profile = profiles.find(p => p.id === profileId);
    profile.active = true;
    activeProfile = profile;

    await saveProfiles();
    console.log(`✅ Perfil "${profile.name}" activado correctamente.`);
}

async function analyzeStyle() {
    const { chatNumber } = await inquirer.prompt([
        {
            type: 'input',
            name: 'chatNumber',
            message: 'Número de chat para analizar (ej: 9511110360):',
            validate: input => input.trim() !== '' || 'El número es requerido'
        }
    ]);

    const formattedNumber = chatNumber.includes('@c.us') ? chatNumber : `${chatNumber}@c.us`;

    console.log('🔍 Analizando estilo de conversación...');

    const styleAnalysis = await analyzeConversationStyle(formattedNumber);

    console.log('\n🎨 Análisis de estilo:');
    console.log('='.repeat(60));
    console.log(styleAnalysis);

    const { applyToProfile } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'applyToProfile',
            message: '¿Quieres aplicar este estilo a un perfil?',
            default: false
        }
    ]);

    if (applyToProfile && profiles.length > 0) {
        const { profileId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'profileId',
                message: 'Selecciona el perfil:',
                choices: profiles.map(p => ({
                    name: `${p.name} (${p.phone})`,
                    value: p.id
                }))
            }
        ]);

        const profile = profiles.find(p => p.id === profileId);
        profile.learnFromChat = chatNumber;
        profile.customStyle = styleAnalysis;

        await saveProfiles();

        if (activeProfile && activeProfile.id === profileId) {
            activeProfile = profile;
        }

        console.log(`✅ Estilo aplicado al perfil "${profile.name}".`);
    }
}

async function broadcastMessage(message) {
    const chats = await client.getChats();
    for (const chat of chats) {
        if (!chat.isGroup && !blacklist.includes(chat.id._serialized)) {
            try {
                await chat.sendMessage(message);
                console.log(`✅ Mensaje enviado a ${chat.id.user}`);
            } catch (error) {
                console.error(`❌ Error al enviar mensaje a ${chat.id.user}:`, error);
            }
        }
    }
}

async function listBlacklist() {
    if (blacklist.length === 0) {
        console.log('📭 No hay contactos en la lista negra.');
        return;
    }

    console.log('\n🚫 Contactos en la lista negra:');
    console.log('='.repeat(60));

    blacklist.forEach((contact, index) => {
        console.log(`\n${index + 1}. ${contact}`);
    });
}

async function addToBlacklist() {
    const { chatNumber } = await inquirer.prompt([
        {
            type: 'input',
            name: 'chatNumber',
            message: 'Número de chat para añadir a la lista negra (ej: 9511110360):',
            validate: input => input.trim() !== '' || 'El número es requerido'
        }
    ]);

    const formattedNumber = chatNumber.includes('@c.us') ? chatNumber : `${chatNumber}@c.us`;

    if (blacklist.includes(formattedNumber)) {
        console.log('❌ Este contacto ya está en la lista negra.');
        return;
    }

    blacklist.push(formattedNumber);
    await saveBlacklist();
    console.log('✅ Contacto añadido a la lista negra.');
}

async function removeFromBlacklist() {
    if (blacklist.length === 0) {
        console.log('📭 No hay contactos en la lista negra para eliminar.');
        return;
    }

    const { chatNumber } = await inquirer.prompt([
        {
            type: 'list',
            name: 'chatNumber',
            message: 'Selecciona el contacto a eliminar de la lista negra:',
            choices: blacklist
        }
    ]);

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: '¿Estás seguro de que quieres eliminar este contacto de la lista negra?',
            default: false
        }
    ]);

    if (confirm) {
        blacklist = blacklist.filter(c => c !== chatNumber);
        await saveBlacklist();
        console.log('✅ Contacto eliminado de la lista negra.');
    } else {
        console.log('❌ Operación cancelada.');
    }
}

// Manejo de señales del sistema
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando bot...');
    if (client) {
        await client.destroy();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Cerrando bot...');
    if (client) {
        await client.destroy();
    }
    process.exit(0);
});

// Ejecutar programa
program.parse();

// Si no se proporciona ningún comando, mostrar ayuda
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
