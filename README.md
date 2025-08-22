# WhatsApp Bot v2.0 - Arquitectura Modular

## 🚀 Principales Cambios

### ✨ Modularización Completa
- **Antes**: Todo el código en `index.js` (Webero de lineas)
- **Ahora**: Código organizado en módulos específicos bajo `src/`

### 🤖 Cambio de IA: Gemini → GPT
- **Antes**: Google Gemini AI
- **Ahora**: Meta por NVIDIA
- **Ventajas**: Mejor rendimiento y respuestas más naturales

## 📁 Nueva Estructura

```
src/
├── config/
│   ├── database.js     # Gestión de datos y persistencia
│   └── client.js       # Configuración del cliente WhatsApp
├── services/
│   ├── ai.js          # Servicio de IA (GPT)
│   └── whatsapp.js    # Manejo de mensajes de WhatsApp
├── commands/
│   ├── profiles.js    # Comandos CLI para perfiles
│   ├── messages.js    # Comandos CLI para mensajes
│   ├── blacklist.js   # Comandos CLI para blacklist
│   └── status.js      # Comandos de estado y difusión
└── models/            # (Reservado para futuras clases)
```


### 📦 Modularización
- **Separación de responsabilidades**: Cada archivo tiene una función específica
- **Mantenibilidad**: Más fácil de mantener y extender
- **Reutilización**: Módulos reutilizables entre comandos
- **Testing**: Más fácil de testear cada componente

# Con amor Daizen
