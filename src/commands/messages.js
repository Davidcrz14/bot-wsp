import inquirer from 'inquirer';
import { messages, saveMessages } from '../config/database.js';
import { getMessageStats } from '../services/whatsapp.js';

export async function showMessages(count = 10) {
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
}

export async function clearMessages() {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: '¿Estás seguro de que quieres eliminar todos los mensajes?',
            default: false
        }
    ]);

    if (confirm) {
        messages.length = 0;
        await saveMessages();
        console.log('✅ Mensajes eliminados correctamente.');
    } else {
        console.log('❌ Operación cancelada.');
    }
}

export async function showMessageStats() {
    const stats = getMessageStats();

    console.log('\n📊 Estadísticas de Mensajes');
    console.log('='.repeat(40));
    console.log(`📨 Total de mensajes: ${stats.totalMessages}`);
    console.log(`💬 Total de chats: ${stats.totalChats}`);
    console.log(`📈 Promedio mensajes por chat: ${stats.averageMessagesPerChat}`);
    console.log(`🚫 Contactos bloqueados: ${stats.blacklistedContacts}`);

    if (Object.keys(stats.profileUsage).length > 0) {
        console.log('\n🎭 Uso de perfiles (últimos 100 mensajes):');
        Object.entries(stats.profileUsage).forEach(([profile, count]) => {
            console.log(`   ${profile}: ${count} mensajes`);
        });
    }
}

export async function searchMessages() {
    const { searchTerm } = await inquirer.prompt([
        {
            type: 'input',
            name: 'searchTerm',
            message: 'Ingresa el término de búsqueda:',
            validate: input => input.trim() !== '' || 'Debes ingresar un término de búsqueda'
        }
    ]);

    const searchResults = messages.filter(msg =>
        msg.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.response.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.fromName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (searchResults.length === 0) {
        console.log(`📭 No se encontraron mensajes con el término "${searchTerm}".`);
        return;
    }

    console.log(`\n🔍 Resultados de búsqueda para "${searchTerm}" (${searchResults.length} mensajes):`);
    console.log('='.repeat(60));

    searchResults.slice(0, 20).forEach((msg, index) => {
        const date = new Date(msg.timestamp).toLocaleString();
        console.log(`\n${index + 1}. ${date}`);
        console.log(`👤 De: ${msg.fromName} (${msg.from})`);
        console.log(`💬 Mensaje: ${msg.message}`);
        console.log(`🤖 Respuesta: ${msg.response}`);
        console.log('-'.repeat(40));
    });

    if (searchResults.length > 20) {
        console.log(`\n... y ${searchResults.length - 20} resultados más.`);
    }
}

export async function exportMessages() {
    const { exportFormat } = await inquirer.prompt([
        {
            type: 'list',
            name: 'exportFormat',
            message: 'Selecciona el formato de exportación:',
            choices: [
                { name: '📄 JSON', value: 'json' },
                { name: '📝 CSV', value: 'csv' },
                { name: '📋 TXT', value: 'txt' }
            ]
        }
    ]);

    const { count } = await inquirer.prompt([
        {
            type: 'input',
            name: 'count',
            message: 'Número de mensajes a exportar (0 = todos):',
            default: '100',
            validate: input => !isNaN(input) && parseInt(input) >= 0 || 'Debe ser un número válido'
        }
    ]);

    const exportCount = parseInt(count);
    const messagesToExport = exportCount === 0 ? messages : messages.slice(0, exportCount);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let filename = `messages_export_${timestamp}`;
    let content = '';

    switch (exportFormat) {
        case 'json':
            filename += '.json';
            content = JSON.stringify(messagesToExport, null, 2);
            break;

        case 'csv':
            filename += '.csv';
            content = 'Fecha,De,Numero,Mensaje,Respuesta,Perfil\n';
            content += messagesToExport.map(msg =>
                `"${msg.timestamp}","${msg.fromName}","${msg.from}","${msg.message.replace(/"/g, '""')}","${msg.response.replace(/"/g, '""')}","${msg.profileUsed}"`
            ).join('\n');
            break;

        case 'txt':
            filename += '.txt';
            content = messagesToExport.map(msg => {
                const date = new Date(msg.timestamp).toLocaleString();
                return `${date} - ${msg.fromName} (${msg.from})\nMensaje: ${msg.message}\nRespuesta: ${msg.response}\nPerfil: ${msg.profileUsed}\n${'='.repeat(50)}`;
            }).join('\n\n');
            break;
    }

    try {
        const fs = await import('fs-extra');
        const path = await import('path');
        const filepath = path.join(process.cwd(), filename);

        await fs.writeFile(filepath, content, 'utf8');
        console.log(`✅ Mensajes exportados a: ${filepath}`);
    } catch (error) {
        console.error('❌ Error exportando mensajes:', error);
    }
}

export async function handleMessagesCommand() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: '¿Qué deseas hacer con los mensajes?',
            choices: [
                { name: '📨 Ver mensajes recientes', value: 'show' },
                { name: '📊 Ver estadísticas', value: 'stats' },
                { name: '🔍 Buscar mensajes', value: 'search' },
                { name: '📤 Exportar mensajes', value: 'export' },
                { name: '🗑️  Limpiar mensajes', value: 'clear' }
            ]
        }
    ]);

    switch (action) {
        case 'show':
            const { count } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'count',
                    message: 'Número de mensajes a mostrar:',
                    default: '10',
                    validate: input => !isNaN(input) && parseInt(input) > 0 || 'Debe ser un número mayor a 0'
                }
            ]);
            await showMessages(parseInt(count));
            break;

        case 'stats':
            await showMessageStats();
            break;

        case 'search':
            await searchMessages();
            break;

        case 'export':
            await exportMessages();
            break;

        case 'clear':
            await clearMessages();
            break;
    }
}
