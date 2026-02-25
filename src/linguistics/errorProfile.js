const STORAGE_KEY = "hanari.errorProfile.v2"

const memoryStore = {
  updatedAt: null,
  concepts: {}
}

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function defaultStats() {
  return {
    attempts: 0,
    mistakes: 0,
    correct: 0,
    streak: 0,
    mastery: 0,
    lastSeenAt: null
  }
}

function defaultProfile() {
  return {
    updatedAt: new Date().toISOString(),
    concepts: {}
  }
}

function normalizeStats(stats = {}) {
  return {
    attempts: stats.attempts ?? 0,
    mistakes: stats.mistakes ?? 0,
    correct: stats.correct ?? 0,
    streak: stats.streak ?? 0,
    mastery: stats.mastery ?? 0,
    lastSeenAt: stats.lastSeenAt ?? null
  }
}

function normalizeProfile(profile = {}) {
  const concepts = Object.fromEntries(
    Object.entries(profile.concepts ?? {}).map(([concept, stats]) => [concept, normalizeStats(stats)])
  )

  return {
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
    concepts
  }
}

function readStorage() {
  if (!hasLocalStorage()) return normalizeProfile(memoryStore)

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProfile()
    return normalizeProfile(JSON.parse(raw))
  } catch {
    return defaultProfile()
  }
}

function writeStorage(profile) {
  const normalized = normalizeProfile(profile)

  if (!hasLocalStorage()) {
    memoryStore.updatedAt = normalized.updatedAt
    memoryStore.concepts = normalized.concepts
    return normalized
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

function updateConceptStats(current, { isCorrect, countMistake }) {
  const attempts = current.attempts + 1
  const mistakes = current.mistakes + (countMistake ? 1 : 0)
  const correct = current.correct + (isCorrect ? 1 : 0)
  const streak = isCorrect ? current.streak + 1 : 0
  const mastery = attempts === 0 ? 0 : Number((correct / attempts).toFixed(2))

  return {
    attempts,
    mistakes,
    correct,
    streak,
    mastery,
    lastSeenAt: new Date().toISOString()
  }
}

export function getErrorProfile() {
  return readStorage()
}

export function resetErrorProfile() {
  return writeStorage(defaultProfile())
}

export function recordConceptErrors(concepts = []) {
  const profile = readStorage()
  const nextConcepts = { ...profile.concepts }

  concepts.forEach((concept) => {
    if (!concept) return
    const current = normalizeStats(nextConcepts[concept])
    nextConcepts[concept] = updateConceptStats(current, { isCorrect: false, countMistake: true })
  })

  return writeStorage({
    updatedAt: new Date().toISOString(),
    concepts: nextConcepts
  })
}

export function recordExerciseOutcome(concept, isCorrect) {
  if (!concept) return readStorage()

  const profile = readStorage()
  const nextConcepts = { ...profile.concepts }
  const current = normalizeStats(nextConcepts[concept])

  nextConcepts[concept] = updateConceptStats(current, {
    isCorrect,
    countMistake: !isCorrect
  })

  return writeStorage({
    updatedAt: new Date().toISOString(),
    concepts: nextConcepts
  })
}

export function getConceptDifficulty(profile, concept) {
  const stats = normalizeStats(profile.concepts[concept])

  if (stats.attempts < 3) return "easy"
  if (stats.mastery >= 0.8 && stats.streak >= 2) return "hard"
  if (stats.mastery >= 0.55) return "medium"
  return "easy"
}
