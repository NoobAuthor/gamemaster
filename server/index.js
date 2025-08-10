import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import database from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    // En desarrollo, permitir cualquier origen de la misma red (Vite en 5173)
    origin: process.env.NODE_ENV === 'production' ? false : true,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
})

const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../dist')))

// Initialize database
let gameRooms = []

async function initializeServer() {
  try {
    await database.initialize()
    gameRooms = await database.getAllRooms()
    console.log('✅ Server initialized with database')
  } catch (error) {
    console.error('❌ Failed to initialize server:', error)
    process.exit(1)
  }
}

// Helper function to convert DB room to frontend format
function formatRoomForFrontend(dbRoom) {
  return {
    id: dbRoom.id,
    name: dbRoom.name,
    timeRemaining: dbRoom.time_remaining,
    isRunning: Boolean(dbRoom.is_running),
    hintsRemaining: dbRoom.hints_remaining,
    freeHintsCount: dbRoom.free_hints_count || 3,
    lastMessage: dbRoom.last_message || '',
    players: [] // Players are managed in memory for real-time features
  }
}

// Timer for updating room timers
setInterval(async () => {
  try {
    const rooms = await database.getAllRooms()
    let hasChanges = false
    
    for (const room of rooms) {
      if (room.is_running && room.time_remaining > 0) {
        const newTime = room.time_remaining - 1
        hasChanges = true
        
        await database.updateRoom(room.id, {
          time_remaining: newTime,
          is_running: newTime > 0,
          hints_remaining: room.hints_remaining,
          free_hints_count: room.free_hints_count,
          last_message: room.last_message
        })
        
        // Emit real-time update
        io.emit('time-sync', {
          roomId: room.id,
          timeRemaining: newTime,
          isRunning: newTime > 0
        })
        
        // Stop timer when reaching 0
        if (newTime <= 0) {
          const updatedRoom = await database.getRoom(room.id)
          io.emit('room-updated', formatRoomForFrontend(updatedRoom))
        }
      }
    }
  } catch (error) {
    console.error('❌ Timer update error:', error)
  }
}, 1000)

// API Routes

// Config endpoint for client
app.get('/api/config', (req, res) => {
  res.json({
    obligatoryLanguages: ['es', 'en'],
    defaultFreeHints: 3,
    hintPenaltySeconds: 120
  })
})

// Get all rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await database.getAllRooms()
    res.json(rooms.map(formatRoomForFrontend))
  } catch (error) {
    console.error('❌ Error fetching rooms:', error)
    res.status(500).json({ error: 'Failed to fetch rooms' })
  }
})

// Get specific room
app.get('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id)
    const room = await database.getRoom(roomId)
    
    if (room) {
      res.json(formatRoomForFrontend(room))
    } else {
      res.status(404).json({ error: 'Room not found' })
    }
  } catch (error) {
    console.error('❌ Error fetching room:', error)
    res.status(500).json({ error: 'Failed to fetch room' })
  }
})

// Update room name
app.put('/api/rooms/:id/name', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id)
    const { name } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Room name is required' })
    }

    const room = await database.get('SELECT * FROM rooms WHERE id = ?', [roomId])
    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    await database.run('UPDATE rooms SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name.trim(), roomId])
    const updatedRoom = await database.getRoom(roomId)
    const formattedRoom = formatRoomForFrontend(updatedRoom)
    
    io.emit('room-updated', formattedRoom)
    res.json(formattedRoom)
  } catch (error) {
    console.error('❌ Error updating room name:', error)
    res.status(500).json({ error: 'Failed to update room name' })
  }
})

// Reset room
app.post('/api/rooms/:id/reset', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id)
    const room = await database.resetRoom(roomId)
    
    if (room) {
      const formattedRoom = formatRoomForFrontend(room)
      io.emit('room-updated', formattedRoom)
      res.json(formattedRoom)
    } else {
      res.status(404).json({ error: 'Room not found' })
    }
  } catch (error) {
    console.error('❌ Error resetting room:', error)
    res.status(500).json({ error: 'Failed to reset room' })
  }
})

// Hints API

