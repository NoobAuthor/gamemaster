# 🎮 Game Master - Sistema de Control de Salas de Escape

Un sistema de gestión completo para salas de escape con temporizadores sincronizados, sistema de pistas multilenguaje y soporte para Chrome Cast.

## ✨ Características Principales

### 🏠 Gestión de Salas
- **5 salas independientes** con pestañas para control individual
- **Estado independiente** para cada sala sin interferencia entre ellas
- **Panel de control unificado** para gestión simultánea

### ⏱️ Temporizador Sincronizado
- **Control en tiempo real**: Iniciar, pausar, reiniciar y modificar tiempo manualmente (+/-)
- **Sincronización automática** entre dispositivos usando WebSockets
- **Persistencia de estado**: El temporizador no se reinicia al actualizar la página
- **Indicadores visuales** según el tiempo restante (normal, advertencia, crítico)

### 📺 Vista Chrome Cast (Modo TV)
- **Botón dedicado** para abrir vista simplificada compatible con casting
- **Diseño optimizado** para pantallas grandes y visualización a distancia
- **Información en tiempo real**: temporizador, estado, pistas restantes y mensajes
- **Diseño responsive** que se adapta a diferentes resoluciones

### 💡 Sistema de Pistas Avanzado
- **Indicadores visuales** de pistas restantes (3 por defecto, personalizable)
- **Biblioteca de pistas reutilizables** organizadas por categorías:
  - General
  - Puzzles  
  - Búsqueda
  - Final
  - Personalizada
- **Creación de pistas en tiempo real** desde el frontend
- **Almacenamiento en base de datos** con versionado
- **Analytics de uso** para optimizar pistas
- **Gestión dinámica**: Agregar pistas adicionales durante el juego

### 🌐 Soporte Multilenguaje
- **4 idiomas incluidos**: Español, Inglés, Francés, Alemán
- **Pistas traducidas** automáticamente según idioma seleccionado
- **Interfaz multilenguaje** con cambio dinámico
- **Mensajes localizados** para cada idioma

### 💬 Sistema de Mensajes
- **Mensajes predefinidos** por idioma para comunicación rápida
- **Mensajes personalizados** con editor de texto libre
- **Historial de mensajes** con timestamps y idioma utilizado
- **Visualización en tiempo real** en la vista TV

### 🔄 Funcionalidad de Reinicio
- **Reinicio inteligente**: Restablece temporizador, pistas y estado de sala
- **Preserva biblioteca**: No elimina pistas guardadas en la base de datos
- **Confirmación de seguridad** para evitar reinicios accidentales

## 🚀 Instalación y Configuración

### Prerrequisitos
- **Node.js** (versión 18 o superior)
- **npm** (incluido con Node.js)

### Instalación Local

1. **Clonar o descargar el proyecto**
   ```bash
   git clone <url-del-proyecto>
   cd gamemaster
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar entorno de desarrollo**
   ```bash
   # Terminal 1: Iniciar servidor backend
   npm run dev:server
   # Terminal 2: Iniciar cliente frontend  
   npm run dev
   ```

4. **Acceder a la aplicación**
   - **Panel de control**: http://localhost:5173
   - **Vista TV**: http://localhost:5173?tv=true&room=0
   - **API Backend**: http://localhost:3001

### Desarrollo Completo (Un Solo Comando)
```bash
npm run dev:full
```
Este comando ejecuta frontend y backend simultáneamente.

## 📱 Uso de la Aplicación

### Panel Principal
1. **Seleccionar Sala**: Usar las pestañas superiores para cambiar entre salas
2. **Control de Tiempo**: 
   - ▶️ Iniciar/Pausar temporizador
   - 🔄 Reiniciar a 60 minutos
   - ➕➖ Ajustar tiempo en incrementos de 1 o 5 minutos
   - ⚙️ Establecer tiempo personalizado

### Envío de Pistas
1. **Pistas Predefinidas**: Seleccionar de la biblioteca organizada por categorías
2. **Pistas Personalizadas**: Escribir mensaje personalizado
3. **Gestión**: Agregar pistas adicionales durante el juego
4. **Idioma**: Cambiar idioma afecta las pistas mostradas

### Sistema de Mensajes
1. **Mensajes Rápidos**: Botones predefinidos según idioma
2. **Mensaje Personalizado**: Editor de texto libre
3. **Historial**: Ver mensajes enviados con timestamps

### Vista Chrome Cast
1. **Acceso**: Hacer clic en "📺 Vista TV" en el panel principal
2. **Casting**: Usar la función de Chrome Cast del navegador
3. **Información Mostrada**:
   - Temporizador en grande con código de colores
   - Estado de la sala (corriendo/pausado/terminado)
   - Indicadores de pistas restantes
   - Último mensaje enviado
   - Estado de conexión

## 🏗️ Arquitectura Técnica

### Frontend (Svelte + TypeScript)
- **Framework**: Svelte 5 con Vite
- **Estilo**: CSS moderno con variables y gradientes
- **Comunicación**: Socket.IO client para tiempo real
- **Responsive**: Adaptable a móviles y pantallas grandes

### Backend (Node.js + Express)
- **Servidor**: Express.js con Socket.IO
- **Base de Datos**: SQLite3 con esquema profesional
- **Sincronización**: WebSockets para tiempo real
- **API REST**: CRUD completo para salas y pistas
- **Analytics**: Tracking de uso de pistas y estadísticas

### Base de Datos
- **SQLite** (`server/gamemaster.db`)
- **ACID compliance** para integridad de datos
- **Backup automático** y recuperación
- **Schema profesional**:
  ```sql
  rooms: id, name, time_remaining, is_running, hints_remaining, last_message
  hints: id, text_es, text_en, text_fr, text_de, category, created_by
  hint_usage: room_id, hint_id, hint_text, language, sent_at (analytics)
  ```

## 🌐 Despliegue en Producción

### Opción 1: Servidor Tradicional

1. **Preparar para producción**
   ```bash
   npm run build
   ```

2. **Subir archivos**
   - Subir carpeta `dist/` al servidor web
   - Subir carpeta `server/` al servidor Node.js
   - Subir `package.json` y `package-lock.json`

3. **Configurar servidor**
   ```bash
   npm install --production
   npm run server
   ```

4. **Configurar reverse proxy** (Nginx/Apache)
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   
   location /socket.io/ {
     proxy_pass http://localhost:3001;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
   }
   ```

