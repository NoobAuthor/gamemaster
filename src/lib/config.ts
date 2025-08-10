import { writable } from 'svelte/store'
import { getConfig } from './api'

export type AppConfig = {
  obligatoryLanguages: string[]
  defaultFreeHints: number
  hintPenaltySeconds: number
}

const defaultConfig: AppConfig = {
  obligatoryLanguages: ['es', 'en'],
  defaultFreeHints: 3,
  hintPenaltySeconds: 120,
}

export const config = writable<AppConfig>(defaultConfig)

export async function loadConfig(): Promise<AppConfig> {
  try {
    const c = await getConfig()
    config.set(c)
    return c
  } catch (e) {
    // Keep defaults on failure
    return defaultConfig
  }
}


