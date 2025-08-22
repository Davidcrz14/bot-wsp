import OpenAI from 'openai';
import { activeProfile, profiles } from '../config/database.js';

let chatMemory = {};

function getOpenAIClient() {
    if (!process.env.NVIDIA_API_KEY) {
        throw new Error('NVIDIA_API_KEY no está configurada en las variables de entorno');
    }

    return new OpenAI({
        baseURL: "https://integrate.api.nvidia.com/v1",
        apiKey: process.env.NVIDIA_API_KEY
    });
}

export async function generateAIResponse(message, fromNumber) {
    try {
        let profile = profiles.find(p => p.phone === fromNumber) || activeProfile;
        if (!profile) profile = profiles.find(p => p.active) || profiles[0];

        if (!profile) {
            console.error('No se encontró ningún perfil disponible');
            return 'Perfil no config';
        }

        if (!chatMemory[fromNumber]) {
            chatMemory[fromNumber] = [];
        }

        let tonePrompt = '';
        switch (profile.tone) {
            case 'amigable':
                tonePrompt = 'Responde de manera amigable y cercana.';
                break;
            case 'profesional':
                tonePrompt = 'Mantén un tono profesional y formal.';
                break;
            case 'divertido':
                tonePrompt = 'Sé divertido y usa emojis ocasionalmente.';
                break;
            case 'serio':
                tonePrompt = 'Mantén un tono serio y directo.';
                break;
            default:
                tonePrompt = 'Responde de manera casual y natural.';
        }

        const baseInstruction = profile.systemInstruction || 'Eres un asistente conversacional casual.';
        const styleGuide = profile.customStyle || 'Responde de manera natural y amigable.';

        const responseGuidelines = `
INSTRUCCIONES DE RESPUESTA:
- Mantén las respuestas EXTREMADAMENTE cortas (máximo 1-2 líneas)
- Usa expresiones mexicanas naturales como "xd", "ps", "we", "bro", "tons", "nel", "ajam", "nmms", "alv", "oc", "ntp", "smn", "sha", "tranca"
- Si te saludan con "hola" responde "ola" o "que tal" o "que pasho"
- Si te preguntan cómo estás, responde cosas como "aquí andamos", "todo bien", "ps ahí", "tranca"
- Para despedidas usa "nos vemos", "bye", "sha"
- Para confirmaciones usa "ajam", "si", "oc", "zi"
- Para negaciones usa "nel", "nop", "no"
- Responde de manera muy casual y relajada
- A veces responde solo con "xd" si algo es gracioso`;

        const systemPrompt = `${baseInstruction}

${tonePrompt}

ESTILO: ${styleGuide}

${responseGuidelines}`;

        console.log('🎭 Perfil usado:', profile.name);
        console.log('📝 System prompt construido con:', {
            baseInstruction: baseInstruction.substring(0, 50) + '...',
            tonePrompt,
            styleGuide: styleGuide.substring(0, 50) + '...'
        });

        const messages = [
            {
                role: "system",
                content: systemPrompt
            }
        ];

        const recentMemory = chatMemory[fromNumber].slice(-10);
        messages.push(...recentMemory);

        messages.push({
            role: "user",
            content: message
        });

        let aiResponse = '';

        try {
            const client = getOpenAIClient();
            const completion = await client.chat.completions.create({
                model: "nvidia/llama-3.1-nemotron-70b-instruct",
                messages: messages,
                temperature: 0.7,
                max_tokens: 100,
                stream: false
            });

            if (!completion.choices || completion.choices.length === 0) {
                return 'El modelo no responde';
            }

            aiResponse = completion.choices[0].message.content;
            if (aiResponse) {
                aiResponse = aiResponse.trim();
            }

            if (!aiResponse) {
                return 'Lol';
            }
        } catch (apiError) {
            console.error('❌ Error con modelo principal:', apiError.message);

            try {
                const client = getOpenAIClient();
                const completion = await client.chat.completions.create({
                    model: "meta/llama-3.1-8b-instruct",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 100,
                    stream: false
                });

                aiResponse = completion.choices[0].message.content;
                if (aiResponse) {
                    aiResponse = aiResponse.trim();
                }

                if (!aiResponse) {
                    return 'ps no sé qué decir xd';
                }
            } catch (secondError) {
                console.error('Error con modelo alternativo:', secondError.message);
                return 'Algo salio mal';
            }
        }

        if (aiResponse.length > 80) {
            const sentences = aiResponse.split(/[.!?]/);
            aiResponse = sentences[0].trim();

            if (aiResponse.length > 80) {
                aiResponse = aiResponse.substring(0, 77) + '...';
            }
        }

        chatMemory[fromNumber].push({
            role: "user",
            content: message
        });

        chatMemory[fromNumber].push({
            role: "assistant",
            content: aiResponse
        });

        if (chatMemory[fromNumber].length > 40) {
            chatMemory[fromNumber] = chatMemory[fromNumber].slice(-40);
        }

        return aiResponse;
    } catch (error) {
        console.error('Error al generar respuesta con GPT:', error);
        return 'nel, algo salió mal xd';
    }
}
export async function analyzeConversationStyle(chatNumber, chatHistoryData) {
    try {
        const history = chatHistoryData[chatNumber];
        if (!history || history.length < 5) {
            return 'No hay suficiente historial para analizar el estilo de conversación.';
        }

        const recentMessages = history.slice(-20);
        const conversationText = recentMessages.map(msg =>
            `${msg.fromMe ? 'Yo' : 'Contacto'}: ${msg.body}`
        ).join('\n');

        const analysisPrompt = `Analiza el siguiente historial de conversación y describe el estilo de comunicación de la persona (tono, uso de emojis, longitud de mensajes, expresiones características, etc.):\n\n${conversationText}\n\nDescribe el estilo en un párrafo conciso que pueda usarse para replicar este estilo de conversación.`;

        try {
            const client = getOpenAIClient();
            const completion = await client.chat.completions.create({
                model: "nvidia/llama-3.1-nemotron-70b-instruct",
                messages: [
                    {
                        role: "user",
                        content: analysisPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 300
            });

            return completion.choices[0].message.content.trim();
        } catch (primaryError) {
            console.error('Error con modelo principal en análisis:', primaryError.message);

            const client = getOpenAIClient();
            const completion = await client.chat.completions.create({
                model: "meta/llama-3.1-8b-instruct",
                messages: [
                    {
                        role: "user",
                        content: analysisPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 300
            });

            return completion.choices[0].message.content.trim();
        }
    } catch (error) {
        console.error('Error al analizar estilo de conversación:', error);
        return 'Error al analizar el estilo de conversación.';
    }
}


export function clearChatMemory(chatNumber) {
    if (chatMemory[chatNumber]) {
        delete chatMemory[chatNumber];
    }
}

export function getChatMemory(chatNumber) {
    return chatMemory[chatNumber] || [];
}

export function getAllChatMemory() {
    return chatMemory;
}