// Get all hints (legacy - backward compatibility)
app.get('/api/hints', async (req, res) => {
  try {
    const hints = await database.getAllHints()
    res.json(hints)
  } catch (error) {
    console.error('❌ Error fetching hints:', error)
    res.status(500).json({ error: 'Failed to fetch hints' })
  }
})

// Get hints for a specific room
app.get('/api/rooms/:roomId/hints', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const hints = await database.getHintsByRoom(roomId)
    res.json(hints)
  } catch (error) {
    console.error('❌ Error fetching room hints:', error)
    res.status(500).json({ error: 'Failed to fetch room hints' })
  }
})

// Update hint positions (drag-and-drop ordering)
app.put('/api/rooms/:roomId/hints/reorder', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const { orderedIds } = req.body
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds array is required' })
    }
    await database.run('BEGIN TRANSACTION')
    try {
      let position = 0
      for (const id of orderedIds) {
        await database.run('UPDATE hints SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (room_id = ? OR room_id IS NULL)', [position++, id, roomId])
      }
      await database.run('COMMIT')
      res.json({ success: true })
    } catch (e) {
      await database.run('ROLLBACK')
      throw e
    }
  } catch (error) {
    console.error('❌ Error reordering hints:', error)
    res.status(500).json({ error: 'Failed to reorder hints' })
  }
})

// Create hint for a specific room
app.post('/api/rooms/:roomId/hints', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const { text, category } = req.body
    
    // Validation
    if (!text || !category) {
      return res.status(400).json({ 
        error: 'Text and category are required',
        details: 'text should be an object with language keys (es, en, fr, de) or a string'
      })
    }

    // Handle text input - if string, use for Spanish and mark others as pending translation
    let textObj = text
    if (typeof text === 'string') {
      textObj = {
        es: text,
        en: `[EN] ${text}`,
        fr: `[FR] ${text}`,
        de: `[DE] ${text}`
      }
    }

    const result = await database.createHintForRoom(roomId, {
      text: textObj,
      category,
      created_by: 'gamemaster'
    })

    // Convert DB format to frontend format
    const newHint = {
      id: result.id,
      text: {
        es: result.text_es,
        en: result.text_en,
        fr: result.text_fr,
        de: result.text_de
      },
      category: result.category,
      room_id: result.room_id,
      created_at: result.created_at,
      created_by: result.created_by
    }

    res.status(201).json(newHint)
  } catch (error) {
    console.error('❌ Error creating room hint:', error)
    res.status(500).json({ error: 'Failed to create room hint' })
  }
})

// Get hint categories (legacy - backward compatibility)
app.get('/api/hints/categories', async (req, res) => {
  try {
    const categories = await database.getHintCategories()
    res.json(categories)
  } catch (error) {
    console.error('❌ Error fetching categories:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

// Get categories for a specific room
app.get('/api/rooms/:roomId/categories', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const categories = await database.getCategoriesByRoom(roomId)
    res.json(categories)
  } catch (error) {
    console.error('❌ Error fetching room categories:', error)
    res.status(500).json({ error: 'Failed to fetch room categories' })
  }
})

// Reorder categories for a room
app.put('/api/rooms/:roomId/categories/reorder', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const { orderedCategoryIds } = req.body
    if (!Array.isArray(orderedCategoryIds)) {
      return res.status(400).json({ error: 'orderedCategoryIds array is required' })
    }
    await database.run('BEGIN TRANSACTION')
    try {
      let position = 0
      for (const categoryId of orderedCategoryIds) {
        await database.run('UPDATE hint_categories SET position = ? WHERE id = ? AND (room_id = ? OR room_id IS NULL)', [position++, categoryId, roomId])
      }
      await database.run('COMMIT')
      res.json({ success: true })
    } catch (e) {
      await database.run('ROLLBACK')
      throw e
    }
  } catch (error) {
    console.error('❌ Error reordering categories:', error)
    res.status(500).json({ error: 'Failed to reorder categories' })
  }
})

