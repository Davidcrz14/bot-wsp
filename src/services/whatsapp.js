import {
    activeProfile,
    blacklist,
    chatHistory,
    messages,
    saveChatHistory,
    saveMessages
} from '../config/database.js';
import { generateAIResponse } from './ai.js';

export async function handleMessage(message) {
    try {
        if (message.from.includes('@g.us') || message.fromMe) {
            return;
        }

        if (blacklist.includes(message.from)) {
            console.log(`Mensaje ignorado de contacto en lista negra: ${message.from}`);
            return;
        }

        const fromNumber = message.from;
        const messageBody = message.body;
        const contact = await message.getContact();
        const contactName = contact.pushname || contact.name || fromNumber;

        console.log(`Mensaje recibido de ${contactName} (${fromNumber}): ${messageBody}`);

        if (!chatHistory[fromNumber]) {
            chatHistory[fromNumber] = [];
        }

        chatHistory[fromNumber].push({
            timestamp: new Date().toISOString(),
            fromMe: false,
            body: messageBody,
            type: message.type
        });

        console.log('Generando respuesta...');
        const aiResponse = await generateAIResponse(messageBody, fromNumber);

        await message.reply(aiResponse);
        console.log(`Respuesta enviada: ${aiResponse}`);

        chatHistory[fromNumber].push({
            timestamp: new Date().toISOString(),
            fromMe: true,
            body: aiResponse,
            type: 'chat'
        });

        const messageRecord = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            from: fromNumber,
            fromName: contactName,
            message: messageBody,
            response: aiResponse,
            profileUsed: activeProfile ? activeProfile.name : 'Default'
        };

        messages.unshift(messageRecord);

        if (messages.length > 1000) {
            messages.splice(1000);
        }

        await saveMessages();
        await saveChatHistory();

    } catch (error) {
        console.error('Error procesando mensaje:', error);

        try {
            await message.reply('nel, algo salió mal xd');
        } catch (replyError) {
            console.error('Error enviando mensaje de error:', replyError);
        }
    }
}

export async function broadcastMessage(client, message) {
    try {
        const chats = await client.getChats();
        let sentCount = 0;
        let errorCount = 0;

        console.log(`Iniciando difusión a ${chats.length} chats...`);

        for (const chat of chats) {
            try {
                if (!chat.isGroup && !blacklist.includes(chat.id._serialized)) {
                    await chat.sendMessage(message);
                    sentCount++;
                    console.log(`Mensaje enviado a: ${chat.name || chat.id.user}`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                errorCount++;
                console.error(`Error enviando a ${chat.name || chat.id.user}:`, error.message);
            }
        }

        console.log('Difusión completada:');
        console.log(`Enviados: ${sentCount}`);
        console.log(`Errores: ${errorCount}`);

        return { sentCount, errorCount };
    } catch (error) {
        console.error('Error en difusión:', error);
        throw error;
    }
}

export function getChatInfo(chatNumber) {
    const formattedNumber = chatNumber.includes('@c.us') ? chatNumber : `${chatNumber}@c.us`;
    const history = chatHistory[formattedNumber] || [];

    return {
        number: formattedNumber,
        messageCount: history.length,
        lastMessage: history[history.length - 1] || null,
        history: history
    };
}

export async function clearChatHistory(chatNumber) {
    const formattedNumber = chatNumber.includes('@c.us') ? chatNumber : `${chatNumber}@c.us`;

    if (chatHistory[formattedNumber]) {
        delete chatHistory[formattedNumber];
        await saveChatHistory();
        return true;
    }

    return false;
}

export function getMessageStats() {
    const totalMessages = messages.length;
    const totalChats = Object.keys(chatHistory).length;
    const averageMessagesPerChat = totalChats > 0 ? (totalMessages / totalChats).toFixed(2) : 0;

    const recentMessages = messages.slice(0, 100);
    const profileUsage = {};

    recentMessages.forEach(msg => {
        const profile = msg.profileUsed || 'Unknown';
        profileUsage[profile] = (profileUsage[profile] || 0) + 1;
    });

    return {
        totalMessages,
        totalChats,
        averageMessagesPerChat,
        profileUsage,
        blacklistedContacts: blacklist.length
    };
}
