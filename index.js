
import { Command } from 'commander';
import dotenv from 'dotenv';
import { handleBlacklistCommand } from './src/commands/blacklist.js';
import { handleMessagesCommand } from './src/commands/messages.js';
import { handleProfilesCommand } from './src/commands/profiles.js';
import { handleStatusCommand } from './src/commands/status.js';
import { disconnectClient, initializeClient } from './src/config/client.js';
import { loadData, saveBotStatus } from './src/config/database.js';

dotenv.config();

const program = new Command();

program
    .name('whatsapp-bot')
    .description('Bot de WhatsApp con IA - Interfaz de línea de comandos')
    .version('2.0.0');
// Comando para iniciar el bot
program
    .command('start')
    .description('Iniciar el bot de WhatsApp')
    .action(async () => {
        console.log('🤖 Iniciando bot de WhatsApp...');

        if (!process.env.NVIDIA_API_KEY) {
            console.error('⚠️  ERROR: No se encontró NVIDIA_API_KEY en las variables de entorno.');
            console.log('Por favor, configura tu clave de API de NVIDIA en el archivo .env');
            process.exit(1);
        }

        try {
            await loadData();
            const client = initializeClient();
            await client.initialize();

            console.log('\n📋 Comandos disponibles mientras el bot está ejecutándose:');
            console.log('  - Ctrl+C: Detener el bot');
            console.log('  - En otra terminal, usa: node index.js profiles, node index.js messages, etc.');

            process.stdin.resume();
        } catch (error) {
            console.error('❌ Error iniciando el bot:', error);
            process.exit(1);
        }
    });

program
    .command('profiles')
    .description('Gestionar perfiles de respuesta')
    .action(async () => {
        try {
            await loadData();
            await handleProfilesCommand();
        } catch (error) {
            console.error('❌ Error en comando de perfiles:', error);
        }
    });

program
    .command('messages')
    .description('Gestionar mensajes')
    .option('-n, --number <number>', 'Número de mensajes a mostrar', '10')
    .action(async (options) => {
        try {
            await loadData();

            if (options.number) {
                const { showMessages } = await import('./src/commands/messages.js');
                await showMessages(parseInt(options.number));
            } else {
                await handleMessagesCommand();
            }
        } catch (error) {
            console.error('❌ Error en comando de mensajes:', error);
        }
    });

program
    .command('blacklist')
    .description('Gestionar la lista negra de contactos')
    .action(async () => {
        try {
            await loadData();
            await handleBlacklistCommand();
        } catch (error) {
            console.error('❌ Error en comando de blacklist:', error);
        }
    });

program
    .command('status')
    .description('Ver estado del bot y estadísticas')
    .action(async () => {
        try {
            await loadData();
            await handleStatusCommand();
        } catch (error) {
            console.error('❌ Error en comando de estado:', error);
        }
    });

program
    .command('broadcast')
    .description('Enviar un mensaje a todos los contactos')
    .action(async () => {
        try {
            await loadData();
            const { handleBroadcast } = await import('./src/commands/status.js');
            await handleBroadcast();
        } catch (error) {
            console.error('❌ Error en comando de difusión:', error);
        }
    });

program
    .command('clean')
    .description('Limpiar datos del bot')
    .action(async () => {
        const inquirer = (await import('inquirer')).default;

        const { dataType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'dataType',
                message: '¿Qué datos deseas limpiar?',
                choices: [
                    { name: '📨 Mensajes', value: 'messages' },
                    { name: '💬 Historial de chat', value: 'chat-history' },
                    { name: '🚫 Lista negra', value: 'blacklist' },
                    { name: '🗑️  Todo (excepto perfiles)', value: 'all' }
                ]
            }
        ]);

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: '¿Estás seguro? Esta acción no se puede deshacer.',
                default: false
            }
        ]);

        if (!confirm) {
            console.log('❌ Operación cancelada.');
            return;
        }

        try {
            await loadData();
            const {
                messages,
                chatHistory,
                blacklist,
                saveMessages,
                saveChatHistory,
                saveBlacklist,
                updateMessages,
                updateChatHistory,
                updateBlacklist
            } = await import('./src/config/database.js');

            switch (dataType) {
                case 'messages':
                    updateMessages([]);
                    await saveMessages();
                    console.log('✅ Mensajes eliminados.');
                    break;

                case 'chat-history':
                    updateChatHistory({});
                    await saveChatHistory();
                    console.log('✅ Historial de chat eliminado.');
                    break;

                case 'blacklist':
                    updateBlacklist([]);
                    await saveBlacklist();
                    console.log('✅ Lista negra eliminada.');
                    break;

                case 'all':
                    updateMessages([]);
                    updateChatHistory({});
                    updateBlacklist([]);
                    await Promise.all([saveMessages(), saveChatHistory(), saveBlacklist()]);
                    console.log('✅ Todos los datos eliminados (excepto perfiles).');
                    break;
            }
        } catch (error) {
            console.error('❌ Error limpiando datos:', error);
        }
    });

process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando bot...');
    try {
        await disconnectClient();
        saveBotStatus('disconnected');
    } catch (error) {
        console.error('Error al cerrar:', error);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Cerrando bot...');
    try {
        await disconnectClient();
        saveBotStatus('disconnected');
    } catch (error) {
        console.error('Error al cerrar:', error);
    }
    process.exit(0);
});

process.on('exit', () => {
    saveBotStatus('disconnected');
});

process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
    saveBotStatus('error');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada:', reason);
    saveBotStatus('error');
});

program.parse();

if (!process.argv.slice(2).length) {
    program.outputHelp();
    console.log('\n🚀 Comandos más usados:');
    console.log('  node index.js start     - Iniciar el bot');
    console.log('  node index.js status    - Ver estado del bot');
    console.log('  node index.js profiles  - Gestionar perfiles');
    console.log('  node index.js messages  - Ver mensajes');
    console.log('\n💡 Tip: Usa "node index.js <comando> --help" para más información sobre cada comando.');
}