// Create category for a specific room
app.post('/api/rooms/:roomId/categories', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const { name } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    await database.createCategoryForRoom(roomId, name.trim())
    const categories = await database.getCategoriesByRoom(roomId)
    
    res.status(201).json({ 
      success: true, 
      message: 'Category created successfully',
      categories 
    })
  } catch (error) {
    console.error('❌ Error creating room category:', error)
    res.status(500).json({ error: 'Failed to create room category' })
  }
})

// Update category for a specific room
app.put('/api/rooms/:roomId/categories/:oldName', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const oldName = decodeURIComponent(req.params.oldName)
    const { newName } = req.body
    
    if (!newName || !newName.trim()) {
      return res.status(400).json({ error: 'New category name is required' })
    }

    const result = await database.updateCategoryForRoom(roomId, oldName, newName.trim())
    
    if (result.success) {
      const categories = await database.getCategoriesByRoom(roomId)
      res.json({ 
        success: true, 
        message: 'Category updated successfully',
        categories 
      })
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    console.error('❌ Error updating room category:', error)
    res.status(500).json({ error: 'Failed to update room category' })
  }
})

// Delete category for a specific room
app.delete('/api/rooms/:roomId/categories/:categoryName', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const categoryName = decodeURIComponent(req.params.categoryName)
    
    const result = await database.deleteCategoryFromRoom(roomId, categoryName)
    
    if (result.success) {
      const categories = await database.getCategoriesByRoom(roomId)
      res.json({ 
        success: true, 
        message: 'Category deleted successfully',
        categories 
      })
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    console.error('❌ Error deleting room category:', error)
    res.status(500).json({ error: 'Failed to delete room category' })
  }
})

// Room-specific messages API
// Get messages for a specific room and language
app.get('/api/rooms/:roomId/messages/:language', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const language = req.params.language
    
    const messages = await database.getMessagesByRoom(roomId, language)
    res.json(messages)
  } catch (error) {
    console.error('❌ Error fetching room messages:', error)
    res.status(500).json({ error: 'Failed to fetch room messages' })
  }
})

// Get all messages for a room grouped by language
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const rows = await database.all(
      'SELECT id, language, message FROM room_messages WHERE room_id = ? AND is_active = 1 ORDER BY created_at ASC',
      [roomId]
    )
    const grouped = {}
    for (const row of rows) {
      if (!grouped[row.language]) grouped[row.language] = []
      grouped[row.language].push({ id: row.id, message: row.message })
    }
    res.json(grouped)
  } catch (error) {
    console.error('❌ Error fetching all room messages:', error)
    res.status(500).json({ error: 'Failed to fetch room messages' })
  }
})

// Create message for a specific room
app.post('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const { language, message } = req.body
    
    if (!language || !message || !message.trim()) {
      return res.status(400).json({ error: 'Language and message are required' })
    }

    await database.createMessageForRoom(roomId, language, message.trim())
    const messages = await database.getMessagesByRoom(roomId, language)
    
    res.status(201).json({ 
      success: true, 
      message: 'Message created successfully',
      messages 
    })
  } catch (error) {
    console.error('❌ Error creating room message:', error)
    res.status(500).json({ error: 'Failed to create room message' })
  }
})

// Delete message from a specific room
app.delete('/api/rooms/:roomId/messages/:messageId', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    const messageId = parseInt(req.params.messageId)
    
    await database.deleteMessageFromRoom(roomId, messageId)
    
    res.json({ 
      success: true, 
      message: 'Message deleted successfully'
    })
  } catch (error) {
    console.error('❌ Error deleting room message:', error)
    res.status(500).json({ error: 'Failed to delete room message' })
  }
})

// Create new hint
app.post('/api/hints', async (req, res) => {
  try {
    const { text, category } = req.body
    
    // Validation
    if (!text || !category) {
      return res.status(400).json({ 
        error: 'Text and category are required',
        details: 'text should be an object with language keys (es, en, fr, de) or a string'
      })
    }

    // Handle text input - if string, use for Spanish and mark others as pending translation
    let textObj = text
    if (typeof text === 'string') {
      textObj = {
        es: text,
        en: `[EN] ${text}`,
        fr: `[FR] ${text}`,
        de: `[DE] ${text}`
      }
    }

    const result = await database.createHint({
      text: textObj,
      category,
      created_by: 'gamemaster'
    })

    // Convert DB format to frontend format
    const newHint = {
      id: result.id,
      text: {
        es: result.text_es,
        en: result.text_en,
        fr: result.text_fr,
        de: result.text_de
      },
      category: result.category,
      created_at: result.created_at,
      created_by: result.created_by
    }

    res.status(201).json(newHint)
  } catch (error) {
    console.error('❌ Error creating hint:', error)
    res.status(500).json({ error: 'Failed to create hint' })
  }
})

