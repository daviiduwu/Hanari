import { analyze, evaluateExercise } from '../linguistics/analyzer.js'

export function initHerramientas({ onProfileUpdate, yoModule }) {
  const sentenceInput = document.getElementById('sentenceInput')
  const analyzeBtn = document.getElementById('analyzeBtn')
  const clauseResult = document.getElementById('clauseResult')
  const feedbackResult = document.getElementById('feedbackResult')
  const tokenResult = document.getElementById('tokenResult')
  const exerciseResult = document.getElementById('exerciseResult')
  const profileResult = document.getElementById('profileResult')
  const morphologyResult = document.getElementById('morphologyResult')
  const syntaxResult = document.getElementById('syntaxResult')
  const semanticsResult = document.getElementById('semanticsResult')
  const pragmaticsResult = document.getElementById('pragmaticsResult')
  const wordDetailResult = document.getElementById('wordDetailResult')

  let latestResult = null
  let latestProfile = { concepts: {} }
  let exerciseStates = {}
  let selectedWordKey = null

  const renderProfile = (profile) => {
    const concepts = Object.entries(profile?.concepts ?? {})
    profileResult.innerHTML = concepts.length
      ? concepts.map(([name, stats]) => `<li><strong>${name}</strong> · intentos: ${stats.attempts} · aciertos: ${stats.correct} · fallos: ${stats.mistakes} · mastery: ${(stats.mastery * 100).toFixed(0)}%</li>`).join('')
      : '<li>Sin historial todavía.</li>'
  }

  const renderWordDetails = (wordEntry) => {
    if (!wordEntry || !wordEntry.knowledge) {
      wordDetailResult.innerHTML = '<p class="placeholder">Sin entrada de corpus para esta palabra todavía.</p>'
      return
    }
    const k = wordEntry.knowledge
    wordDetailResult.innerHTML = `<p><strong>Palabra:</strong> ${wordEntry.token}</p><p><strong>IPA:</strong> ${k.ipa}</p><p><strong>Qué es:</strong> ${k.wordClass}</p><p><strong>Etimología:</strong> ${k.etymology}</p><p><strong>Significado:</strong> ${k.meaning}</p><p><strong>Uso en oración:</strong> ${k.usage}</p><p><strong>Nota didáctica:</strong> ${k.notes}</p><p class="placeholder"><em>Forma base (lemma)</em> = palabra canónica; <em>POS</em> = categoría gramatical.</p>`
  }

  const renderLinguisticLayers = (result) => {
    morphologyResult.innerHTML = (result.morphology ?? []).map((m) => {
      const active = selectedWordKey === m.token ? 'style="font-weight:700;"' : ''
      return `<li><button type="button" data-word-token="${m.token}" ${active}>${m.token}</button> → forma base (lemma): ${m.lemma}, categoría gramatical (POS): ${m.pos}, rasgos: ${m.features.join(', ') || 'none'}</li>`
    }).join('') || '<li>Sin datos morfológicos.</li>'
    syntaxResult.textContent = result.syntax?.bracketed ?? 'Sin árbol sintáctico.'
    const semantics = result.semantics
    semanticsResult.innerHTML = semantics ? `<li><strong>Predicado:</strong> ${semantics.predicate ?? 'N/A'}</li><li><strong>Agente:</strong> ${semantics.roles?.agent ?? 'N/A'}</li><li><strong>Acción:</strong> ${semantics.roles?.action ?? 'N/A'}</li><li><strong>Tema:</strong> ${semantics.roles?.theme ?? 'N/A'}</li><li><strong>Polaridad:</strong> ${semantics.polarity}</li><li><strong>Modalidad:</strong> ${semantics.modality}</li>` : '<li>Sin datos semánticos.</li>'
    const pragmatics = result.pragmatics
    pragmaticsResult.innerHTML = pragmatics ? `<li><strong>Acto de habla:</strong> ${pragmatics.speechAct}</li><li><strong>Cortesía:</strong> ${pragmatics.politeness}</li><li><strong>Intención comunicativa:</strong> ${pragmatics.communicativeIntent}</li>` : '<li>Sin datos pragmáticos.</li>'

    morphologyResult.querySelectorAll('button[data-word-token]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedWordKey = btn.dataset.wordToken
        const wordEntry = latestResult?.morphology?.find((m) => m.token === selectedWordKey)
        renderWordDetails(wordEntry)
        renderLinguisticLayers(latestResult)
      })
    })
  }

  const buildExerciseFields = (exercise) => {
    if (exercise.type === 'single-choice') return (exercise.options ?? []).map((opt) => `<label><input type="radio" name="${exercise.id}" value="${opt}"> ${opt}</label><br/>`).join('')
    if (exercise.type === 'multi-select') return (exercise.options ?? []).map((opt) => `<label><input type="checkbox" name="${exercise.id}" value="${opt}"> ${opt}</label><br/>`).join('')
    return `<input id="answer-${exercise.id}" type="text" placeholder="Escribe tu respuesta" />`
  }

  const readExerciseAnswer = (exercise) => {
    if (exercise.type === 'single-choice') return document.querySelector(`input[name='${exercise.id}']:checked`)?.value ?? ''
    if (exercise.type === 'multi-select') return Array.from(document.querySelectorAll(`input[name='${exercise.id}']:checked`)).map((el) => el.value)
    return document.getElementById(`answer-${exercise.id}`)?.value ?? ''
  }

  const renderExercises = (exercises) => {
    if (!exercises.length) { exerciseResult.innerHTML = '<p>No hay ejercicios porque no se detectaron errores.</p>'; return }
    exerciseResult.innerHTML = exercises.map((exercise) => {
      const status = exerciseStates[exercise.id]
      const reveal = status && !status.isCorrect
      return `<article class="exercise" id="exercise-${exercise.id}"><div><strong>${exercise.type}</strong> <span class="pill">${exercise.difficulty}</span> <span class="pill">${exercise.focus}</span></div><p>${exercise.prompt}</p><div>${buildExerciseFields(exercise)}</div><button type="button" class="primary" data-exercise-id="${exercise.id}">Responder</button>${status ? `<p class="feedback">${status.feedback}</p>` : ''}${reveal ? `<p class="feedback"><strong>Respuesta esperada:</strong> ${status.expectedAnswers.join(' | ')}</p>` : ''}</article>`
    }).join('')

    exerciseResult.querySelectorAll('button[data-exercise-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const exercise = latestResult?.exercises?.find((item) => item.id === btn.dataset.exerciseId)
        if (!exercise) return
        const evaluation = evaluateExercise(exercise, readExerciseAnswer(exercise))
        latestProfile = evaluation.profile
        exerciseStates[exercise.id] = { isCorrect: evaluation.isCorrect, feedback: evaluation.feedback, expectedAnswers: evaluation.expectedAnswers }
        yoModule.recordExercise(evaluation.isCorrect, latestProfile)
        onProfileUpdate(latestProfile)
        renderExercises(latestResult.exercises)
        renderProfile(latestProfile)
      })
    })
  }

  const renderFeedback = (result) => {
    if (!result.errors.length) {
      feedbackResult.innerHTML = '<h3 class="ok">Sin errores detectados</h3><p>La oración pasa las reglas actuales del MVP.</p>'
      return
    }
    const errorsHtml = result.errors.map((err) => `<article class="error"><strong>${err.title}</strong><p><strong>Qué está mal:</strong> ${err.explanation}</p><p><strong>Por qué:</strong> ${err.why}</p><p><strong>Sugerencia:</strong> ${err.suggestion}</p></article>`).join('')
    feedbackResult.innerHTML = `<h3>Corrección y explicación</h3><p><strong>Oración sugerida:</strong> ${result.correction}</p>${errorsHtml}`
  }

  const renderAnalyzer = (result) => {
    latestResult = result
    latestProfile = result.profile
    exerciseStates = {}
    selectedWordKey = null

    yoModule.recordAnalysis(result, latestProfile)

    if (!result.clause) {
      clauseResult.innerHTML = '<strong>Sin datos.</strong> Escribe una oración para analizar.'
      tokenResult.innerHTML = ''
      renderFeedback(result)
      renderExercises(result.exercises)
      renderProfile(result.profile)
      renderLinguisticLayers(result)
      renderWordDetails(null)
      onProfileUpdate(result.profile)
      return
    }

    clauseResult.innerHTML = `<h3>Estructura de cláusula</h3><p><strong>Subject:</strong> ${result.clause.subject ?? 'N/A'}</p><p><strong>Auxiliary:</strong> ${result.clause.auxiliary ?? 'N/A'}</p><p><strong>Main verb:</strong> ${result.clause.mainVerb ?? 'N/A'}</p><p><strong>Verb role:</strong> ${result.clause.verbRole ?? 'N/A'}</p><p><strong>Predicate complement:</strong> ${result.clause.predicateComplement ?? 'N/A'}</p><p><strong>Aspect:</strong> ${result.clause.aspect}</p><p><strong>Function:</strong> ${result.clause.function}</p>`
    tokenResult.innerHTML = result.tokens.map((t) => `<li><strong>${t.token}</strong> → ${t.tags.join(', ')}</li>`).join('')

    renderFeedback(result)
    renderExercises(result.exercises)
    renderProfile(result.profile)
    renderLinguisticLayers(result)
    const firstKnownWord = result.morphology?.find((m) => m.knowledge) ?? null
    renderWordDetails(firstKnownWord ?? result.morphology?.[0] ?? null)
    onProfileUpdate(result.profile)
  }

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      renderAnalyzer(analyze(sentenceInput.value))
    })
  }

  return { analyzeSentence: () => analyzeBtn?.click() }
}
