# WhatsApp Bot con IA - Estilo Natural Mexicano

## Descripción
Bot de WhatsApp que simula conversaciones naturales usando un modelo de Gemini.

## Características Principales

### 🎭 Personalidad Natural
- **Estilo de conversación**: Joven mexicano casual de 20 años
- **Respuestas cortas**: Máximo 1-2 líneas, muy directo
- **Modismos mexicanos**: "xd", "ps", "we", "bro", "tons", "nel", "ajam", "nmms", "alv", "oc", "ntp", "smn", "sha", "tranca"
- **Saludos naturales**: "ola" en lugar de "hola", "que pasho", "que tal"
- **Respuestas auténticas**: "aquí andamos", "todo bien", "ps ahí", "tranca"

### 🤖 Configuración de IA
- **Modelo**: Gemini 2.0 Flash
- **Tokens limitados**: Máximo 50 tokens para respuestas cortas
- **Alta creatividad**: Temperature 1.0 para variabilidad
- **Respuestas máximo 80 caracteres**: Para mantener naturalidad

### 📱 Funcionalidades
- Respuestas automáticas con IA
- Sistema de perfiles personalizable
- Historial de conversaciones
- Lista negra de contactos
- Análisis de estilo de conversación


## Instalación

1. **Clonar el repositorio**
```bash
git clone <https://github.com/Davidcrz14/bot-wsp>
cd whatsapp-bot
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crea un archivo `.env` con:
```env
GEMINI_API_KEY=tu_api_key_de_gemini
```

4. **Ejecutar el bot**
```bash
npm start
# o
node index.js start
```

## Uso

### Iniciar el Bot
```bash
node index.js start
```

### Comandos Disponibles
- `start` - Iniciar el bot
- `profiles` - Gestionar perfiles
- `messages` - Ver historial de mensajes
- `blacklist` - Gestionar lista negra

## Configuración del Perfil

El bot viene preconfigurado con el perfil "David" que incluye:

```json
{
  "name": "David",
  "tone": "casual",
  "systemInstruction": "Eres David, un joven mexicano real de 20 años...",
  "customStyle": "Habla como un joven mexicano real, usa modismos..."
}
```

## Ejemplos de Conversación

**Usuario**: "Hola, ¿cómo estás?"
**Bot**: "ola, aquí andamos"

**Usuario**: "¿Qué haces?"
**Bot**: "ps nada, tu que tal"

**Usuario**: "¿Está David?"
**Bot**: "nel, no se encuentra por el momento"

**Usuario**: "Gracias"
**Bot**: "ntp bro"

## Archivos de Configuración

- `profiles.json` - Perfiles de conversación
- `messages.json` - Historial de mensajes
- `chat-history.json` - Historial completo de chats
- `blacklist.json` - Contactos bloqueados


## Tecnologías Utilizadas

- **Node.js** - Runtime de JavaScript
- **whatsapp-web.js** - Librería para WhatsApp Web
- **Google Generative AI** - IA para generar respuestas
- **Commander.js** - CLI interface
- **dotenv** - Gestión de variables de entorno

## Características Técnicas

### Optimizaciones para Naturalidad
- **Respuestas ultra-cortas**: Limitadas a 80 caracteres
- **Corte inteligente**: Evita cortar palabras a la mitad
- **Tokens limitados**: Solo 50 tokens para forzar brevedad
- **Alta temperatura**: Para respuestas más variadas y naturales

### Sistema de Instrucciones Mejorado
- Instrucciones específicas para cada tipo de respuesta
- Ejemplos concretos de expresiones a usar
- Contexto cultural mexicano integrado
- Personalidad consistente y auténtica

## Próximas Mejoras


- [ ] Respuestas con multimedia
- [ ] Aprendizaje de patrones de conversación
- [ ] Múltiples personalidades
- [ ] Respuestas programadas

