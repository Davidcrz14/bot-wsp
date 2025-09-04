# 🤖 WhatsApp AI Bot

Un bot inteligente de WhatsApp desarrollado con Node.js y TypeScript que integra IA de NVIDIA para generar respuestas automáticas. Incluye un panel web en tiempo real para monitoreo y control.

## ✨ Características

- 📱 **Integración con WhatsApp Web** usando whatsapp-web.js
- 🧠 **IA Integrada** con NVIDIA GPT para respuestas automáticas
- 🌐 **Panel Web en Tiempo Real** con WebSocket para monitoreo
- 💬 **Sistema de Comandos** personalizable
- 🔄 **Reconexión Automática** y manejo robusto de errores
- 📊 **Dashboard Web** para enviar mensajes y ver estadísticas
- 🎯 **TypeScript** con tipado estricto
- 🏗️ **Arquitectura Modular** y código limpio

## 🚀 Instalación Rápida

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
copy .env.example .env
```

Edita el archivo `.env` y agrega tu clave de API de NVIDIA:

```env
NVIDIA_API_KEY=tu_clave_api_nvidia_aqui
NVIDIA_API_URL=https://integrate.api.nvidia.com/v1
WEB_PORT=3000
WEB_HOST=localhost
BOT_NAME=WhatsApp AI Bot
BOT_PREFIX=!
NODE_ENV=development
```

### 3. Ejecutar en Modo Desarrollo

```bash
npm run dev
```

### 4. Abrir Panel Web

Abre tu navegador en: http://localhost:3000

### 5. Conectar WhatsApp

1. Escanea el código QR que aparece en el panel web con WhatsApp
2. ¡Listo! El bot está conectado y funcionando

## 📋 Scripts Disponibles

```bash
# Desarrollo con recarga automática
npm run dev

# Desarrollo con nodemon
npm run dev:watch

# Compilar TypeScript
npm run build

# Ejecutar versión compilada
npm start

# Limpiar archivos compilados
npm run clean
```

## 🎮 Comandos del Bot

| Comando | Descripción |
|---------|-------------|
| `!ping` | Verificar que el bot está activo |
| `!help` | Mostrar ayuda y comandos disponibles |
| `!info` | Información del bot y estado |
| `!ai [mensaje]` | Conversar con la IA |

**💡 Tip:** También puedes enviar cualquier mensaje sin comando y el bot responderá usando IA.

## 🌐 Panel Web

El panel web incluye:

- 📊 **Estado de Conexión** en tiempo real
- 💬 **Mensajes Entrantes/Salientes** en tiempo real
- 📱 **Código QR** para conexión
- 📤 **Envío de Mensajes** desde la web
- 📈 **Estadísticas** y controles

## 🏗️ Estructura del Proyecto

```
src/
├── bot/                 # Lógica del bot de WhatsApp
│   ├── WhatsAppBot.ts   # Clase principal del bot
│   ├── commands.ts      # Comandos disponibles
│   └── index.ts         # Exports del módulo
├── web/                 # Panel web y API
│   ├── WebPanel.ts      # Servidor Express + Socket.IO
│   └── index.ts         # Exports del módulo
├── gpt/                 # Integración con IA
│   ├── NvidiaGPTService.ts  # Cliente de NVIDIA API
│   └── index.ts         # Exports del módulo
├── types/               # Definiciones TypeScript
│   └── index.ts         # Interfaces y tipos
├── utils/               # Utilidades
│   └── index.ts         # Helpers y logger
├── config.ts            # Configuración de la app
└── index.ts             # Punto de entrada
```

## ⚙️ Configuración Avanzada

### Configurar NVIDIA API

1. Regístrate en [NVIDIA NGC](https://ngc.nvidia.com/)
2. Genera una clave de API
3. Agrega la clave a tu archivo `.env`

### Personalizar Comandos

Edita `src/bot/commands.ts` para agregar nuevos comandos:

```typescript
export const miComando: CommandHandler = {
  name: 'micomando',
  description: 'Descripción de mi comando',
  execute: async (message: MessageData, args: string[]): Promise<string> => {
    return '¡Hola desde mi comando personalizado!';
  }
};
```

### Configurar Puerto Web

Cambia el puerto del panel web en tu `.env`:

```env
WEB_PORT=8080
WEB_HOST=0.0.0.0
```

## 🛠️ Desarrollo

### Agregar Nuevas Funciones

1. **Nuevos Comandos**: Edita `src/bot/commands.ts`
2. **Nueva API**: Agrega rutas en `src/web/WebPanel.ts`
3. **Nuevos Servicios**: Crea módulos en carpetas apropiadas

### Debugging

```bash
# Ejecutar con logs detallados
NODE_ENV=development npm run dev
```

## 📦 Dependencias Principales

- **whatsapp-web.js**: Conectar con WhatsApp Web
- **express**: Servidor web
- **socket.io**: WebSocket para tiempo real
- **axios**: Cliente HTTP para NVIDIA API
- **typescript**: Tipado estático
- **ts-node**: Ejecutar TypeScript directamente

## 🚨 Solución de Problemas

### Error de QR Code
- Asegúrate de que el puerto 3000 esté libre
- Verifica que WhatsApp Web funcione en tu navegador

### Error de NVIDIA API
- Verifica tu clave de API en `.env`
- Confirma que tienes créditos en tu cuenta de NVIDIA

### Error de Conexión
- Revisa los logs en la consola
- Verifica tu conexión a internet
- Intenta reiniciar el bot

## 📄 Licencia

MIT License - puedes usar este proyecto libremente.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

¿Problemas? Abre un issue en GitHub o consulta la documentación.

---

⭐ **¡Si te gusta este proyecto, dale una estrella!** ⭐


