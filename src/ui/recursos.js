const FLASHCARD_STORE_KEY = 'hanari-flashcards-v1'
const FLASHCARD_SRS_KEY = 'hanari-flashcards-srs-v1'

const STARTER_FLASHCARDS = [
  { term: 'thought', ipa: '/θɔːt/', pos: 'NOUN', translationEs: 'pensamiento', example: 'That thought changed my plan.' },
  { term: 'study', ipa: '/ˈstʌdi/', pos: 'VERB', translationEs: 'estudiar', example: 'I study linguistics every day.' },
  { term: 'auxiliary', ipa: '/ɔːɡˈzɪliəri/', pos: 'NOUN', translationEs: 'auxiliar', example: 'Do is an auxiliary in questions.' },
  { term: 'agreement', ipa: '/əˈɡriːmənt/', pos: 'NOUN', translationEs: 'concordancia', example: 'Subject-verb agreement is essential.' },
  { term: 'late', ipa: '/leɪt/', pos: 'ADJ', translationEs: 'tarde', example: 'She is late for class.' }
]

export function initRecursos(onReviewed) {
  const flashcardRepoUrl = document.getElementById('flashcardRepoUrl')
  const importFlashcardsBtn = document.getElementById('importFlashcardsBtn')
  const flashcardImportStatus = document.getElementById('flashcardImportStatus')
  const flashcardBox = document.getElementById('flashcardBox')

  let flashcards = []
  let flashcardQueue = []
  let currentFlashcard = null
  let revealFlashcard = false

  const normalizeFlashcard = (item) => ({
    id: item.id ?? `${String(item.term ?? '').toLowerCase()}-${String(item.pos ?? 'lex').toLowerCase()}`,
    term: String(item.term ?? '').trim(),
    ipa: String(item.ipa ?? '').trim(),
    pos: String(item.pos ?? 'LEX').trim().toUpperCase(),
    translationEs: String(item.translationEs ?? item.translation ?? '').trim(),
    example: String(item.example ?? '').trim()
  })

  const loadFlashcards = () => {
    try {
      const raw = window.localStorage.getItem(FLASHCARD_STORE_KEY)
      const parsed = raw ? JSON.parse(raw) : STARTER_FLASHCARDS
      flashcards = parsed.map(normalizeFlashcard).filter((c) => c.term && c.translationEs)
    } catch {
      flashcards = STARTER_FLASHCARDS.map(normalizeFlashcard)
    }
    if (!flashcards.length) flashcards = STARTER_FLASHCARDS.map(normalizeFlashcard)
  }

  const saveFlashcards = () => {
    try { window.localStorage.setItem(FLASHCARD_STORE_KEY, JSON.stringify(flashcards)) } catch {}
  }

  const loadSrsState = () => {
    try { return JSON.parse(window.localStorage.getItem(FLASHCARD_SRS_KEY) || '{}') } catch { return {} }
  }

  const saveSrsState = (state) => {
    try { window.localStorage.setItem(FLASHCARD_SRS_KEY, JSON.stringify(state)) } catch {}
  }

  const getCardSrs = (cardId) => {
    const store = loadSrsState()
    return store[cardId] ?? { interval: 0, ease: 2.5, reps: 0, dueAt: 0 }
  }

  const setCardSrs = (cardId, next) => {
    const store = loadSrsState()
    store[cardId] = next
    saveSrsState(store)
  }

  const buildDueFlashcardQueue = () => {
    const now = Date.now()
    const withSrs = flashcards.map((card) => ({ card, srs: getCardSrs(card.id) }))
    const due = withSrs.filter((entry) => (entry.srs.dueAt ?? 0) <= now).map((entry) => entry.card)
    const fallback = withSrs.sort((a, b) => (a.srs.dueAt ?? 0) - (b.srs.dueAt ?? 0)).map((entry) => entry.card)
    flashcardQueue = due.length ? due : fallback
  }

  const computeSm2 = (srs, quality) => {
    let ease = srs.ease ?? 2.5
    let reps = srs.reps ?? 0
    let interval = srs.interval ?? 0
    if (quality < 3) { reps = 0; interval = 1 }
    else { reps += 1; if (reps === 1) interval = 1; else if (reps === 2) interval = 3; else interval = Math.max(1, Math.round(interval * ease)) }
    ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    return { reps, interval, ease, dueAt: Date.now() + interval * 24 * 60 * 60 * 1000 }
  }

  const renderFlashcards = () => {
    if (!flashcardBox) return
    if (!currentFlashcard) { flashcardBox.innerHTML = '<p>No hay tarjetas disponibles.</p>'; return }
    const dueCount = flashcardQueue.length
    flashcardBox.innerHTML = `<div class="flashcard-head"><div><p class="flashcard-term">${currentFlashcard.term}</p><p class="flashcard-meta">${currentFlashcard.ipa || 'IPA pendiente'} · ${currentFlashcard.pos}</p></div><span class="pill">Tarjetas pendientes: ${dueCount}</span></div>${revealFlashcard ? `<div class="flashcard-answer"><p><strong>Traducción:</strong> ${currentFlashcard.translationEs}</p><p><strong>Ejemplo:</strong> ${currentFlashcard.example || 'Sin ejemplo'}</p><div class="flashcard-actions"><button type="button" data-quality="2">Again</button><button type="button" data-quality="3">Hard</button><button type="button" data-quality="4">Good</button><button type="button" data-quality="5">Easy</button></div></div>` : '<button type="button" class="primary" id="revealFlashcardBtn">Mostrar respuesta</button>'}`

    const revealBtn = document.getElementById('revealFlashcardBtn')
    if (revealBtn) revealBtn.addEventListener('click', () => { revealFlashcard = true; renderFlashcards() })

    flashcardBox.querySelectorAll('button[data-quality]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!currentFlashcard) return
        const quality = Number(btn.dataset.quality)
        const srs = getCardSrs(currentFlashcard.id)
        setCardSrs(currentFlashcard.id, computeSm2(srs, quality))
        if (onReviewed) onReviewed({ isCorrect: quality >= 3, word: currentFlashcard.term })
        pickNextFlashcard()
      })
    })
  }

  const pickNextFlashcard = () => {
    buildDueFlashcardQueue()
    currentFlashcard = flashcardQueue[0] ?? null
    revealFlashcard = false
    renderFlashcards()
  }

  const importFlashcardsFromGithub = async () => {
    const url = flashcardRepoUrl?.value?.trim()
    if (!url) { if (flashcardImportStatus) flashcardImportStatus.textContent = 'Escribe una URL RAW de GitHub para importar.'; return }
    try {
      if (flashcardImportStatus) flashcardImportStatus.textContent = 'Importando mazo...'
      const response = await fetch(url)
      if (!response.ok) throw new Error('No se pudo descargar el JSON')
      const payload = await response.json()
      const deck = Array.isArray(payload) ? payload : (payload.cards ?? [])
      const normalized = deck.map(normalizeFlashcard).filter((c) => c.term && c.translationEs)
      if (!normalized.length) throw new Error('El mazo no trae tarjetas válidas')
      flashcards = normalized
      saveFlashcards()
      pickNextFlashcard()
      if (flashcardImportStatus) flashcardImportStatus.textContent = `Mazo importado: ${normalized.length} flashcards.`
    } catch (error) {
      if (flashcardImportStatus) flashcardImportStatus.textContent = `Importación fallida: ${error.message}`
    }
  }

  if (importFlashcardsBtn) importFlashcardsBtn.addEventListener('click', importFlashcardsFromGithub)

  loadFlashcards()
  pickNextFlashcard()

  return { refresh: pickNextFlashcard }
}
