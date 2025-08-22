import inquirer from 'inquirer';
import { getBotStatus, getClient } from '../config/client.js';
import {
    activeProfile,
    blacklist,
    chatHistory,
    loadBotStatus,
    messages,
    profiles
} from '../config/database.js';
import { broadcastMessage } from '../services/whatsapp.js';

export async function showStatus() {
    const currentStatus = loadBotStatus();
    const runtimeStatus = getBotStatus();

    console.log('\n🤖 Estado del Bot de WhatsApp');
    console.log('='.repeat(40));
    console.log(`📊 Estado del archivo: ${currentStatus === 'connected' ? '✅ Conectado' : '❌ Desconectado'}`);
    console.log(`🔄 Estado en tiempo real: ${runtimeStatus === 'connected' ? '✅ Conectado' : '❌ Desconectado'}`);
    console.log(`🎭 Perfil activo: ${activeProfile ? activeProfile.name : 'Ninguno'}`);
    console.log(`📋 Total de perfiles: ${profiles.length}`);
    console.log(`📨 Mensajes registrados: ${messages.length}`);
    console.log(`💬 Chats en historial: ${Object.keys(chatHistory).length}`);
    console.log(`🚫 Contactos bloqueados: ${blacklist.length}`);

    if (activeProfile) {
        console.log('\n🎭 Información del perfil activo:');
        console.log(`   📛 Nombre: ${activeProfile.name}`);
        console.log(`   📞 Teléfono: ${activeProfile.phone}`);
        console.log(`   🎨 Tono: ${activeProfile.tone}`);
        if (activeProfile.customStyle) {
            console.log(`   ✨ Estilo personalizado: ${activeProfile.customStyle.substring(0, 100)}...`);
        }
    }

    // Mostrar estadísticas de memoria
    const memoryUsage = process.memoryUsage();
    console.log('\n💾 Uso de memoria:');
    console.log(`   📊 RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
    console.log(`   🏗️  Heap usado: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
    console.log(`   📦 Heap total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    console.log(`⏱️  Tiempo ejecutándose: ${hours}h ${minutes}m ${seconds}s`);
}

export async function handleBroadcast() {
    const client = getClient();

    if (!client || getBotStatus() !== 'connected') {
        console.log('❌ El bot no está conectado. No se puede enviar difusión.');
        return;
    }

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
        console.log('📢 Iniciando difusión...');

        try {
            const result = await broadcastMessage(client, message);
            console.log(`\n✅ Difusión completada:`);
            console.log(`📤 Mensajes enviados: ${result.sentCount}`);
            console.log(`❌ Errores: ${result.errorCount}`);
        } catch (error) {
            console.error('❌ Error durante la difusión:', error.message);
        }
    } else {
        console.log('❌ Difusión cancelada.');
    }
}

export async function showSystemInfo() {
    console.log('\n💻 Información del Sistema');
    console.log('='.repeat(40));

    console.log(`🟢 Node.js: ${process.version}`);
    console.log(`🏗️  Arquitectura: ${process.arch}`);
    console.log(`🖥️  Plataforma: ${process.platform}`);
    console.log(`📁 Directorio de trabajo: ${process.cwd()}`);

    console.log(`🔢 PID: ${process.pid}`);
    console.log(`👤 Usuario: ${process.env.USER || process.env.USERNAME || 'No disponible'}`);

    console.log('\n🔐 Configuración:');
    console.log(`🤖 NVIDIA_API_KEY: ${process.env.NVIDIA_API_KEY ? '✅ Configurada' : '❌ No configurada'}`);
    console.log(`📝 NODE_ENV: ${process.env.NODE_ENV || 'No especificado'}`);

    const fs = await import('fs-extra');
    const path = await import('path');

    console.log('\n📂 Archivos de datos:');
    const dataFiles = [
        'profiles.json',
        'messages.json',
        'chat-history.json',
        'blacklist.json',
        'bot-status.json'
    ];

    for (const file of dataFiles) {
        const filePath = path.join(process.cwd(), file);
        try {
            const stats = await fs.stat(filePath);
            const size = Math.round(stats.size / 1024);
            const modified = stats.mtime.toLocaleString();
            console.log(`   📄 ${file}: ${size} KB (modificado: ${modified})`);
        } catch (error) {
            console.log(`   📄 ${file}: ❌ No existe`);
        }
    }
}

export async function runDiagnostics() {
    console.log('\n🔍 Ejecutando diagnósticos...');
    console.log('='.repeat(40));

    let issues = [];
    let warnings = [];

    if (!process.env.NVIDIA_API_KEY) {
        issues.push('❌ NVIDIA_API_KEY no está configurada');
    }

    if (profiles.length === 0) {
        issues.push('❌ No hay perfiles configurados');
    }

    if (!activeProfile) {
        warnings.push('⚠️  No hay perfil activo seleccionado');
    }

    const runtimeStatus = getBotStatus();
    if (runtimeStatus !== 'connected') {
        warnings.push('⚠️  El bot no está conectado a WhatsApp');
    }

    const fs = await import('fs-extra');
    const dataFiles = ['profiles.json', 'messages.json', 'chat-history.json', 'blacklist.json'];

    for (const file of dataFiles) {
        if (!await fs.pathExists(file)) {
            warnings.push(`⚠️  Archivo ${file} no existe`);
        }
    }

    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    if (heapUsedMB > 500) {
        warnings.push(`⚠️  Alto uso de memoria: ${heapUsedMB} MB`);
    }

    if (issues.length === 0 && warnings.length === 0) {
        console.log('✅ ¡Todo está funcionando correctamente!');
    } else {
        if (issues.length > 0) {
            console.log('\n🚨 Problemas críticos:');
            issues.forEach(issue => console.log(`   ${issue}`));
        }

        if (warnings.length > 0) {
            console.log('\n⚠️  Advertencias:');
            warnings.forEach(warning => console.log(`   ${warning}`));
        }
    }

    return { issues, warnings };
}

export async function handleStatusCommand() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: '¿Qué información deseas ver?',
            choices: [
                { name: '📊 Estado general del bot', value: 'status' },
                { name: '💻 Información del sistema', value: 'system' },
                { name: '🔍 Ejecutar diagnósticos', value: 'diagnostics' },
                { name: '📢 Enviar mensaje de difusión', value: 'broadcast' }
            ]
        }
    ]);

    switch (action) {
        case 'status':
            await showStatus();
            break;
        case 'system':
            await showSystemInfo();
            break;
        case 'diagnostics':
            await runDiagnostics();
            break;
        case 'broadcast':
            await handleBroadcast();
            break;
    }
}
