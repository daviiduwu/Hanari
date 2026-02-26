const USER_PROGRESS_KEY = 'hanari-user-progress-v1'
const MONTH_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function defaultProgressState() {
  return {
    wordsLearned: {},
    grammarAnswered: 0,
    grammarCorrect: 0,
    studyDays: {},
    masteryHistory: [],
    goals: ''
  }
}

export function createYoModule(calculateGlobalLevel) {
  const yoLevel = document.getElementById('yoLevel')
  const yoWordsLearned = document.getElementById('yoWordsLearned')
  const yoGoalsInput = document.getElementById('yoGoalsInput')
  const saveGoalsBtn = document.getElementById('saveGoalsBtn')
  const yoGoalsStatus = document.getElementById('yoGoalsStatus')
  const yoStatsList = document.getElementById('yoStatsList')
  const yoCalendarPanel = document.getElementById('yoCalendarPanel')
  const yoCalendarGrid = document.getElementById('yoCalendarGrid')
  const yoCalendarYearLabel = document.getElementById('yoCalendarYearLabel')
  const yoDateWeather = document.getElementById('yoDateWeather')
  const yoPrevYearBtn = document.getElementById('yoPrevYearBtn')
  const yoNextYearBtn = document.getElementById('yoNextYearBtn')
  const yoProgressChart = document.getElementById('yoProgressChart')

  let yoCalendarYear = new Date().getFullYear()
  let weatherCache = { theme: 'weather-cloudy', label: 'Clima no disponible', emoji: '⛅', fetchedAt: 0, inFlight: null }
  let latestProfile = { concepts: {} }

  const getProgressState = () => {
    try {
      const raw = window.localStorage.getItem(USER_PROGRESS_KEY)
      if (!raw) return defaultProgressState()
      return { ...defaultProgressState(), ...JSON.parse(raw) }
    } catch {
      return defaultProgressState()
    }
  }

  const saveProgressState = (state) => {
    try { window.localStorage.setItem(USER_PROGRESS_KEY, JSON.stringify(state)) } catch {}
  }

  const isoDay = (date) => date.toISOString().slice(0, 10)

  const markStudyDay = (state, date = new Date()) => {
    const key = isoDay(date)
    state.studyDays[key] = (state.studyDays[key] ?? 0) + 1
  }

  const appendMasterySnapshot = (state, profile) => {
    const levelData = calculateGlobalLevel(profile)
    const today = isoDay(new Date())
    const existing = (state.masteryHistory ?? []).find((point) => point.day === today)
    const value = Number((levelData.mastery ?? 0).toFixed(4))
    if (existing) existing.mastery = value
    else state.masteryHistory.push({ day: today, mastery: value })
    state.masteryHistory = state.masteryHistory.slice(-60)
  }

  const getWeatherTypeFromCode = (code) => {
    if ([0, 1].includes(code)) return { theme: 'weather-sunny', label: 'Soleado', emoji: '☀️' }
    if ([2, 3, 45, 48].includes(code)) return { theme: 'weather-cloudy', label: 'Nublado', emoji: '☁️' }
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { theme: 'weather-snowy', label: 'Nevando', emoji: '❄️' }
    if ([95, 96, 99].includes(code)) return { theme: 'weather-storm', label: 'Tormenta', emoji: '⛈️' }
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { theme: 'weather-rainy', label: 'Lluvia', emoji: '🌧️' }
    return { theme: 'weather-cloudy', label: 'Variable', emoji: '⛅' }
  }

  const fallbackWeatherByMonth = (monthIndex) => {
    if ([11, 0, 1].includes(monthIndex)) return { theme: 'weather-cloudy', label: 'Invierno', emoji: '⛅' }
    if ([2, 3, 4].includes(monthIndex)) return { theme: 'weather-rainy', label: 'Primavera', emoji: '🌦️' }
    if ([5, 6, 7].includes(monthIndex)) return { theme: 'weather-sunny', label: 'Verano', emoji: '☀️' }
    return { theme: 'weather-cloudy', label: 'Otoño', emoji: '🍂' }
  }

  const fetchCurrentWeather = async () => {
    const now = Date.now()
    if (weatherCache.fetchedAt && now - weatherCache.fetchedAt < 30 * 60 * 1000) return weatherCache
    if (weatherCache.inFlight) return weatherCache.inFlight

    weatherCache.inFlight = (async () => {
      try {
        const response = await fetch('https://wttr.in/?format=j1')
        if (!response.ok) throw new Error('weather fetch failed')
        const data = await response.json()
        const weather = getWeatherTypeFromCode(Number(data?.current_condition?.[0]?.weatherCode))
        weatherCache = { ...weather, fetchedAt: Date.now(), inFlight: null }
        return weatherCache
      } catch {
        const fallback = fallbackWeatherByMonth(new Date().getMonth())
        weatherCache = { ...fallback, fetchedAt: Date.now(), inFlight: null }
        return weatherCache
      }
    })()

    return weatherCache.inFlight
  }

  const renderYoCalendarHeader = () => {
    if (!yoCalendarYearLabel || !yoDateWeather) return
    const now = new Date()
    const dateLabel = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    yoCalendarYearLabel.textContent = String(yoCalendarYear)
    yoDateWeather.textContent = `${dateLabel} · ${weatherCache.emoji} ${weatherCache.label}`
    if (yoCalendarPanel) {
      yoCalendarPanel.classList.remove('weather-sunny', 'weather-rainy', 'weather-cloudy', 'weather-snowy', 'weather-storm')
      yoCalendarPanel.classList.add(weatherCache.theme)
    }
  }

  const renderYoCalendar = (state) => {
    if (!yoCalendarGrid) return
    const todayIso = isoDay(new Date())
    yoCalendarGrid.innerHTML = MONTH_LABELS.map((monthLabel, monthIndex) => {
      const first = new Date(yoCalendarYear, monthIndex, 1)
      const daysInMonth = new Date(yoCalendarYear, monthIndex + 1, 0).getDate()
      const startOffset = (first.getDay() + 6) % 7
      const dayCells = []
      for (let i = 0; i < startOffset; i += 1) dayCells.push('<div class="day-cell empty"></div>')
      for (let day = 1; day <= daysInMonth; day += 1) {
        const key = isoDay(new Date(yoCalendarYear, monthIndex, day))
        const studied = (state.studyDays?.[key] ?? 0) > 0
        const isToday = key === todayIso
        dayCells.push(`<div class="day-cell ${studied ? 'studied' : ''} ${isToday ? 'today' : ''}" title="${key} · sesiones: ${state.studyDays?.[key] ?? 0}">${day}</div>`)
      }
      return `<article class="month-card"><div class="month-title">${monthLabel}</div><div class="month-weekdays">${WEEKDAY_SHORT.map((w) => `<span>${w}</span>`).join('')}</div><div class="month-days">${dayCells.join('')}</div></article>`
    }).join('')
    renderYoCalendarHeader()
  }

  const renderYoChart = (state) => {
    if (!yoProgressChart) return
    const ctx = yoProgressChart.getContext('2d')
    if (!ctx) return
    const points = (state.masteryHistory ?? []).slice(-30)
    const width = yoProgressChart.width
    const height = yoProgressChart.height
    const pad = 24
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#e5e7eb'
    ctx.beginPath(); ctx.moveTo(pad, height - pad); ctx.lineTo(width - pad, height - pad); ctx.moveTo(pad, pad); ctx.lineTo(pad, height - pad); ctx.stroke()
    if (!points.length) {
      ctx.fillStyle = '#6b7280'; ctx.font = '14px Arial'; ctx.fillText('Aún no hay histórico de progreso.', pad + 8, height / 2); return
    }
    const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.beginPath()
    points.forEach((point, idx) => {
      const x = pad + idx * stepX
      const y = height - pad - (Math.max(0, Math.min(1, point.mastery ?? 0)) * (height - pad * 2))
      if (idx === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  const renderYo = (profile) => {
    latestProfile = profile
    const progress = getProgressState()
    const levelData = calculateGlobalLevel(profile)
    const wordsLearnedCount = Object.keys(progress.wordsLearned ?? {}).length
    const grammarAnswered = progress.grammarAnswered ?? 0
    const grammarCorrect = progress.grammarCorrect ?? 0
    const accuracy = grammarAnswered ? (grammarCorrect / grammarAnswered) * 100 : 0

    if (yoLevel) yoLevel.textContent = levelData.label
    if (yoWordsLearned) yoWordsLearned.textContent = String(wordsLearnedCount)
    if (yoGoalsInput && document.activeElement !== yoGoalsInput) yoGoalsInput.value = progress.goals ?? ''
    if (yoStatsList) yoStatsList.innerHTML = `<li><strong>Palabras aprendidas:</strong> ${wordsLearnedCount}</li><li><strong>Preguntas de gramática respondidas:</strong> ${grammarAnswered}</li><li><strong>Preguntas correctas:</strong> ${grammarCorrect}</li><li><strong>Precisión gramatical:</strong> ${accuracy.toFixed(0)}%</li>`

    renderYoCalendar(progress)
    renderYoChart(progress)
    fetchCurrentWeather().then(renderYoCalendarHeader)
  }

  if (saveGoalsBtn) {
    saveGoalsBtn.addEventListener('click', () => {
      const progress = getProgressState()
      progress.goals = yoGoalsInput?.value?.trim() ?? ''
      markStudyDay(progress)
      saveProgressState(progress)
      if (yoGoalsStatus) yoGoalsStatus.textContent = 'Metas guardadas correctamente.'
      renderYo(latestProfile)
    })
  }

  if (yoPrevYearBtn) yoPrevYearBtn.addEventListener('click', () => { yoCalendarYear -= 1; renderYo(latestProfile) })
  if (yoNextYearBtn) yoNextYearBtn.addEventListener('click', () => { yoCalendarYear += 1; renderYo(latestProfile) })

  const recordAnalysis = (result, profile) => {
    const progress = getProgressState()
    for (const token of (result?.tokens ?? [])) {
      const normalized = String(token.token || '').toLowerCase().trim()
      if (normalized && normalized.length > 1) progress.wordsLearned[normalized] = true
    }
    markStudyDay(progress)
    appendMasterySnapshot(progress, profile)
    saveProgressState(progress)
    renderYo(profile)
  }

  const recordExercise = (isCorrect, profile, word = null) => {
    const progress = getProgressState()
    progress.grammarAnswered = (progress.grammarAnswered ?? 0) + 1
    if (isCorrect) progress.grammarCorrect = (progress.grammarCorrect ?? 0) + 1
    if (word) progress.wordsLearned[String(word).toLowerCase()] = true
    markStudyDay(progress)
    appendMasterySnapshot(progress, profile)
    saveProgressState(progress)
    renderYo(profile)
  }

  return { renderYo, recordAnalysis, recordExercise }
}
