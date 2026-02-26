const SETTINGS_KEY = 'hanari-settings-v1'

function defaultSettings() {
  return {
    theme: 'light',
    accessibility: { largeText: false, highContrast: false },
    language: 'es',
    accentColor: '#2563eb'
  }
}

function getSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw)
    return {
      ...defaultSettings(),
      ...parsed,
      accessibility: {
        ...defaultSettings().accessibility,
        ...(parsed.accessibility ?? {})
      }
    }
  } catch {
    return defaultSettings()
  }
}

function saveSettings(settings) {
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch {}
}

export function initOpciones() {
  const themeSelect = document.getElementById('themeSelect')
  const a11yLargeText = document.getElementById('a11yLargeText')
  const a11yHighContrast = document.getElementById('a11yHighContrast')
  const languageSelect = document.getElementById('languageSelect')
  const accentColorPicker = document.getElementById('accentColorPicker')
  const settingsStatus = document.getElementById('settingsStatus')

  const applyLanguage = (language) => {
    document.documentElement.lang = language
    if (settingsStatus) settingsStatus.textContent = language === 'en' ? 'Settings saved.' : 'Ajustes guardados.'
  }

  const applySettingsToUi = (settings) => {
    const theme = ['light', 'dark', 'black'].includes(settings.theme) ? settings.theme : 'light'
    const accentColor = /^#[0-9a-fA-F]{6}$/.test(settings.accentColor ?? '') ? settings.accentColor : '#2563eb'

    document.body.setAttribute('data-theme', theme)
    document.documentElement.style.setProperty('--primary', accentColor)
    document.body.classList.toggle('a11y-large-text', !!settings.accessibility.largeText)
    document.body.classList.toggle('a11y-high-contrast', !!settings.accessibility.highContrast)

    if (themeSelect) themeSelect.value = theme
    if (a11yLargeText) a11yLargeText.checked = !!settings.accessibility.largeText
    if (a11yHighContrast) a11yHighContrast.checked = !!settings.accessibility.highContrast
    if (languageSelect) languageSelect.value = settings.language
    if (accentColorPicker) accentColorPicker.value = accentColor

    applyLanguage(settings.language)
  }

  const updateSettings = (patch) => {
    const current = getSettings()
    const next = {
      ...current,
      ...patch,
      accessibility: {
        ...current.accessibility,
        ...(patch.accessibility ?? {})
      }
    }
    saveSettings(next)
    applySettingsToUi(next)
  }

  if (themeSelect) themeSelect.addEventListener('change', () => updateSettings({ theme: themeSelect.value }))
  if (a11yLargeText) a11yLargeText.addEventListener('change', () => updateSettings({ accessibility: { largeText: a11yLargeText.checked } }))
  if (a11yHighContrast) a11yHighContrast.addEventListener('change', () => updateSettings({ accessibility: { highContrast: a11yHighContrast.checked } }))
  if (languageSelect) languageSelect.addEventListener('change', () => updateSettings({ language: languageSelect.value }))
  if (accentColorPicker) accentColorPicker.addEventListener('input', () => updateSettings({ accentColor: accentColorPicker.value }))

  applySettingsToUi(getSettings())
}