### Opción 2: Plataformas Cloud

#### Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

#### Railway/Render
1. Conectar repositorio GitHub
2. Configurar build command: `npm run build`
3. Configurar start command: `npm run server`

#### Heroku
```bash
# Procfile
web: npm run server

# Variables de entorno
NODE_ENV=production
PORT=$PORT
```

### Configuración de Variables de Entorno
```bash
# .env
NODE_ENV=production
PORT=3001
```

## 🔧 Configuración Avanzada

### Personalizar Salas
Editar `server/index.js` línea 22:
```javascript
const initialGameState = {
  rooms: Array.from({ length: 5 }, (_, i) => ({
    // Cambiar cantidad y configuración de salas
  }))
}
```

### Agregar Idiomas
1. Actualizar `src/lib/types.ts`:
   ```typescript
   export type Language = 'es' | 'en' | 'fr' | 'de' | 'pt'
   ```

2. Agregar traducciones en `src/lib/HintSystem.svelte` y componentes

### Personalizar Pistas
Editar archivo `server/gamedata.json` una vez generado:
```json
{
  "hints": [
    {
      "id": "custom_1",
      "text": {
        "es": "Tu pista personalizada",
        "en": "Your custom hint"
      },
      "category": "Personalizada"
    }
  ]
}
```

## 🎯 Casos de Uso

### Para Game Masters
- **Control total** de múltiples salas simultáneamente
- **Comunicación fluida** con equipos mediante pistas y mensajes
- **Monitoreo visual** del progreso en pantallas externas
- **Flexibilidad** para ajustar tiempo y dificultad en tiempo real

### Para Operadores de Escape Rooms
- **Gestión profesional** de múltiples salas de escape
- **Experiencia inmersiva** para los jugadores con vista TV
- **Comunicación multilenguaje** para clientes internacionales
- **Datos persistentes** que no se pierden por fallos técnicos

## 🛠️ Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Solo frontend
npm run dev:server       # Solo backend  
npm run dev:full         # Frontend + Backend

# Producción
npm run build            # Construir para producción
npm run preview          # Vista previa de producción
npm run server           # Ejecutar servidor de producción

# Utilidades
npm run check            # Verificar tipos TypeScript
```

## 📋 Estado de Desarrollo

### ✅ Funcionalidades Completadas
- [x] Gestión de 5 salas independientes
- [x] Temporizadores sincronizados con WebSockets
- [x] Sistema de pistas con biblioteca reutilizable
- [x] Soporte multilenguaje (ES, EN, FR, DE)
- [x] Vista TV optimizada para Chrome Cast
- [x] Sistema de mensajes en tiempo real
- [x] Botón de reinicio inteligente
- [x] Persistencia de datos en archivo JSON
- [x] API REST para gestión de salas
- [x] Interfaz responsive
- [x] Documentación completa

### 🔄 Mejoras Futuras Sugeridas
- [ ] Base de datos SQL para mayor escalabilidad
- [ ] Sistema de autenticación para múltiples operadores
- [ ] Estadísticas y analytics de uso
- [ ] Temas personalizables
- [ ] Notificaciones push
- [ ] Integración con sistemas de booking

## 🐛 Solución de Problemas

### El temporizador no se sincroniza
- Verificar que el backend esté ejecutándose en puerto 3001
- Comprobar la consola del navegador para errores de Socket.IO
- Reiniciar ambos servidores

### La vista TV no se actualiza
- Verificar la URL de la vista TV incluye `?tv=true&room=X`
- Comprobar que el navegador soporta WebSockets
- Verificar conexión de red

### Faltan pistas o mensajes
- Comprobar el archivo `server/gamedata.json`
- Verificar permisos de escritura en el directorio del servidor
- Revisar logs del servidor para errores

### Error de conexión de base de datos
- Verificar que el directorio `server/` tiene permisos de escritura
- Comprobar espacio disponible en disco
- Revisar formato del archivo JSON

## 📞 Soporte

Para problemas técnicos o sugerencias, revisar:
1. **Logs del servidor**: `console.log` en terminal del backend
2. **Consola del navegador**: F12 → Console para errores frontend
3. **Archivo de datos**: `server/gamedata.json` para estado persistente

## 📄 Licencia

Este proyecto está desarrollado para uso en salas de escape. Libre para uso comercial y modificación.

---

**🎮 ¡Disfruta gestionando tus salas de escape con Game Master!**