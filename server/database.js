import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Database setup
const DATABASE_PATH = join(__dirname, 'gamemaster.db')

class GameDatabase {
  constructor() {
    this.db = null
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DATABASE_PATH, (err) => {
        if (err) {
          console.error('❌ Error opening database:', err.message)
          reject(err)
        } else {
          console.log('✅ Connected to SQLite database')
          this.createTables().then(() => {
            this.isInitialized = true
            resolve()
          }).catch(reject)
        }
      })
    })
  }

  async createTables() {
    const queries = [
      // Rooms table
      `CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        time_remaining INTEGER DEFAULT 3600,
        is_running BOOLEAN DEFAULT 0,
        hints_remaining INTEGER DEFAULT 3,
        free_hints_count INTEGER DEFAULT 3,
        last_message TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Hints table
      `CREATE TABLE IF NOT EXISTS hints (
        id TEXT PRIMARY KEY,
        room_id INTEGER,
        text_es TEXT NOT NULL,
        text_en TEXT NOT NULL,
        text_fr TEXT NOT NULL,
        text_de TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT DEFAULT 'system',
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (room_id) REFERENCES rooms (id)
      )`,

      // New table for dynamic language hint translations
      `CREATE TABLE IF NOT EXISTS hint_translations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hint_id TEXT NOT NULL,
        language_code TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hint_id) REFERENCES hints (id) ON DELETE CASCADE,
        FOREIGN KEY (language_code) REFERENCES languages (code) ON DELETE CASCADE,
        UNIQUE(hint_id, language_code)
      )`,

      // Room-specific quick messages table
      `CREATE TABLE IF NOT EXISTS room_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        language TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (room_id) REFERENCES rooms (id),
        UNIQUE(room_id, language, message)
      )`,

      // Categories table for room-specific categories
      `CREATE TABLE IF NOT EXISTS hint_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (room_id) REFERENCES rooms (id),
        UNIQUE(room_id, name)
      )`,

      // Game sessions table (for analytics)
      `CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        total_time_used INTEGER,
        hints_used INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        FOREIGN KEY (room_id) REFERENCES rooms (id)
      )`,

      // Hint usage log
      `CREATE TABLE IF NOT EXISTS hint_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER,
        hint_id TEXT,
        hint_text TEXT,
        language TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms (id),
        FOREIGN KEY (hint_id) REFERENCES hints (id)
      )`,

      // Languages table for system language management
      `CREATE TABLE IF NOT EXISTS languages (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        flag TEXT DEFAULT '',
        is_default BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ]

    for (const query of queries) {
      await this.run(query)
    }

    // Initialize default data
    await this.initializeDefaultData()
    
    // Run migrations
    await this.runMigrations()
  }

  async runMigrations() {
    try {
      // Migration 1: Check if free_hints_count column exists in rooms table
      const roomsTableInfo = await this.all("PRAGMA table_info(rooms)")
      const hasFreeHintsColumn = roomsTableInfo.some(column => column.name === 'free_hints_count')
      
      if (!hasFreeHintsColumn) {
        console.log('📦 Running migration: Adding free_hints_count column to rooms...')
        await this.run('ALTER TABLE rooms ADD COLUMN free_hints_count INTEGER DEFAULT 3')
        // Update existing rooms to have free_hints_count equal to their current hints_remaining
        await this.run('UPDATE rooms SET free_hints_count = 3 WHERE free_hints_count IS NULL')
        console.log('✅ Migration completed: free_hints_count column added to rooms')
      }

      // Migration 2: Check if hints table has timestamp columns
      const hintsTableInfo = await this.all("PRAGMA table_info(hints)")
      const hasCreatedAt = hintsTableInfo.some(column => column.name === 'created_at')
      const hasUpdatedAt = hintsTableInfo.some(column => column.name === 'updated_at')
      const hasCreatedBy = hintsTableInfo.some(column => column.name === 'created_by')
      const hasIsActive = hintsTableInfo.some(column => column.name === 'is_active')

      if (!hasCreatedAt) {
        console.log('📦 Running migration: Adding created_at column to hints...')
        await this.run('ALTER TABLE hints ADD COLUMN created_at DATETIME DEFAULT NULL')
        // Update existing rows with current timestamp
        await this.run('UPDATE hints SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL')
        console.log('✅ Migration completed: created_at column added to hints')
      }

      if (!hasUpdatedAt) {
        console.log('📦 Running migration: Adding updated_at column to hints...')
        await this.run('ALTER TABLE hints ADD COLUMN updated_at DATETIME DEFAULT NULL')
        // Update existing rows with current timestamp
        await this.run('UPDATE hints SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL')
        console.log('✅ Migration completed: updated_at column added to hints')
      }

      if (!hasCreatedBy) {
        console.log('📦 Running migration: Adding created_by column to hints...')
        await this.run('ALTER TABLE hints ADD COLUMN created_by TEXT DEFAULT \'system\'')
        console.log('✅ Migration completed: created_by column added to hints')
      }

      if (!hasIsActive) {
        console.log('📦 Running migration: Adding is_active column to hints...')
        await this.run('ALTER TABLE hints ADD COLUMN is_active BOOLEAN DEFAULT 1')
        console.log('✅ Migration completed: is_active column added to hints')
      }

      // Migration 3: Check if hints table has room_id column
      const hasRoomId = hintsTableInfo.some(column => column.name === 'room_id')
      if (!hasRoomId) {
        console.log('📦 Running migration: Adding room_id column to hints...')
        await this.run('ALTER TABLE hints ADD COLUMN room_id INTEGER DEFAULT NULL')
        console.log('✅ Migration completed: room_id column added to hints')
      }

      // Migration 4: Create room_messages table if it doesn't exist
      const tablesResult = await this.all("SELECT name FROM sqlite_schema WHERE type='table' AND name='room_messages'")
      if (tablesResult.length === 0) {
        console.log('📦 Running migration: Creating room_messages table...')
        await this.run(`CREATE TABLE room_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id INTEGER NOT NULL,
          language TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1,
          FOREIGN KEY (room_id) REFERENCES rooms (id),
          UNIQUE(room_id, language, message)
        )`)
        console.log('✅ Migration completed: room_messages table created')
      }

      // Migration 5: Create hint_categories table if it doesn't exist
      const categoriesResult = await this.all("SELECT name FROM sqlite_schema WHERE type='table' AND name='hint_categories'")
      if (categoriesResult.length === 0) {
        console.log('📦 Running migration: Creating hint_categories table...')
        await this.run(`CREATE TABLE hint_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id INTEGER,
          name TEXT NOT NULL,
          position INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1,
          FOREIGN KEY (room_id) REFERENCES rooms (id),
          UNIQUE(room_id, name)
        )`)
        
        // Initialize default categories for each room
        const rooms = await this.all('SELECT id FROM rooms')
        const defaultCategories = ['Pieza Uno', 'Pieza Dos', 'Pieza Tres', 'General']
        
        for (const room of rooms) {
          let pos = 0
          for (const category of defaultCategories) {
            await this.run('INSERT OR IGNORE INTO hint_categories (room_id, name, position) VALUES (?, ?, ?)', 
              [room.id, category, pos++])
          }
        }
        console.log('✅ Migration completed: hint_categories table created with default categories')
      }

      // Migration 6: Ensure 'position' column exists on hint_categories
      const categoriesInfo = await this.all("PRAGMA table_info(hint_categories)")
      const catHasPosition = categoriesInfo.some(c => c.name === 'position')
      if (!catHasPosition) {
        console.log('📦 Running migration: Adding position column to hint_categories...')
        await this.run('ALTER TABLE hint_categories ADD COLUMN position INTEGER DEFAULT 0')
        // Initialize position by alphabetical order per room
        const rooms = await this.all('SELECT DISTINCT room_id FROM hint_categories WHERE room_id IS NOT NULL')
        for (const r of rooms) {
          const cats = await this.all('SELECT id FROM hint_categories WHERE room_id = ? ORDER BY name ASC', [r.room_id])
          let i = 0
          for (const cat of cats) {
            await this.run('UPDATE hint_categories SET position = ? WHERE id = ?', [i++, cat.id])
          }
        }
        console.log('✅ Migration completed: position column added to hint_categories')
      }

      // Migration 7: Add 'position' column to hints if missing
      const hintsInfo2 = await this.all("PRAGMA table_info(hints)")
      const hintsHasPosition = hintsInfo2.some(c => c.name === 'position')
      if (!hintsHasPosition) {
        console.log('📦 Running migration: Adding position column to hints...')
        await this.run('ALTER TABLE hints ADD COLUMN position INTEGER DEFAULT NULL')
        // Initialize per room/category by created_at ascending
        const categories = await this.all('SELECT DISTINCT room_id, category FROM hints WHERE room_id IS NOT NULL')
        for (const row of categories) {
          const hints = await this.all('SELECT id FROM hints WHERE room_id = ? AND category = ? ORDER BY created_at ASC', [row.room_id, row.category])
          let i = 0
          for (const h of hints) {
            await this.run('UPDATE hints SET position = ? WHERE id = ?', [i++, h.id])
          }
        }
        console.log('✅ Migration completed: position column added to hints')
      }

    } catch (error) {
      console.error('❌ Migration error:', error)
    }
  }

  async initializeDefaultData() {
    // Initialize default languages first
    console.log('🌐 Initializing default languages...')
    await this.initializeDefaultLanguages()

    // Check if rooms exist
    const rooms = await this.all('SELECT COUNT(*) as count FROM rooms')
    if (rooms[0].count === 0) {
      console.log('🏗️ Initializing default rooms...')
      for (let i = 0; i < 5; i++) {
        await this.run(
          'INSERT INTO rooms (id, name) VALUES (?, ?)',
          [i, `Sala ${i + 1}`]
        )
      }
    }

    // Don't initialize default hints - let admin create them manually if needed
  }

  // Promisified database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Database run error:', err.message)
          reject(err)
        } else {
          resolve({ id: this.lastID, changes: this.changes })
        }
      })
    })
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Database get error:', err.message)
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Database all error:', err.message)
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  // Room operations
  async getAllRooms() {
    return await this.all('SELECT * FROM rooms ORDER BY id')
  }

  async getRoom(id) {
    return await this.get('SELECT * FROM rooms WHERE id = ?', [id])
  }

  async updateRoom(id, data) {
    const { time_remaining, is_running, hints_remaining, last_message } = data
    await this.run(
      `UPDATE rooms SET 
       time_remaining = ?, 
       is_running = ?, 
       hints_remaining = ?, 
       last_message = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [time_remaining, is_running ? 1 : 0, hints_remaining, last_message || '', id]
    )
    return await this.getRoom(id)
  }

  async resetRoom(id) {
    await this.run(
      `UPDATE rooms SET 
       time_remaining = 3600, 
       is_running = 0, 
       hints_remaining = 3, 
       last_message = '',
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    )
    return await this.getRoom(id)
  }

  // Hint operations
  async getAllHints() {
    const rows = await this.all('SELECT * FROM hints WHERE is_active = 1 ORDER BY category, id')
    return rows.map(row => ({
      id: row.id,
      text: {
        es: row.text_es,
        en: row.text_en,
        fr: row.text_fr,
        de: row.text_de
      },
      category: row.category,
      created_at: row.created_at,
      created_by: row.created_by
    }))
  }

  async getHintCategories() {
    const rows = await this.all('SELECT DISTINCT category FROM hints WHERE is_active = 1 ORDER BY category')
    return rows.map(row => row.category)
  }

  async createHint(hintData) {
    const { text, category, created_by = 'gamemaster' } = hintData
    const id = `custom_${Date.now()}`
    
    await this.run(
      `INSERT INTO hints (id, text_es, text_en, text_fr, text_de, category, created_by, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        text.es || 'Traducción pendiente',
        text.en || text.es || 'Translation pending',
        text.fr || text.es || 'Traduction en attente',
        text.de || text.es || 'Übersetzung ausstehend',
        category,
        created_by
      ]
    )

    // Store dynamic translations for non-core languages
    const core = new Set(['es','en','fr','de'])
    for (const [langCode, value] of Object.entries(text || {})) {
      if (!core.has(langCode) && value && value.trim() !== '') {
        await this.addHintTranslation(id, langCode, value)
      }
    }

    return await this.get('SELECT * FROM hints WHERE id = ?', [id])
  }

  async deleteHint(id) {
    // Soft delete - don't actually remove, just mark as inactive
    await this.run('UPDATE hints SET is_active = 0 WHERE id = ?', [id])
    return { success: true, message: 'Hint deactivated successfully' }
  }

  // Analytics operations
  async logHintUsage(roomId, hintId, hintText, language) {
    await this.run(
      'INSERT INTO hint_usage (room_id, hint_id, hint_text, language) VALUES (?, ?, ?, ?)',
      [roomId, hintId, hintText, language]
    )
  }

  async getHintUsageStats(roomId = null, days = 30) {
    const whereClause = roomId ? 'WHERE room_id = ?' : ''
    const params = roomId ? [roomId, days] : [days]
    
    return await this.all(
      `SELECT 
        room_id,
        COUNT(*) as total_hints,
        COUNT(DISTINCT hint_id) as unique_hints,
        language,
        DATE(sent_at) as date
       FROM hint_usage 
       ${whereClause}
       AND sent_at > datetime('now', '-? days')
       GROUP BY room_id, language, DATE(sent_at)
       ORDER BY sent_at DESC`,
      params
    )
  }

  // Room-specific hints methods
  async getHintsByRoom(roomId) {
    const rows = await this.all(
      `SELECT * FROM hints 
       WHERE (room_id = ? OR room_id IS NULL) AND is_active = 1 
       ORDER BY category ASC, COALESCE(position, 999999) ASC, created_at ASC`,
      [roomId]
    )

    if (rows.length === 0) return []

    // Fetch dynamic translations for all these hints
    const placeholders = rows.map(() => '?').join(',')
    const translations = await this.all(
      `SELECT hint_id, language_code, text FROM hint_translations WHERE hint_id IN (${placeholders})`,
      rows.map(r => r.id)
    )

    const byHint = new Map()
    for (const t of translations) {
      if (!byHint.has(t.hint_id)) byHint.set(t.hint_id, {})
      byHint.get(t.hint_id)[t.language_code] = t.text
    }

    return rows.map(hint => ({
      id: hint.id,
      text: {
        es: hint.text_es,
        en: hint.text_en,
        fr: hint.text_fr,
        de: hint.text_de,
        ...(byHint.get(hint.id) || {})
      },
      category: hint.category,
      room_id: hint.room_id,
      position: hint.position,
      created_at: hint.created_at,
      created_by: hint.created_by
    }))
  }

  async createHintForRoom(roomId, hintData) {
    const id = `room_${roomId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await this.run(
      `INSERT INTO hints (id, room_id, text_es, text_en, text_fr, text_de, category, created_by, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        roomId,
        hintData.text.es,
        hintData.text.en || hintData.text.es,
        hintData.text.fr || hintData.text.es,
        hintData.text.de || hintData.text.es,
        hintData.category,
        hintData.created_by || 'gamemaster'
      ]
    )

    // Save dynamic translations beyond core languages
    const core = new Set(['es','en','fr','de'])
    for (const [langCode, value] of Object.entries(hintData.text || {})) {
      if (!core.has(langCode) && value && value.trim() !== '') {
        await this.addHintTranslation(id, langCode, value)
      }
    }

    return this.get('SELECT * FROM hints WHERE id = ?', [id])
  }

  // Room-specific messages methods
  async getMessagesByRoom(roomId, language) {
    return this.all(
      'SELECT * FROM room_messages WHERE room_id = ? AND language = ? AND is_active = 1 ORDER BY created_at ASC',
      [roomId, language]
    )
  }

  async createMessageForRoom(roomId, language, message) {
    return this.run(
      'INSERT OR REPLACE INTO room_messages (room_id, language, message, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [roomId, language, message]
    )
  }

  async deleteMessageFromRoom(roomId, messageId) {
    return this.run(
      'UPDATE room_messages SET is_active = 0 WHERE id = ? AND room_id = ?',
      [messageId, roomId]
    )
  }

  // Room-specific categories methods
  async getCategoriesByRoom(roomId) {
    return this.all(
      `SELECT * FROM hint_categories 
       WHERE (room_id = ? OR room_id IS NULL) AND is_active = 1 
       ORDER BY COALESCE(position, 999999) ASC, name ASC`,
      [roomId]
    )
  }

  async createCategoryForRoom(roomId, categoryName) {
    return this.run(
      'INSERT OR IGNORE INTO hint_categories (room_id, name, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [roomId, categoryName]
    )
  }

  async updateCategoryForRoom(roomId, oldName, newName) {
    await this.run('BEGIN TRANSACTION')
    try {
      // Update category name in hint_categories table
      await this.run(
        'UPDATE hint_categories SET name = ? WHERE room_id = ? AND name = ?',
        [newName, roomId, oldName]
      )
      
      // Update all hints using this category
      await this.run(
        'UPDATE hints SET category = ? WHERE room_id = ? AND category = ?',
        [newName, roomId, oldName]
      )
      
      await this.run('COMMIT')
      return { success: true }
    } catch (error) {
      await this.run('ROLLBACK')
      throw error
    }
  }

  async deleteCategoryFromRoom(roomId, categoryName) {
    await this.run('BEGIN TRANSACTION')
    try {
      // Check if any hints use this category
      const hintsCount = await this.get(
        'SELECT COUNT(*) as count FROM hints WHERE room_id = ? AND category = ? AND is_active = 1',
        [roomId, categoryName]
      )
      
      if (hintsCount.count > 0) {
        await this.run('ROLLBACK')
        return { success: false, message: `Cannot delete category "${categoryName}" because it contains ${hintsCount.count} hints` }
      }
      
      // Mark category as inactive
      await this.run(
        'UPDATE hint_categories SET is_active = 0 WHERE room_id = ? AND name = ?',
        [roomId, categoryName]
      )
      
      await this.run('COMMIT')
      return { success: true }
    } catch (error) {
      await this.run('ROLLBACK')
      throw error
    }
  }

  // Language management functions
  async getAllLanguages() {
    return await this.all('SELECT * FROM languages ORDER BY is_default DESC, name ASC')
  }

  async getLanguage(code) {
    return await this.get('SELECT * FROM languages WHERE code = ?', [code])
  }

  async createLanguage(code, name, flag = '') {
    const now = new Date().toISOString()
    await this.run(
      'INSERT INTO languages (code, name, flag, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [code, name, flag, now, now]
    )
    return await this.getLanguage(code)
  }

  async updateLanguage(code, name, flag = '') {
    const now = new Date().toISOString()
    await this.run(
      'UPDATE languages SET name = ?, flag = ?, updated_at = ? WHERE code = ?',
      [name, flag, now, code]
    )
    return await this.getLanguage(code)
  }

  async deleteLanguage(code) {
    try {
      // Delete messages in this language
      await this.run('DELETE FROM room_messages WHERE language = ?', [code])
      
      // Delete hint translations in this language (new dynamic table)
      await this.run('DELETE FROM hint_translations WHERE language_code = ?', [code])
      
      // Check if this is a core language with a dedicated column
      const validLanguageColumns = ['es', 'en', 'fr', 'de']
      if (validLanguageColumns.includes(code)) {
        console.log(`⚠️ Warning: Language ${code} is a core language with hints table column. Core language hints will remain but language will be removed from available options.`)
      }
      
      // Delete the language from languages table (only if it's not a default language)
      const result = await this.run('DELETE FROM languages WHERE code = ? AND is_default = 0', [code])
      
      if (result.changes > 0) {
        console.log(`✅ Language ${code} deleted successfully`)
      } else {
        console.log(`⚠️ Language ${code} could not be deleted (may be a default language or not found)`)
      }
      
      return result.changes > 0
    } catch (error) {
      console.error(`❌ Error deleting language ${code}:`, error)
      throw error
    }
  }

  // Helper function to add hint translation for dynamic languages
  async addHintTranslation(hintId, languageCode, text) {
    try {
      await this.run(
        'INSERT OR REPLACE INTO hint_translations (hint_id, language_code, text, updated_at) VALUES (?, ?, ?, ?)',
        [hintId, languageCode, text, new Date().toISOString()]
      )
    } catch (error) {
      console.error('Error adding hint translation:', error)
    }
  }

  // Helper function to get hint translations for a specific language
  async getHintTranslations(languageCode) {
    try {
      return await this.all('SELECT * FROM hint_translations WHERE language_code = ?', [languageCode])
    } catch (error) {
      console.error('Error getting hint translations:', error)
      return []
    }
  }

  async initializeDefaultLanguages() {
    // Initialize default languages if they don't exist
    const defaultLanguages = [
      { code: 'es', name: 'Español', flag: '🇪🇸', is_default: 1 },
      { code: 'en', name: 'English', flag: '🇺🇸', is_default: 1 }
    ]

    for (const lang of defaultLanguages) {
      const existing = await this.getLanguage(lang.code)
      if (!existing) {
        const now = new Date().toISOString()
        await this.run(
          'INSERT INTO languages (code, name, flag, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [lang.code, lang.name, lang.flag, lang.is_default, now, now]
        )
      }
    }

    // Ensure only es/en are marked as default after previous versions
    await this.run("UPDATE languages SET is_default = 0 WHERE code NOT IN ('es','en')")
  }

  // Close database connection
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message)
          } else {
            console.log('✅ Database connection closed')
          }
          resolve()
        })
      } else {
        resolve()
      }
    })
  }
}

export default new GameDatabase()