// Update hint
app.put('/api/hints/:id', async (req, res) => {
  try {
    const hintId = req.params.id
    const { text, category } = req.body
    
    if (!text || !category) {
      return res.status(400).json({ 
        error: 'Text and category are required'
      })
    }

    // Handle text input - if string, use for Spanish and mark others as pending translation
    let textObj = text
    if (typeof text === 'string') {
      textObj = {
        es: text,
        en: `[EN] ${text}`,
        fr: `[FR] ${text}`,
        de: `[DE] ${text}`
      }
    }

    await database.run(
      `UPDATE hints SET 
       text_es = ?, text_en = ?, text_fr = ?, text_de = ?, 
       category = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [textObj.es, textObj.en, textObj.fr, textObj.de, category, hintId]
    )

    const updatedHint = await database.get('SELECT * FROM hints WHERE id = ?', [hintId])
    if (updatedHint) {
      const formattedHint = {
        id: updatedHint.id,
        text: {
          es: updatedHint.text_es,
          en: updatedHint.text_en,
          fr: updatedHint.text_fr,
          de: updatedHint.text_de
        },
        category: updatedHint.category,
        created_at: updatedHint.created_at,
        created_by: updatedHint.created_by
      }
      res.json(formattedHint)
    } else {
      res.status(404).json({ error: 'Hint not found' })
    }
  } catch (error) {
    console.error('❌ Error updating hint:', error)
    res.status(500).json({ error: 'Failed to update hint' })
  }
})

// Delete hint
app.delete('/api/hints/:id', async (req, res) => {
  try {
    const hintId = req.params.id
    const result = await database.deleteHint(hintId)
    res.json(result)
  } catch (error) {
    console.error('❌ Error deleting hint:', error)
    res.status(500).json({ error: 'Failed to delete hint' })
  }
})

// Analytics API
app.get('/api/analytics/hints', async (req, res) => {
  try {
    const { roomId, days = 30 } = req.query
    const stats = await database.getHintUsageStats(roomId ? parseInt(roomId) : null, parseInt(days))
    res.json(stats)
  } catch (error) {
    console.error('❌ Error fetching analytics:', error)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: database.isInitialized ? 'connected' : 'disconnected'
  })
})

// Language management endpoints
app.get('/api/languages', async (req, res) => {
  try {
    const languages = await database.getAllLanguages()
    res.json(languages)
  } catch (error) {
    console.error('❌ Error fetching languages:', error)
    res.status(500).json({ error: 'Failed to fetch languages' })
  }
})

app.post('/api/languages', async (req, res) => {
  try {
    const { code, name, flag } = req.body
    
    if (!code || !name) {
      return res.status(400).json({ error: 'Language code and name are required' })
    }

    const language = await database.createLanguage(code, name, flag || '')
    res.status(201).json(language)
  } catch (error) {
    console.error('❌ Error creating language:', error)
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Language code already exists' })
    } else {
      res.status(500).json({ error: 'Failed to create language' })
    }
  }
})

app.put('/api/languages/:code', async (req, res) => {
  try {
    const { code } = req.params
    const { name, flag } = req.body
    
    if (!name) {
      return res.status(400).json({ error: 'Language name is required' })
    }

    const language = await database.updateLanguage(code, name, flag || '')
    if (language) {
      res.json(language)
    } else {
      res.status(404).json({ error: 'Language not found' })
    }
  } catch (error) {
    console.error('❌ Error updating language:', error)
    res.status(500).json({ error: 'Failed to update language' })
  }
})

app.delete('/api/languages/:code', async (req, res) => {
  try {
    const { code } = req.params
    
    // Prevent deletion of obligatory languages only (Spanish and English)
    if (['es', 'en'].includes(code)) {
      return res.status(403).json({ error: 'Cannot delete obligatory language' })
    }

    const deleted = await database.deleteLanguage(code)
    if (deleted) {
      res.json({ message: 'Language deleted successfully' })
    } else {
      res.status(404).json({ error: 'Language not found' })
    }
  } catch (error) {
    console.error('❌ Error deleting language:', error)
    res.status(500).json({ error: 'Failed to delete language' })
  }
})

// Chrome Cast status endpoint
app.get('/api/chromecast-status/:roomId', (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId)
    
    // Consider any open TV window as connected; flag 'casting' when explicitly reported
    let hasTvWindow = 0
    let castingClients = 0
    for (const [, socket] of io.sockets.sockets) {
      if (socket.tvRoomId === roomId) {
        hasTvWindow++
        if (socket.isCasting === true) castingClients++
      }
    }
    const isCasting = castingClients > 0
    
    res.json({
      connected: isCasting,
      casting: isCasting,
      castingClients: castingClients,
      roomId: roomId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error checking Chrome Cast status:', error)
    res.status(500).json({ 
      connected: false, 
      error: 'Failed to check Chrome Cast status' 
    })
  }
})

// Serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id)

  // Send initial state
  socket.emit('initial-state', { rooms: gameRooms })
  
  // Handle Chrome Cast TV window connections
  socket.on('join-tv-room', (roomId) => {
    console.log(`📺 Chrome Cast TV joined room ${roomId}:`, socket.id)
    socket.join(`room-${roomId}`)
    socket.tvRoomId = roomId
    socket.isCasting = false // Initially not casting, just window open
    
    // Don't broadcast connection until actually casting
    console.log(`📱 TV window opened for room ${roomId}, waiting for cast status`)
  })

  // Handle actual Chrome Cast status updates
  socket.on('cast-status-update', (data) => {
    const { roomId, isCasting, timestamp } = data
    console.log(`🎭 Cast status update for room ${roomId}:`, isCasting ? 'Casting' : 'Not casting')
    
    socket.isCasting = isCasting
    
    // Broadcast Chrome Cast status change to all clients
    io.emit('chromecast-status-change', {
      roomId: roomId,
      connected: isCasting,
      timestamp: timestamp || new Date().toISOString()
    })
  })

  // Handle room updates
  socket.on('update-room', async (updatedRoom) => {
    try {
      console.log('🔄 Updating room:', updatedRoom.id)
      
      const dbRoom = await database.updateRoom(updatedRoom.id, {
        time_remaining: updatedRoom.timeRemaining,
        is_running: updatedRoom.isRunning,
        hints_remaining: updatedRoom.hintsRemaining,
        free_hints_count: updatedRoom.freeHintsCount,
        last_message: updatedRoom.lastMessage
      })
      
      const formattedRoom = formatRoomForFrontend(dbRoom)
      socket.broadcast.emit('room-updated', formattedRoom)
    } catch (error) {
      console.error('❌ Error updating room:', error)
      socket.emit('error', { message: 'Failed to update room' })
    }
  })

  // Handle time sync
  socket.on('time-sync', async (data) => {
    try {
      const room = await database.getRoom(data.roomId)
      if (room) {
        await database.updateRoom(data.roomId, {
          time_remaining: data.timeRemaining,
          is_running: data.isRunning,
          hints_remaining: room.hints_remaining,
          free_hints_count: room.free_hints_count,
          last_message: room.last_message
        })
        socket.broadcast.emit('time-sync', data)
      }
    } catch (error) {
      console.error('❌ Error syncing time:', error)
    }
  })

  // Handle hint sending
  socket.on('hint-sent', async (data) => {
    try {
      console.log('💡 Hint sent to room:', data.roomId, '- Hint:', data.hint)
      
      const room = await database.getRoom(data.roomId)
      if (room) {
        // Log hint usage for analytics
        await database.logHintUsage(data.roomId, data.hintId || 'custom', data.hint, data.language)
        
        // Calculate if this hint requires time penalty
        // Game master can send unlimited hints, but penalty applies when no free hints remaining
        const freeHintsUsed = (room.free_hints_count || 3) - room.hints_remaining + 1
        const isUsingFreeHint = room.hints_remaining > 0 && freeHintsUsed <= (room.free_hints_count || 3)
        
        // Apply time penalty if no free hints remaining or hints count is 0
        let newTimeRemaining = room.time_remaining
        if (!isUsingFreeHint) {
          newTimeRemaining = Math.max(0, room.time_remaining - 120) // Subtract 2 minutes (120 seconds)
          console.log(`⏰ Time penalty applied: -2 minutes. New time: ${newTimeRemaining}`)
        }
        
        // Only decrement hints count if there are hints remaining
        // Game master can send hints even when count is 0, but no decrement happens
        const newHintsRemaining = room.hints_remaining > 0 ? Math.max(0, room.hints_remaining - 1) : 0
        
        // Update room hints count and time
        await database.updateRoom(data.roomId, {
          time_remaining: newTimeRemaining,
          is_running: room.is_running,
          hints_remaining: newHintsRemaining,
          free_hints_count: room.free_hints_count,
          last_message: room.last_message
        })
        
        const updatedRoom = await database.getRoom(data.roomId)
        io.emit('hint-sent', { ...data, timePenaltyApplied: !isUsingFreeHint })
        io.emit('room-updated', formatRoomForFrontend(updatedRoom))
      }
    } catch (error) {
      console.error('❌ Error sending hint:', error)
      socket.emit('error', { message: 'Failed to send hint' })
    }
  })

  // Handle message sending
  socket.on('message-sent', async (data) => {
    try {
      console.log('💬 Message sent to room:', data.roomId, '- Message:', data.message)
      
      const room = await database.getRoom(data.roomId)
      if (room) {
        await database.updateRoom(data.roomId, {
          time_remaining: room.time_remaining,
          is_running: room.is_running,
          hints_remaining: room.hints_remaining,
          free_hints_count: room.free_hints_count,
          last_message: data.message
        })
        
        const updatedRoom = await database.getRoom(data.roomId)
        io.emit('message-sent', data)
        io.emit('room-updated', formatRoomForFrontend(updatedRoom))
      }
    } catch (error) {
      console.error('❌ Error sending message:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  // Handle room reset
  socket.on('reset-room', async (roomId) => {
    try {
      console.log('🔄 Resetting room:', roomId)
      const room = await database.resetRoom(roomId)
      const formattedRoom = formatRoomForFrontend(room)
      io.emit('room-updated', formattedRoom)
      io.emit('room-reset', roomId)
    } catch (error) {
      console.error('❌ Error resetting room:', error)
      socket.emit('error', { message: 'Failed to reset room' })
    }
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id)
    
    // If this was a Chrome Cast TV window, check if casting status changed
    if (socket.tvRoomId) {
      const roomId = socket.tvRoomId
      const wasCasting = socket.isCasting
      
      console.log(`📺 TV window disconnected from room ${roomId} (was casting: ${wasCasting})`)
      
      // Check if there are still other casting connections for this room
      let stillCasting = false
      for (const [socketId, otherSocket] of io.sockets.sockets) {
        if (otherSocket.tvRoomId === roomId && otherSocket.isCasting === true && socketId !== socket.id) {
          stillCasting = true
          break
        }
      }
      
      // Only broadcast if casting status actually changed
      if (wasCasting || stillCasting !== wasCasting) {
        io.emit('chromecast-status-change', {
          roomId: roomId,
          connected: stillCasting,
          timestamp: new Date().toISOString()
        })
      }
    }
  })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📁 Shutting down server gracefully...')
  await database.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n📁 Shutting down server gracefully...')
  await database.close()
  process.exit(0)
})

// Start server
initializeServer().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Game Master Server running on port ${PORT}`)
    console.log(`📊 API available at http://localhost:${PORT}/api`)
    console.log(`💾 Database initialized: gamemaster.db`)
    console.log(`🔗 WebSocket ready for real-time communication`)
  })
}).catch((error) => {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
})

export default app