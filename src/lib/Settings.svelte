<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import type { Room, Language, Hint } from './types'
  import {
    getLanguages,
    createLanguage as apiCreateLanguage,
    updateLanguage as apiUpdateLanguage,
    deleteLanguage as apiDeleteLanguage,
    getRoomHints,
    createRoomHint,
    deleteHint as apiDeleteHint,
    getRoomMessagesGrouped,
    createRoomMessage,
    deleteRoomMessage,
    updateRoomName as apiUpdateRoomName
  } from './api'
  import { config } from './config'
  import { toast } from './toast'
  import SettingsRooms from './settings/SettingsRooms.svelte'
  import SettingsLanguages from './settings/SettingsLanguages.svelte'
  import SettingsMessages from './settings/SettingsMessages.svelte'
  import SettingsHints from './settings/SettingsHints.svelte'
  import SettingsCategories from './settings/SettingsCategories.svelte'

  export let isOpen = false
  export let rooms: Room[]
  export const currentLanguage: Language = 'es'

  const dispatch = createEventDispatcher()

  // State management
  let selectedRoomId = 0
  let activeTab = 'rooms' // 'rooms', 'hints', 'categories', 'messages', 'languages'
  let isLoading = false

  // Room editing
  let editingRoom: Room | null = null
  let roomName = ''

  // Hints management
  let hints: Hint[] = []
  let selectedHint: Hint | null = null
  let hintForm = {
    text_es: '',
    text_en: '',
    text_fr: '',
    text_de: '',
    category: 'Pieza Uno'
  }
  let dynamicHintTexts: Record<string, string> = {} // For dynamic languages
  let isCreatingHint = false
  let editingHintId = ''

  // Categories management
  let categories: any[] = []
  let newCategoryName = ''
  let editingCategoryId = ''
  let editingCategoryName = ''
  let isCreatingCategory = false

  // Messages management (dynamic by language)
  let roomMessages: Record<string, any[]> = {}
  let newMessage = ''
  let editingMessageIndex = -1
  let editingMessageLanguage = 'es' as Language
  let viewingLanguage = 'es' as Language

  // Languages management
  let systemLanguages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ]
  let newLanguage = {
    code: '',
    name: '',
    flag: ''
  }
  let editingLanguage: any = null
  let isCreatingLanguage = false
  let showFlagSelector = false

  // Common flag emojis for country/language selection
  const flagEmojis = [
    { flag: '🇦🇩', name: 'Andorra', code: 'ad' },
    { flag: '🇦🇪', name: 'Emiratos Árabes Unidos', code: 'ae' },
    { flag: '🇦🇫', name: 'Afganistán', code: 'af' },
    { flag: '🇦🇬', name: 'Antigua y Barbuda', code: 'ag' },
    { flag: '🇦🇮', name: 'Anguila', code: 'ai' },
    { flag: '🇦🇱', name: 'Albania', code: 'al' },
    { flag: '🇦🇲', name: 'Armenia', code: 'am' },
    { flag: '🇦🇴', name: 'Angola', code: 'ao' },
    { flag: '🇦🇶', name: 'Antártida', code: 'aq' },
    { flag: '🇦🇷', name: 'Argentina', code: 'ar' },
    { flag: '🇦🇸', name: 'Samoa Americana', code: 'as' },
    { flag: '🇦🇹', name: 'Austria', code: 'at' },
    { flag: '🇦🇺', name: 'Australia', code: 'au' },
    { flag: '🇦🇼', name: 'Aruba', code: 'aw' },
    { flag: '🇦🇽', name: 'Islas Åland', code: 'ax' },
    { flag: '🇦🇿', name: 'Azerbaiyán', code: 'az' },
    { flag: '🇧🇦', name: 'Bosnia y Herzegovina', code: 'ba' },
    { flag: '🇧🇧', name: 'Barbados', code: 'bb' },
    { flag: '🇧🇩', name: 'Bangladesh', code: 'bd' },
    { flag: '🇧🇪', name: 'Bélgica', code: 'be' },
    { flag: '🇧🇫', name: 'Burkina Faso', code: 'bf' },
    { flag: '🇧🇬', name: 'Bulgaria', code: 'bg' },
    { flag: '🇧🇭', name: 'Baréin', code: 'bh' },
    { flag: '🇧🇮', name: 'Burundi', code: 'bi' },
    { flag: '🇧🇯', name: 'Benín', code: 'bj' },
    { flag: '🇧🇱', name: 'San Bartolomé', code: 'bl' },
    { flag: '🇧🇲', name: 'Bermudas', code: 'bm' },
    { flag: '🇧🇳', name: 'Brunéi', code: 'bn' },
    { flag: '🇧🇴', name: 'Bolivia', code: 'bo' },
    { flag: '🇧🇶', name: 'Caribe Neerlandés', code: 'bq' },
    { flag: '🇧🇷', name: 'Brasil', code: 'br' },
    { flag: '🇧🇸', name: 'Bahamas', code: 'bs' },
    { flag: '🇧🇹', name: 'Bután', code: 'bt' },
    { flag: '🇧🇻', name: 'Isla Bouvet', code: 'bv' },
    { flag: '🇧🇼', name: 'Botsuana', code: 'bw' },
    { flag: '🇧🇾', name: 'Bielorrusia', code: 'by' },
    { flag: '🇧🇿', name: 'Belice', code: 'bz' },
    { flag: '🇨🇦', name: 'Canadá', code: 'ca' },
    { flag: '🇨🇨', name: 'Islas Cocos', code: 'cc' },
    { flag: '🇨🇩', name: 'Congo (RDC)', code: 'cd' },
    { flag: '🇨🇫', name: 'República Centroafricana', code: 'cf' },
    { flag: '🇨🇬', name: 'Congo', code: 'cg' },
    { flag: '🇨🇭', name: 'Suiza', code: 'ch' },
    { flag: '🇨🇮', name: 'Costa de Marfil', code: 'ci' },
    { flag: '🇨🇰', name: 'Islas Cook', code: 'ck' },
    { flag: '🇨🇱', name: 'Chile', code: 'cl' },
    { flag: '🇨🇲', name: 'Camerún', code: 'cm' },
    { flag: '🇨🇳', name: 'China', code: 'cn' },
    { flag: '🇨🇴', name: 'Colombia', code: 'co' },
    { flag: '🇨🇷', name: 'Costa Rica', code: 'cr' },
    { flag: '🇨🇺', name: 'Cuba', code: 'cu' },
    { flag: '🇨🇻', name: 'Cabo Verde', code: 'cv' },
    { flag: '🇨🇼', name: 'Curazao', code: 'cw' },
    { flag: '🇨🇽', name: 'Isla de Navidad', code: 'cx' },
    { flag: '🇨🇾', name: 'Chipre', code: 'cy' },
    { flag: '🇨🇿', name: 'República Checa', code: 'cz' },
    { flag: '🇩🇪', name: 'Alemania', code: 'de' },
    { flag: '🇩🇯', name: 'Yibuti', code: 'dj' },
    { flag: '🇩🇰', name: 'Dinamarca', code: 'dk' },
    { flag: '🇩🇲', name: 'Dominica', code: 'dm' },
    { flag: '🇩🇴', name: 'República Dominicana', code: 'do' },
    { flag: '🇩🇿', name: 'Argelia', code: 'dz' },
    { flag: '🇪🇨', name: 'Ecuador', code: 'ec' },
    { flag: '🇪🇪', name: 'Estonia', code: 'ee' },
    { flag: '🇪🇬', name: 'Egipto', code: 'eg' },
    { flag: '🇪🇭', name: 'Sáhara Occidental', code: 'eh' },
    { flag: '🇪🇷', name: 'Eritrea', code: 'er' },
    { flag: '🇪🇸', name: 'España', code: 'es' },
    { flag: '🇪🇹', name: 'Etiopía', code: 'et' },
    { flag: '🇫🇮', name: 'Finlandia', code: 'fi' },
    { flag: '🇫🇯', name: 'Fiyi', code: 'fj' },
    { flag: '🇫🇰', name: 'Islas Malvinas', code: 'fk' },
    { flag: '🇫🇲', name: 'Micronesia', code: 'fm' },
    { flag: '🇫🇴', name: 'Islas Feroe', code: 'fo' },
    { flag: '🇫🇷', name: 'Francia', code: 'fr' },
    { flag: '🇬🇦', name: 'Gabón', code: 'ga' },
    { flag: '🇬🇧', name: 'Reino Unido', code: 'gb' },
    { flag: '🇬🇩', name: 'Granada', code: 'gd' },
    { flag: '🇬🇪', name: 'Georgia', code: 'ge' },
    { flag: '🇬🇫', name: 'Guayana Francesa', code: 'gf' },
    { flag: '🇬🇬', name: 'Guernsey', code: 'gg' },
    { flag: '🇬🇭', name: 'Ghana', code: 'gh' },
    { flag: '🇬🇮', name: 'Gibraltar', code: 'gi' },
    { flag: '🇬🇱', name: 'Groenlandia', code: 'gl' },
    { flag: '🇬🇲', name: 'Gambia', code: 'gm' },
    { flag: '🇬🇳', name: 'Guinea', code: 'gn' },
    { flag: '🇬🇵', name: 'Guadalupe', code: 'gp' },
    { flag: '🇬🇶', name: 'Guinea Ecuatorial', code: 'gq' },
    { flag: '🇬🇷', name: 'Grecia', code: 'gr' },
    { flag: '🇬🇸', name: 'Georgias del Sur', code: 'gs' },
    { flag: '🇬🇹', name: 'Guatemala', code: 'gt' },
    { flag: '🇬🇺', name: 'Guam', code: 'gu' },
    { flag: '🇬🇼', name: 'Guinea-Bisáu', code: 'gw' },
    { flag: '🇬🇾', name: 'Guyana', code: 'gy' },
    { flag: '🇭🇰', name: 'Hong Kong', code: 'hk' },
    { flag: '🇭🇲', name: 'Islas Heard y McDonald', code: 'hm' },
    { flag: '🇭🇳', name: 'Honduras', code: 'hn' },
    { flag: '🇭🇷', name: 'Croacia', code: 'hr' },
    { flag: '🇭🇹', name: 'Haití', code: 'ht' },
    { flag: '🇭🇺', name: 'Hungría', code: 'hu' },
    { flag: '🇮🇩', name: 'Indonesia', code: 'id' },
    { flag: '🇮🇪', name: 'Irlanda', code: 'ie' },
    { flag: '🇮🇱', name: 'Israel', code: 'il' },
    { flag: '🇮🇲', name: 'Isla de Man', code: 'im' },
    { flag: '🇮🇳', name: 'India', code: 'in' },
    { flag: '🇮🇴', name: 'Territorio Británico del Océano Índico', code: 'io' },
    { flag: '🇮🇶', name: 'Irak', code: 'iq' },
    { flag: '🇮🇷', name: 'Irán', code: 'ir' },
    { flag: '🇮🇸', name: 'Islandia', code: 'is' },
    { flag: '🇮🇹', name: 'Italia', code: 'it' },
    { flag: '🇯🇪', name: 'Jersey', code: 'je' },
    { flag: '🇯🇲', name: 'Jamaica', code: 'jm' },
    { flag: '🇯🇴', name: 'Jordania', code: 'jo' },
    { flag: '🇯🇵', name: 'Japón', code: 'jp' },
    { flag: '🇰🇪', name: 'Kenia', code: 'ke' },
    { flag: '🇰🇬', name: 'Kirguistán', code: 'kg' },
    { flag: '🇰🇭', name: 'Camboya', code: 'kh' },
    { flag: '🇰🇮', name: 'Kiribati', code: 'ki' },
    { flag: '🇰🇲', name: 'Comoras', code: 'km' },
    { flag: '🇰🇳', name: 'San Cristóbal y Nieves', code: 'kn' },
    { flag: '🇰🇵', name: 'Corea del Norte', code: 'kp' },
    { flag: '🇰🇷', name: 'Corea del Sur', code: 'kr' },
    { flag: '🇰🇼', name: 'Kuwait', code: 'kw' },
    { flag: '🇰🇾', name: 'Islas Caimán', code: 'ky' },
    { flag: '🇰🇿', name: 'Kazajistán', code: 'kz' },
    { flag: '🇱🇦', name: 'Laos', code: 'la' },
    { flag: '🇱🇧', name: 'Líbano', code: 'lb' },
    { flag: '🇱🇨', name: 'Santa Lucía', code: 'lc' },
    { flag: '🇱🇮', name: 'Liechtenstein', code: 'li' },
    { flag: '🇱🇰', name: 'Sri Lanka', code: 'lk' },
    { flag: '🇱🇷', name: 'Liberia', code: 'lr' },
    { flag: '🇱🇸', name: 'Lesoto', code: 'ls' },
    { flag: '🇱🇹', name: 'Lituania', code: 'lt' },
    { flag: '🇱🇺', name: 'Luxemburgo', code: 'lu' },
    { flag: '🇱🇻', name: 'Letonia', code: 'lv' },
    { flag: '🇱🇾', name: 'Libia', code: 'ly' },
    { flag: '🇲🇦', name: 'Marruecos', code: 'ma' },
    { flag: '🇲🇨', name: 'Mónaco', code: 'mc' },
    { flag: '🇲🇩', name: 'Moldavia', code: 'md' },
    { flag: '🇲🇪', name: 'Montenegro', code: 'me' },
    { flag: '🇲🇫', name: 'San Martín', code: 'mf' },
    { flag: '🇲🇬', name: 'Madagascar', code: 'mg' },
    { flag: '🇲🇭', name: 'Islas Marshall', code: 'mh' },
    { flag: '🇲🇰', name: 'Macedonia del Norte', code: 'mk' },
    { flag: '🇲🇱', name: 'Mali', code: 'ml' },
    { flag: '🇲🇲', name: 'Myanmar', code: 'mm' },
    { flag: '🇲🇳', name: 'Mongolia', code: 'mn' },
    { flag: '🇲🇴', name: 'Macao', code: 'mo' },
    { flag: '🇲🇵', name: 'Islas Marianas del Norte', code: 'mp' },
    { flag: '🇲🇶', name: 'Martinica', code: 'mq' },
    { flag: '🇲🇷', name: 'Mauritania', code: 'mr' },
    { flag: '🇲🇸', name: 'Montserrat', code: 'ms' },
    { flag: '🇲🇹', name: 'Malta', code: 'mt' },
    { flag: '🇲🇺', name: 'Mauricio', code: 'mu' },
    { flag: '🇲🇻', name: 'Maldivas', code: 'mv' },
    { flag: '🇲🇼', name: 'Malaui', code: 'mw' },
    { flag: '🇲🇽', name: 'México', code: 'mx' },
    { flag: '🇲🇾', name: 'Malasia', code: 'my' },
    { flag: '🇲🇿', name: 'Mozambique', code: 'mz' },
    { flag: '🇳🇦', name: 'Namibia', code: 'na' },
    { flag: '🇳🇨', name: 'Nueva Caledonia', code: 'nc' },
    { flag: '🇳🇪', name: 'Níger', code: 'ne' },
    { flag: '🇳🇫', name: 'Isla Norfolk', code: 'nf' },
    { flag: '🇳🇬', name: 'Nigeria', code: 'ng' },
    { flag: '🇳🇮', name: 'Nicaragua', code: 'ni' },
    { flag: '🇳🇱', name: 'Países Bajos', code: 'nl' },
    { flag: '🇳🇴', name: 'Noruega', code: 'no' },
    { flag: '🇳🇵', name: 'Nepal', code: 'np' },
    { flag: '🇳🇷', name: 'Nauru', code: 'nr' },
    { flag: '🇳🇺', name: 'Niue', code: 'nu' },
    { flag: '🇳🇿', name: 'Nueva Zelanda', code: 'nz' },
    { flag: '🇴🇲', name: 'Omán', code: 'om' },
    { flag: '🇵🇦', name: 'Panamá', code: 'pa' },
    { flag: '🇵🇪', name: 'Perú', code: 'pe' },
    { flag: '🇵🇫', name: 'Polinesia Francesa', code: 'pf' },
    { flag: '🇵🇬', name: 'Papúa Nueva Guinea', code: 'pg' },
    { flag: '🇵🇭', name: 'Filipinas', code: 'ph' },
    { flag: '🇵🇰', name: 'Pakistán', code: 'pk' },
    { flag: '🇵🇱', name: 'Polonia', code: 'pl' },
    { flag: '🇵🇲', name: 'San Pedro y Miquelón', code: 'pm' },
    { flag: '🇵🇳', name: 'Islas Pitcairn', code: 'pn' },
    { flag: '🇵🇷', name: 'Puerto Rico', code: 'pr' },
    { flag: '🇵🇸', name: 'Palestina', code: 'ps' },
    { flag: '🇵🇹', name: 'Portugal', code: 'pt' },
    { flag: '🇵🇼', name: 'Palau', code: 'pw' },
    { flag: '🇵🇾', name: 'Paraguay', code: 'py' },
    { flag: '🇶🇦', name: 'Catar', code: 'qa' },
    { flag: '🇷🇪', name: 'Reunión', code: 're' },
    { flag: '🇷🇴', name: 'Rumania', code: 'ro' },
    { flag: '🇷🇸', name: 'Serbia', code: 'rs' },
    { flag: '🇷🇺', name: 'Rusia', code: 'ru' },
    { flag: '🇷🇼', name: 'Ruanda', code: 'rw' },
    { flag: '🇸🇦', name: 'Arabia Saudí', code: 'sa' },
    { flag: '🇸🇧', name: 'Islas Salomón', code: 'sb' },
    { flag: '🇸🇨', name: 'Seychelles', code: 'sc' },
    { flag: '🇸🇩', name: 'Sudán', code: 'sd' },
    { flag: '🇸🇪', name: 'Suecia', code: 'se' },
    { flag: '🇸🇬', name: 'Singapur', code: 'sg' },
    { flag: '🇸🇭', name: 'Santa Elena', code: 'sh' },
    { flag: '🇸🇮', name: 'Eslovenia', code: 'si' },
    { flag: '🇸🇯', name: 'Svalbard y Jan Mayen', code: 'sj' },
    { flag: '🇸🇰', name: 'Eslovaquia', code: 'sk' },
    { flag: '🇸🇱', name: 'Sierra Leona', code: 'sl' },
    { flag: '🇸🇲', name: 'San Marino', code: 'sm' },
    { flag: '🇸🇳', name: 'Senegal', code: 'sn' },
    { flag: '🇸🇴', name: 'Somalia', code: 'so' },
    { flag: '🇸🇷', name: 'Surinam', code: 'sr' },
    { flag: '🇸🇸', name: 'Sudán del Sur', code: 'ss' },
    { flag: '🇸🇹', name: 'Santo Tomé y Príncipe', code: 'st' },
    { flag: '🇸🇻', name: 'El Salvador', code: 'sv' },
    { flag: '🇸🇽', name: 'San Martín', code: 'sx' },
    { flag: '🇸🇾', name: 'Siria', code: 'sy' },
    { flag: '🇸🇿', name: 'Esuatini', code: 'sz' },
    { flag: '🇹🇦', name: 'Tristán de Acuña', code: 'ta' },
    { flag: '🇹🇨', name: 'Islas Turcas y Caicos', code: 'tc' },
    { flag: '🇹🇩', name: 'Chad', code: 'td' },
    { flag: '🇹🇫', name: 'Territorios Australes Franceses', code: 'tf' },
    { flag: '🇹🇬', name: 'Togo', code: 'tg' },
    { flag: '🇹🇭', name: 'Tailandia', code: 'th' },
    { flag: '🇹🇯', name: 'Tayikistán', code: 'tj' },
    { flag: '🇹🇰', name: 'Tokelau', code: 'tk' },
    { flag: '🇹🇱', name: 'Timor Oriental', code: 'tl' },
    { flag: '🇹🇲', name: 'Turkmenistán', code: 'tm' },
    { flag: '🇹🇳', name: 'Túnez', code: 'tn' },
    { flag: '🇹🇴', name: 'Tonga', code: 'to' },
    { flag: '🇹🇷', name: 'Turquía', code: 'tr' },
    { flag: '🇹🇹', name: 'Trinidad y Tobago', code: 'tt' },
    { flag: '🇹🇻', name: 'Tuvalu', code: 'tv' },
    { flag: '🇹🇼', name: 'Taiwán', code: 'tw' },
    { flag: '🇹🇿', name: 'Tanzania', code: 'tz' },
    { flag: '🇺🇦', name: 'Ucrania', code: 'ua' },
    { flag: '🇺🇬', name: 'Uganda', code: 'ug' },
    { flag: '🇺🇲', name: 'Islas Ultramarinas de EE.UU.', code: 'um' },
    { flag: '🇺🇳', name: 'Naciones Unidas', code: 'un' },
    { flag: '🇺🇸', name: 'Estados Unidos', code: 'us' },
    { flag: '🇺🇾', name: 'Uruguay', code: 'uy' },
    { flag: '🇺🇿', name: 'Uzbekistán', code: 'uz' },
    { flag: '🇻🇦', name: 'Vaticano', code: 'va' },
    { flag: '🇻🇨', name: 'San Vicente y las Granadinas', code: 'vc' },
    { flag: '🇻🇪', name: 'Venezuela', code: 've' },
    { flag: '🇻🇬', name: 'Islas Vírgenes Británicas', code: 'vg' },
    { flag: '🇻🇮', name: 'Islas Vírgenes de EE.UU.', code: 'vi' },
    { flag: '🇻🇳', name: 'Vietnam', code: 'vn' },
    { flag: '🇻🇺', name: 'Vanuatu', code: 'vu' },
    { flag: '🇼🇫', name: 'Wallis y Futuna', code: 'wf' },
    { flag: '🇼🇸', name: 'Samoa', code: 'ws' },
    { flag: '🇽🇰', name: 'Kosovo', code: 'xk' },
    { flag: '🇾🇪', name: 'Yemen', code: 'ye' },
    { flag: '🇾🇹', name: 'Mayotte', code: 'yt' },
    { flag: '🇿🇦', name: 'Sudáfrica', code: 'za' },
    { flag: '🇿🇲', name: 'Zambia', code: 'zm' },
    { flag: '🇿🇼', name: 'Zimbabue', code: 'zw' }
  ]

  let filteredFlags = flagEmojis
  let flagSearchQuery = ''
  let isCreatingMessage = false

  // Base URL no longer needed here; all HTTP calls go through centralized API helpers

  onMount(() => {
    if (isOpen) {
      loadRoomData()
      loadSystemLanguages() // Load languages on mount
    }
  })

  // Reactive statement to load data when modal opens
  $: if (isOpen) {
    loadSystemLanguages()
  }

  async function loadRoomData() {
    await loadHints()
    await loadCategories()
    await loadRoomMessages()
  }

  async function loadHints() {
    try {
      hints = await getRoomHints(selectedRoomId)
    } catch (error) {
      console.error('Error loading hints:', error)
      toast.error('No se pudieron cargar las pistas')
    }
  }

  async function loadCategories() {
    try {
      const { getRoomCategories } = await import('./api')
      categories = await getRoomCategories(selectedRoomId)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  async function loadRoomMessages() {
    try {
      const grouped = await getRoomMessagesGrouped(selectedRoomId)
      const codes = systemLanguages.map(l => l.code as Language)
      // Reset and map grouped results
      const next: Record<string, any[]> = {}
      for (const lang of codes) {
        next[lang] = grouped[lang] || []
      }
      roomMessages = next
      // Adjust viewing/editing language if needed
      if (!codes.includes(viewingLanguage)) viewingLanguage = (codes[0] || 'es') as Language
      if (!codes.includes(editingMessageLanguage)) editingMessageLanguage = viewingLanguage
    } catch (error) {
      console.error('Error loading room messages:', error)
      toast.error('No se pudieron cargar los mensajes')
    }
  }

  function getDefaultMessages() {
    return {
      es: [
        '¡Excelente trabajo equipo!',
        'Van por buen camino',
        'Se están acercando a la solución',
        '¡Muy bien! Sigan así',
        'Tómense un momento para revisar',
        'Trabajan muy bien en equipo',
        '¡Están a punto de resolverlo!',
        'Recuerden que tienen pistas disponibles'
      ],
      en: [
        'Excellent work team!',
        'You\'re on the right track',
        'You\'re getting closer to the solution',
        'Very good! Keep it up',
        'Take a moment to review',
        'You work very well as a team',
        'You\'re about to solve it!',
        'Remember you have hints available'
      ],
      fr: [
        'Excellent travail équipe !',
        'Vous êtes sur la bonne voie',
        'Vous vous rapprochez de la solution',
        'Très bien ! Continuez comme ça',
        'Prenez un moment pour réviser',
        'Vous travaillez très bien en équipe',
        'Vous êtes sur le point de le résoudre !',
        'Rappelez-vous que vous avez des indices disponibles'
      ],
      de: [
        'Ausgezeichnete Arbeit Team!',
        'Ihr seid auf dem richtigen Weg',
        'Ihr kommt der Lösung näher',
        'Sehr gut! Macht weiter so',
        'Nehmt euch einen Moment zum Überprüfen',
        'Ihr arbeitet sehr gut als Team',
        'Ihr seid kurz davor es zu lösen!',
        'Denkt daran, dass ihr Hinweise zur Verfügung habt'
      ]
    }
  }

  function closeSettings() {
    isOpen = false
    dispatch('close')
  }

  function switchTab(tab: string) {
    activeTab = tab
    if (tab === 'languages') {
      loadSystemLanguages()
    } else {
      loadRoomData() // Reload data for the selected room when switching tabs
    }
  }

  // Watch for room selection changes
  $: if (selectedRoomId !== undefined) {
    loadRoomData()
  }

  // Room management
  function startEditingRoom(room: Room) {
    editingRoom = room
    roomName = room.name
  }

  async function saveRoomName() {
    if (!editingRoom || !roomName.trim()) return

    try {
      isLoading = true
      await apiUpdateRoomName(editingRoom.id, roomName.trim())
        editingRoom.name = roomName.trim()
        editingRoom = null
        dispatch('room-updated', editingRoom)
      toast.success('Nombre de sala actualizado')
    } catch (error) {
      console.error('Error updating room name:', error)
      toast.error('No se pudo actualizar el nombre de la sala')
    } finally {
      isLoading = false
    }
  }

  function cancelEditRoom() {
    editingRoom = null
    roomName = ''
  }

  // Hints management
  function startCreatingHint() {
    hintForm = {
      text_es: '',
      text_en: '',
      text_fr: '',
      text_de: '',
      category: 'Pieza Uno'
    }
    // Initialize dynamic texts for all available languages
    dynamicHintTexts = {}
    systemLanguages.forEach(lang => {
      if (!['es','en','fr','de'].includes(lang.code)) {
        dynamicHintTexts[lang.code] = ''
      }
    })
    editingHintId = ''
    isCreatingHint = true
  }

  function editHint(hint: Hint) {
    hintForm = {
      text_es: hint.text.es,
      text_en: hint.text.en,
      text_fr: hint.text.fr,
      text_de: hint.text.de,
      category: hint.category
    }
    // Initialize dynamic texts for all available languages
    dynamicHintTexts = {}
    systemLanguages.forEach(lang => {
      // Use existing text if available, otherwise empty
      if (!['es','en','fr','de'].includes(lang.code)) {
        dynamicHintTexts[lang.code] = (hint.text as any)[lang.code] || ''
      }
    })
    editingHintId = hint.id
    isCreatingHint = true
  }

  function buildTextObject() {
    // Build text object with both static and dynamic languages
    const textObject: Record<string, string> = {
      es: hintForm.text_es.trim(),
      en: hintForm.text_en.trim() || hintForm.text_es.trim(),
      fr: hintForm.text_fr.trim() || hintForm.text_es.trim(),
      de: hintForm.text_de.trim() || hintForm.text_es.trim()
    }

    // Add dynamic language texts
    systemLanguages.forEach(lang => {
      if (dynamicHintTexts[lang.code] && dynamicHintTexts[lang.code].trim()) {
        textObject[lang.code] = dynamicHintTexts[lang.code].trim()
      } else if (!textObject[lang.code]) {
        // Fallback to Spanish if no text provided for this language
        textObject[lang.code] = hintForm.text_es.trim()
      }
    })

    return textObject
  }

  async function saveHint() {
    if (!hintForm.text_es.trim() || !hintForm.category.trim()) {
      alert('El texto en español y la categoría son obligatorios')
      return
    }

    try {
      isLoading = true
      await createRoomHint(selectedRoomId, { text: buildTextObject(), category: hintForm.category.trim() })
        await loadHints()
        cancelHintEdit()
        dispatch('hints-updated')
      toast.success(editingHintId ? 'Pista actualizada' : 'Pista creada')
    } catch (error) {
      console.error('Error saving hint:', error)
       toast.error('No se pudo guardar la pista')
    } finally {
      isLoading = false
    }
  }

  // Delete confirmation modal states
  let showDeleteHintModal = false
  let hintToDelete: { id: string, text: string } | null = null

  function confirmDeleteHint(hintId: string, hintText: string) {
    hintToDelete = { id: hintId, text: hintText }
    showDeleteHintModal = true
  }

  async function deleteHint() {
    if (!hintToDelete) return

    try {
      isLoading = true
      await apiDeleteHint(hintToDelete.id)
        await loadHints()
        dispatch('hints-updated')
      toast.success('Pista eliminada')
    } catch (error) {
      console.error('Error deleting hint:', error)
      toast.error('No se pudo eliminar la pista')
    } finally {
      isLoading = false
      showDeleteHintModal = false
      hintToDelete = null
    }
  }

  function cancelDeleteHint() {
    showDeleteHintModal = false
    hintToDelete = null
  }

  function cancelHintEdit() {
    isCreatingHint = false
    editingHintId = ''
    hintForm = {
      text_es: '',
      text_en: '',
      text_fr: '',
      text_de: '',
      category: 'Pieza Uno'
    }
    dynamicHintTexts = {}
  }

  // Categories management
  function startCreatingCategory() {
    newCategoryName = ''
    editingCategoryId = ''
    isCreatingCategory = true
  }

  function startEditingCategory(category: any) {
    editingCategoryId = category.id
    editingCategoryName = category.name
  }

  async function saveCategory() {
    if (!newCategoryName.trim()) {
      alert('El nombre de la categoría es obligatorio')
      return
    }

    try {
      isLoading = true
      const { createRoomCategory } = await import('./api')
      await createRoomCategory(selectedRoomId, newCategoryName.trim())
      await loadCategories()
      cancelCategoryEdit()
    } catch (error) {
      console.error('Error saving category:', error)
    } finally {
      isLoading = false
    }
  }

  async function updateCategory(categoryId: string, oldName: string) {
    if (!editingCategoryName.trim()) {
      alert('El nombre de la categoría es obligatorio')
      return
    }

    try {
      isLoading = true
      const { updateRoomCategory } = await import('./api')
      await updateRoomCategory(selectedRoomId, oldName, editingCategoryName.trim())
      await loadCategories()
      await loadHints()
      cancelCategoryEdit()
    } catch (error) {
      console.error('Error updating category:', error)
    } finally {
      isLoading = false
    }
  }

  let showDeleteCategoryModal = false
  let categoryToDelete: string | null = null

  function confirmDeleteCategory(categoryName: string) {
    categoryToDelete = categoryName
    showDeleteCategoryModal = true
  }

  async function deleteCategory() {
    if (!categoryToDelete) return

    try {
      isLoading = true
      const { deleteRoomCategory } = await import('./api')
      const result = await deleteRoomCategory(selectedRoomId, categoryToDelete)
      if (result.success) {
        await loadCategories()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    } finally {
      isLoading = false
      showDeleteCategoryModal = false
      categoryToDelete = null
    }
  }

  function cancelDeleteCategory() {
    showDeleteCategoryModal = false
    categoryToDelete = null
  }

  function cancelCategoryEdit() {
    isCreatingCategory = false
    editingCategoryId = ''
    newCategoryName = ''
    editingCategoryName = ''
  }

  // Messages management
  function startCreatingMessage() {
    newMessage = ''
    editingMessageIndex = -1
    editingMessageLanguage = viewingLanguage
    isCreatingMessage = true
  }



  function startEditingMessage(index: number, language: Language) {
    editingMessageIndex = index
    editingMessageLanguage = language
    newMessage = roomMessages[language][index].message
    isCreatingMessage = false
  }

  function cancelMessageEdit() {
    editingMessageIndex = -1
    newMessage = ''
    isCreatingMessage = false
  }

  let showDeleteMessageModal = false
  let messageToDelete: { index: number, language: Language, text: string, id: number } | null = null

  function confirmDeleteMessage(index: number, language: Language) {
    const msg = roomMessages[language][index]
    messageToDelete = { index, language, text: msg.message, id: msg.id }
    showDeleteMessageModal = true
  }

  async function deleteMessage() {
    if (!messageToDelete) return

    try {
      isLoading = true
      await deleteRoomMessage(selectedRoomId, messageToDelete.id)
        await loadRoomMessages()
      toast.success('Mensaje eliminado')
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('No se pudo eliminar el mensaje')
    } finally {
      isLoading = false
      showDeleteMessageModal = false
      messageToDelete = null
    }
  }

  function cancelDeleteMessage() {
    showDeleteMessageModal = false
    messageToDelete = null
  }

  async function addMessage() {
    if (!newMessage.trim()) return
    
    try {
      isLoading = true
      
      // If we're editing, delete the old message first
      if (editingMessageIndex >= 0) {
        const messageToEdit = roomMessages[editingMessageLanguage][editingMessageIndex]
        await deleteRoomMessage(selectedRoomId, messageToEdit.id)
      }
      
      // Create the new/updated message
      await createRoomMessage(selectedRoomId, editingMessageLanguage, newMessage.trim())
        await loadRoomMessages()
        cancelMessageEdit()
      toast.success('Mensaje guardado')
    } catch (error) {
      console.error('Error adding/updating message:', error)
      toast.error('No se pudo guardar el mensaje')
    } finally {
      isLoading = false
    }
  }

  // Language management functions
  async function loadSystemLanguages() {
    try {
      systemLanguages = await getLanguages()
        // Initialize dynamic hint texts for all languages when languages are loaded
        initializeDynamicHintTexts()
        // Reload messages list when languages change
        await loadRoomMessages()
    } catch (error) {
      console.error('Error loading system languages:', error)
      toast.error('No se pudieron cargar los idiomas')
    }
  }

  function initializeDynamicHintTexts() {
    // Initialize dynamic texts for all available languages if not already done
    if (Object.keys(dynamicHintTexts).length === 0) {
      systemLanguages.forEach(lang => {
        if (!dynamicHintTexts[lang.code]) {
          dynamicHintTexts[lang.code] = ''
        }
      })
    } else {
      // Remove deleted language fields
      for (const code of Object.keys(dynamicHintTexts)) {
        if (!systemLanguages.find(l => l.code === code)) delete dynamicHintTexts[code]
      }
      // Add fields for new languages
      systemLanguages.forEach(lang => {
        if (!dynamicHintTexts[lang.code]) dynamicHintTexts[lang.code] = ''
      })
    }
  }

  function startCreatingLanguage() {
    newLanguage = { code: '', name: '', flag: '' }
    editingLanguage = null
    isCreatingLanguage = true
  }

  function startEditingLanguage(language: any) {
    console.log('🌐 Starting to edit language:', language)
    editingLanguage = language
    newLanguage = { ...language }
    isCreatingLanguage = false
  }

  function cancelLanguageEdit() {
    newLanguage = { code: '', name: '', flag: '' }
    editingLanguage = null
    isCreatingLanguage = false
    showFlagSelector = false
    flagSearchQuery = ''
    filteredFlags = flagEmojis
  }

  function selectFlag(flag: string) {
    newLanguage.flag = flag
    showFlagSelector = false
    flagSearchQuery = ''
    filteredFlags = flagEmojis
  }

  function toggleFlagSelector() {
    showFlagSelector = !showFlagSelector
    if (showFlagSelector) {
      flagSearchQuery = ''
      filteredFlags = flagEmojis
    }
  }

  function filterFlags() {
    if (!flagSearchQuery.trim()) {
      filteredFlags = flagEmojis
    } else {
      const query = flagSearchQuery.toLowerCase()
      filteredFlags = flagEmojis.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.code.toLowerCase().includes(query)
      )
    }
  }

  $: flagSearchQuery, filterFlags()

  // Close flag selector when clicking outside
  function handleFlagSelectorClickOutside(event: MouseEvent) {
    if (showFlagSelector && !(event.target as Element)?.closest('.flag-selector-container')) {
      showFlagSelector = false
      flagSearchQuery = ''
      filteredFlags = flagEmojis
    }
  }

  async function saveLanguage() {
    if (!newLanguage.code.trim() || !newLanguage.name.trim()) return

    try {
      isLoading = true
      
      if (editingLanguage) {
        // Update existing language
        await apiUpdateLanguage(editingLanguage.code, { name: newLanguage.name, flag: newLanguage.flag })
          await loadSystemLanguages()
          cancelLanguageEdit()
          notifyLanguageChange()
        toast.success('Idioma actualizado')
      } else {
        // Create new language
        await apiCreateLanguage({ code: newLanguage.code, name: newLanguage.name, flag: newLanguage.flag })
          await loadSystemLanguages()
          cancelLanguageEdit()
          notifyLanguageChange()
        toast.success('Idioma agregado')
      }
    } catch (error) {
      console.error('Error saving language:', error)
      toast.error('No se pudo guardar el idioma')
    } finally {
      isLoading = false
    }
  }

  async function deleteLanguage(languageCode: string) {
    console.log('🌐 Attempting to delete language:', languageCode)
    if (!confirm(`¿Estás seguro de que quieres eliminar este idioma? Esto eliminará todas las pistas y mensajes asociados.`)) return

    try {
      isLoading = true
      await apiDeleteLanguage(languageCode)
        await loadSystemLanguages()
        if (activeTab === 'hints') await loadHints()
        if (activeTab === 'messages') await loadRoomMessages()
        notifyLanguageChange()
      toast.success('Idioma eliminado')
    } catch (error) {
      console.error('Error deleting language:', error)
      toast.error('No se pudo eliminar el idioma')
    } finally {
      isLoading = false
    }
  }

  // Function to notify other components that languages have changed
  function notifyLanguageChange() {
    // Dispatch a custom event that can be listened to by parent components
    dispatch('languages-changed')
    
    // Also broadcast via window event for components that can't listen to the dispatch
    window.dispatchEvent(new CustomEvent('languages-updated'))
    
    console.log('🌐 Language change notification sent')
  }

  $: selectedRoom = rooms.find(r => r.id === selectedRoomId)
  $: hintsByCategory = hints.reduce((acc, hint) => {
    if (!acc[hint.category]) {
      acc[hint.category] = []
    }
    acc[hint.category].push(hint)
    return acc
  }, {} as Record<string, Hint[]>)
</script>

<svelte:window on:click={handleFlagSelectorClickOutside} />
{#if isOpen}
  <div class="settings-overlay" on:click={(e) => e.currentTarget === e.target && closeSettings()} on:keydown={(e) => e.key === 'Escape' && closeSettings()} role="dialog" aria-modal="true" tabindex="-1">
    <div class="settings-modal" role="document">
      <div class="settings-header">
        <h2>Configuración del Sistema</h2>
        <button class="close-btn" on:click={closeSettings} aria-label="Cerrar configuración">
          <span class="btn-icon close-icon"></span>
        </button>
      </div>

      <div class="settings-content">
        <!-- Room selector -->
        <div class="room-selector">
          <label for="room-select">Sala seleccionada:</label>
          <select id="room-select" bind:value={selectedRoomId}>
            {#each rooms as room}
              <option value={room.id}>{room.name}</option>
            {/each}
          </select>
        </div>

        <!-- Tab navigation -->
        <div class="tab-navigation">
          <button 
            class="tab-btn" 
            class:active={activeTab === 'rooms'}
            on:click={() => switchTab('rooms')}
          >
            <span class="btn-icon rooms-icon"></span>
            Salas
          </button>
          <button 
            class="tab-btn" 
            class:active={activeTab === 'hints'}
            on:click={() => switchTab('hints')}
          >
            <span class="btn-icon hints-icon"></span>
            Pistas
          </button>
          <button 
            class="tab-btn" 
            class:active={activeTab === 'categories'}
            on:click={() => switchTab('categories')}
          >
            <span class="btn-icon categories-icon"></span>
            Categorías
          </button>
          <button 
            class="tab-btn" 
            class:active={activeTab === 'messages'}
            on:click={() => switchTab('messages')}
          >
            <span class="btn-icon messages-icon"></span>
            Mensajes
          </button>
          <button 
            class="tab-btn" 
            class:active={activeTab === 'languages'}
            on:click={() => switchTab('languages')}
          >
            <span class="btn-icon languages-icon"></span>
            Idiomas
          </button>
        </div>

        <!-- Tab content -->
        <div class="tab-content">
          {#if activeTab === 'rooms'}
            <SettingsRooms {rooms} on:room-updated={(e) => dispatch('room-updated', e.detail)} />

          {:else if activeTab === 'hints'}
            <SettingsHints roomId={selectedRoomId} on:hints-updated={() => dispatch('hints-updated')} />

          {:else if activeTab === 'categories'}
            <SettingsCategories roomId={selectedRoomId} roomName={selectedRoom?.name} on:hints-updated={() => dispatch('hints-updated')} />

          {:else if activeTab === 'messages'}
            <SettingsMessages roomId={selectedRoomId} />
          {:else if activeTab === 'languages'}
            <SettingsLanguages on:languages-changed={notifyLanguageChange} />
                              {/if}
                                </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 14, 39, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(12px);
  }

  .settings-modal {
    background: var(--gradient-card);
    border-radius: var(--radius-xl);
    width: 90vw;
    max-width: 900px;
    max-height: 85vh;
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    border: 1px solid rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(20px);
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-xl) var(--space-2xl);
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
  }

  .settings-header h2 {
    margin: 0;
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 1.75rem;
    font-weight: 700;
    position: relative;
  }

  .settings-header h2::before {
    content: '';
    position: absolute;
    left: -24px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    background: var(--gradient-accent);
    border-radius: var(--radius-sm);
    box-shadow: 0 0 8px rgba(100, 217, 255, 0.4);
  }

  .close-btn {
    background: var(--glass-bg);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    backdrop-filter: blur(10px);
  }

  .close-btn:hover {
    background: rgba(255, 87, 87, 0.1);
    border-color: var(--accent-red);
    transform: translateY(-1px);
  }

  .settings-content {
    padding: 2rem;
    overflow-y: auto;
    max-height: calc(80vh - 100px);
  }

  .room-selector {
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .room-selector label {
    font-weight: bold;
    color: #00d4ff;
  }

  .room-selector select {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    padding: 0.5rem 1rem;
    color: white;
    font-family: inherit;
  }

  .tab-navigation {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
    flex-wrap: wrap;
    justify-content: center;
  }

  .tab-btn {
    background: var(--glass-bg);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--text-secondary);
    padding: var(--space-md) var(--space-lg);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
  }

  .tab-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s ease;
  }

  .tab-btn:hover::before {
    left: 100%;
  }

  .tab-btn.active {
    color: var(--text-primary);
    border-color: var(--accent-blue);
    background: rgba(100, 217, 255, 0.1);
    box-shadow: var(--shadow-md);
  }

  .tab-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--accent-blue);
    transform: translateY(-1px);
  }

  .tab-content {
    min-height: 300px;
  }

  /* Removed tab-specific styles; owned by split components now */

  /* Icon styles */
  .btn-icon {
    width: 16px;
    height: 16px;
    display: inline-block;
    position: relative;
  }

  .close-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cline x1='18' y1='6' x2='6' y2='18'%3E%3C/line%3E%3Cline x1='6' y1='6' x2='18' y2='18'%3E%3C/line%3E%3C/svg%3E") center/contain no-repeat;
  }

  .rooms-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'%3E%3C/path%3E%3Cpolyline points='9,22 9,12 15,12 15,22'%3E%3C/polyline%3E%3C/svg%3E") center/contain no-repeat;
  }

  .hints-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'%3E%3C/path%3E%3Cline x1='12' y1='17' x2='12.01' y2='17'%3E%3C/line%3E%3C/svg%3E") center/contain no-repeat;
  }

  .categories-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'%3E%3C/path%3E%3C/svg%3E") center/contain no-repeat;
  }

  .messages-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'%3E%3C/path%3E%3C/svg%3E") center/contain no-repeat;
  }

  .languages-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='M2 12h20'%3E%3C/path%3E%3Cpath d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'%3E%3C/path%3E%3C/svg%3E") center/contain no-repeat;
  }

  /* Icon masks */
  /* Removed icon masks not used in this file after split */
  /* .plus-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cline x1='12' y1='5' x2='12' y2='19'%3E%3C/line%3E%3Cline x1='5' y1='12' x2='19' y2='12'%3E%3C/line%3E%3C/svg%3E") center/contain no-repeat;
  } */

  /* .edit-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'%3E%3C/path%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'%3E%3C/path%3E%3C/svg%3E") center/contain no-repeat;
  } */

  /* .delete-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpolyline points='3,6 5,6 21,6'%3E%3C/polyline%3E%3Cpath d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'%3E%3C/path%3E%3Cline x1='10' y1='11' x2='10' y2='17'%3E%3C/line%3E%3Cline x1='14' y1='11' x2='14' y2='17'%3E%3C/line%3E%3C/svg%3E") center/contain no-repeat;
  } */

  /* .save-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'%3E%3C/path%3E%3Cpolyline points='17,21 17,13 7,13 7,21'%3E%3C/polyline%3E%3Cpolyline points='7,3 7,8 15,8'%3E%3C/polyline%3E%3C/svg%3E") center/contain no-repeat;
  } */

  /* .cancel-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='15' y1='9' x2='9' y2='15'%3E%3C/line%3E%3Cline x1='9' y1='9' x2='15' y2='15'%3E%3C/line%3E%3C/svg%3E") center/contain no-repeat;
  } */

  /* Removed local button styles; buttons inside tab content belong to child components */

  /* Child components own button styling within their scope */

  /* Scrollbar */
  .settings-content::-webkit-scrollbar {
    width: 8px;
  }

  .settings-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  .settings-content::-webkit-scrollbar-thumb {
    background: rgba(0, 212, 255, 0.6);
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    .settings-modal {
      width: 95vw;
      max-height: 90vh;
    }

    .settings-content {
      padding: 1rem;
    }

    .tab-navigation {
      flex-direction: column;
    }

  /* child components handle their own responsive form actions */
  }

  
</style>