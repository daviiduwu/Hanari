import { getErrorProfile } from '../linguistics/errorProfile.js'
import { initSubsectionControllers } from './subsections.js'
import { initOpciones } from './opciones.js'
import { createYoModule } from './yo.js'
import { initRecursos } from './recursos.js'
import { initHerramientas } from './herramientas.js'

const menuList = document.getElementById('menuList')
const sections = Array.from(document.querySelectorAll('.section'))
const userLevel = document.getElementById('userLevel')
const levelDetails = document.getElementById('levelDetails')
const masteryPill = document.getElementById('masteryPill')

let latestProfile = getErrorProfile()

function switchSection(sectionId) {
  sections.forEach((section) => {
    section.classList.toggle('active', section.id === `section-${sectionId}`)
  })

  menuList.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.section === sectionId)
  })
}

menuList.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-section]')
  if (!btn) return
  switchSection(btn.dataset.section)
})

function calculateGlobalLevel(profile) {
  const concepts = Object.values(profile?.concepts ?? {})
  if (!concepts.length) {
    return { label: 'Nivel 1 · Inicio', mastery: 0, detail: 'Aún no hay suficientes intentos para calcular progresión fina.' }
  }
  const avgMastery = concepts.reduce((acc, s) => acc + (s.mastery ?? 0), 0) / concepts.length
  const level = Math.max(1, Math.min(20, Math.floor(avgMastery * 20) || 1))
  return { label: `Nivel ${level}`, mastery: avgMastery, detail: `Progreso estimado con ${concepts.length} conceptos activos.` }
}

const yoModule = createYoModule(calculateGlobalLevel)

function renderHome(profile) {
  latestProfile = profile
  const levelData = calculateGlobalLevel(profile)
  userLevel.textContent = levelData.label
  masteryPill.textContent = `Mastery global: ${(levelData.mastery * 100).toFixed(0)}%`
  levelDetails.textContent = levelData.detail
  yoModule.renderYo(profile)
}

initOpciones()
initSubsectionControllers()
initRecursos(({ isCorrect, word }) => {
  yoModule.recordExercise(isCorrect, latestProfile, word)
  renderHome(latestProfile)
})

const herramientas = initHerramientas({
  yoModule,
  onProfileUpdate: (profile) => {
    latestProfile = profile
    renderHome(profile)
  }
})

// mantener comportamiento previo: al analizar, abre Herramientas
const analyzeBtn = document.getElementById('analyzeBtn')
if (analyzeBtn) {
  analyzeBtn.addEventListener('click', () => switchSection('herramientas'))
}

renderHome(latestProfile)

// export pequeño hook para pruebas manuales
window.__hanariApp = { switchSection, analyzeNow: () => herramientas.analyzeSentence() }
