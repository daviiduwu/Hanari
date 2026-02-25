/**
 * Rule-based linguistic analyzer + feedback engine (MVP).
 * Compatible with static hosting (GitHub Pages).
 */
import {
  getConceptDifficulty,
  getErrorProfile,
  recordConceptErrors,
  recordExerciseOutcome
} from "./errorProfile.js"
import { getWordKnowledge } from "./corpora/etymologyIpaCorpus.js"

const AUXILIARIES = new Set([
  "am", "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did",
  "have", "has", "had",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must"
])

const BE_AUX = new Set(["am", "is", "are", "was", "were"])
const HAVE_AUX = new Set(["have", "has", "had"])
const DO_AUX = new Set(["do", "does", "did"])
const MODAL_AUX = new Set(["will", "would", "shall", "should", "can", "could", "may", "might", "must"])
const PRONOUN_SUBJECTS = new Set(["i", "you", "he", "she", "it", "we", "they"])
const NEGATION_MARKERS = new Set(["not", "n't"])
const WH_WORDS = new Set(["what", "why", "how", "when", "where", "who", "whom", "whose", "which"])

const DETERMINERS = new Set(["a", "an", "the", "this", "that", "these", "those", "my", "your", "his", "her", "our", "their"])
const COMMON_HAVE_OBJECTS = new Set(["lunch", "breakfast", "dinner", "fun", "time", "trouble", "class", "coffee", "tea", "work"])
const FUNCTION_WORDS = new Set(["a", "an", "the", "my", "your", "his", "her", "our", "their", "to", "of", "for", "in", "on", "at", "with", "and", "or", "but"])

const SUBJECT_AUX_RULES = {
  i: new Set(["am", "was", "have", "had", "do", "did", "will", "would", "can", "could", "may", "might", "must", "should", "shall"]),
  you: new Set(["are", "were", "have", "had", "do", "did", "will", "would", "can", "could", "may", "might", "must", "should", "shall"]),
  he: new Set(["is", "was", "has", "had", "does", "did", "will", "would", "can", "could", "may", "might", "must", "should", "shall"]),
  she: new Set(["is", "was", "has", "had", "does", "did", "will", "would", "can", "could", "may", "might", "must", "should", "shall"]),
  it: new Set(["is", "was", "has", "had", "does", "did", "will", "would", "can", "could", "may", "might", "must", "should", "shall"]),
  we: new Set(["are", "were", "have", "had", "do", "did", "will", "would", "can", "could", "may", "might", "must", "should", "shall"]),
  they: new Set(["are", "were", "have", "had", "do", "did", "will", "would", "can", "could", "may", "might", "must", "should", "shall"])
}

const ERROR_TO_CONCEPT = {
  SUBJECT_AUX_AGREEMENT: "subject-auxiliary-agreement",
  MISSING_PROGRESSIVE_AUX: "progressive-aspect",
  PERFECT_WITHOUT_PARTICIPLE: "perfect-aspect",
  COPULAR_COMPLEMENT_AGREEMENT: "copular-complement-agreement"
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
}

function tokenize(text) {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((raw) => raw.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, ""))
    .filter(Boolean)
}

function getBeAuxForSubject(subject) {
  const s = subject?.toLowerCase()
  if (s === "i") return "am"
  if (["he", "she", "it"].includes(s)) return "is"
  return "are"
}

function getHaveAuxForSubject(subject, observedAux) {
  const s = subject?.toLowerCase()
  if (observedAux === "had") return "had"
  if (["he", "she", "it"].includes(s)) return "has"
  return "have"
}

function getDoAuxForSubject(subject, observedAux) {
  const s = subject?.toLowerCase()
  if (observedAux === "did") return "did"
  if (["he", "she", "it"].includes(s)) return "does"
  return "do"
}

function suggestAuxiliary(subject, observedAux) {
  const aux = observedAux?.toLowerCase()

  if (HAVE_AUX.has(aux)) return getHaveAuxForSubject(subject, aux)
  if (DO_AUX.has(aux)) return getDoAuxForSubject(subject, aux)
  if (BE_AUX.has(aux)) return getBeAuxForSubject(subject)
  if (MODAL_AUX.has(aux)) return aux

  return getBeAuxForSubject(subject)
}

function findMainVerb(tokens, auxiliaryIndex, subjectIndex = -1) {
  const start = auxiliaryIndex >= 0 ? auxiliaryIndex + 1 : 1

  for (let i = start; i < tokens.length; i += 1) {
    const lower = tokens[i].toLowerCase()
    if (NEGATION_MARKERS.has(lower)) continue
    if (i !== subjectIndex && !AUXILIARIES.has(lower)) return tokens[i]
  }

  if (auxiliaryIndex >= 0) {
    for (let i = 1; i < tokens.length; i += 1) {
      const lower = tokens[i].toLowerCase()
      if (NEGATION_MARKERS.has(lower)) continue
      if (i !== auxiliaryIndex && i !== subjectIndex && !AUXILIARIES.has(lower)) return tokens[i]
    }
  }

  return tokens[1] ?? null
}



function isLikelyAdjective(token) {
  const lower = token.toLowerCase()
  return ["late", "early", "ready", "happy", "sad", "tired"].includes(lower) || /y$|ful$|ous$|ive$|al$/.test(lower)
}


function isParticipleLike(token) {
  const lower = token.toLowerCase()
  return lower.endsWith("ing") || /ed$|en$/.test(lower)
}

function chooseClauseInterpretation({ auxiliary, predicateHead }) {
  const aux = auxiliary?.toLowerCase()
  const head = predicateHead?.toLowerCase() ?? ""

  const scores = {
    copular: 0,
    auxiliaryChain: 0
  }

  if (BE_AUX.has(aux)) scores.copular += 1
  if (isLikelyAdjective(head)) scores.copular += 2
  if (FUNCTION_WORDS.has(head)) scores.auxiliaryChain += 2
  if (isParticipleLike(head)) scores.auxiliaryChain += 3

  return scores.copular >= scores.auxiliaryChain ? "copular" : "auxiliaryChain"
}

function findCopularPredicateHead(tokens, auxiliaryIndex, subjectIndex) {
  let candidate = null

  for (let i = auxiliaryIndex + 1; i < tokens.length; i += 1) {
    const lower = tokens[i].toLowerCase()
    if (NEGATION_MARKERS.has(lower) || i === subjectIndex || FUNCTION_WORDS.has(lower)) continue
    candidate = tokens[i]
    if (isLikelyAdjective(tokens[i])) return tokens[i]
  }

  return candidate ?? findMainVerb(tokens, auxiliaryIndex, subjectIndex)
}


function isLikelyLexicalHaveCore(tokens, auxiliaryIndex, lowerMainVerb) {
  if (auxiliaryIndex < 0) return false

  const nextToken = tokens[auxiliaryIndex + 1]?.toLowerCase() ?? ""
  const nextNextToken = tokens[auxiliaryIndex + 2]?.toLowerCase() ?? ""

  if (nextToken === "to") return true
  if (DETERMINERS.has(nextToken)) return true
  if (COMMON_HAVE_OBJECTS.has(nextToken)) return true
  if (DETERMINERS.has(nextToken) && nextNextToken && !AUXILIARIES.has(nextNextToken)) return true

  const noPerfectMarkers = !/ed$|en$/.test(lowerMainVerb || "") && nextToken !== "been"
  if (noPerfectMarkers && COMMON_HAVE_OBJECTS.has(lowerMainVerb || "")) return true

  return false
}

function detectClauseCore(tokens) {
  if (tokens.length === 0) {
    return { subject: null, auxiliary: null, auxiliaryIndex: -1, mainVerb: null }
  }

  const first = tokens[0].toLowerCase()
  const second = tokens[1]?.toLowerCase()

  // Question inversion: "Will you ...", "Is she ...", "Do they ..."
  if (AUXILIARIES.has(first) && PRONOUN_SUBJECTS.has(second)) {
    const auxiliaryIndex = 0
    const subject = tokens[1]

    if (BE_AUX.has(first)) {
      const predicateHead = findCopularPredicateHead(tokens, auxiliaryIndex, 1)
      const interpretation = chooseClauseInterpretation({ auxiliary: tokens[0], predicateHead })

      if (interpretation === "copular") {
        return {
          subject,
          auxiliary: null,
          auxiliaryIndex: -1,
          mainVerb: tokens[0],
          predicateComplement: predicateHead,
          verbRole: "copular"
        }
      }
    }

    const mainVerb = findMainVerb(tokens, auxiliaryIndex, 1)
    return { subject, auxiliary: tokens[0], auxiliaryIndex, mainVerb, predicateComplement: null, verbRole: "auxiliary" }
  }

  // Imperative with politeness marker: "Please close..."
  if (first === "please") {
    return { subject: "(you)", auxiliary: null, auxiliaryIndex: -1, mainVerb: tokens[1] ?? null, predicateComplement: null, verbRole: "lexical" }
  }

  const subject = tokens[0] ?? null
  const auxiliaryIndex = tokens.findIndex((t, idx) => idx > 0 && AUXILIARIES.has(t.toLowerCase()))
  const auxiliary = auxiliaryIndex >= 0 ? tokens[auxiliaryIndex] : null

  if (auxiliary && HAVE_AUX.has(auxiliary.toLowerCase())) {
    const candidateAfterHave = findMainVerb(tokens, auxiliaryIndex, 0)
    if (isLikelyLexicalHaveCore(tokens, auxiliaryIndex, candidateAfterHave?.toLowerCase())) {
      return {
        subject,
        auxiliary: null,
        auxiliaryIndex: -1,
        mainVerb: auxiliary,
        predicateComplement: candidateAfterHave,
        verbRole: "lexical"
      }
    }
  }

  if (auxiliary && BE_AUX.has(auxiliary.toLowerCase())) {
    const predicateHead = findCopularPredicateHead(tokens, auxiliaryIndex, 0)
    const interpretation = chooseClauseInterpretation({ auxiliary, predicateHead })

    if (interpretation === "copular") {
      return {
        subject,
        auxiliary: null,
        auxiliaryIndex: -1,
        mainVerb: auxiliary,
        predicateComplement: predicateHead,
        verbRole: "copular"
      }
    }
  }

  const mainVerb = findMainVerb(tokens, auxiliaryIndex, 0)
  return { subject, auxiliary, auxiliaryIndex, mainVerb, predicateComplement: null, verbRole: auxiliary ? "auxiliary" : "lexical" }
}

function inferAspect(auxiliary, mainVerb, tokens = [], auxiliaryIndex = -1) {
  if (!auxiliary || !mainVerb) return "simple"

  const aux = auxiliary.toLowerCase()
  const verb = mainVerb.toLowerCase()

  if (BE_AUX.has(aux) && verb.endsWith("ing")) return "progressive"

  if (HAVE_AUX.has(aux)) {
    if (/ed$|en$/.test(verb)) return "perfect"

    const hasBeenAfterHave = auxiliaryIndex >= 0
      ? tokens.slice(auxiliaryIndex + 1).some((token) => token.toLowerCase() === "been")
      : false

    if (hasBeenAfterHave && verb.endsWith("ing")) return "perfect-progressive"
  }

  return "simple"
}

function inferFunction(aspect) {
  if (aspect === "progressive") return "acción en curso"
  if (aspect === "perfect") return "resultado o experiencia conectada al presente/pasado"
  if (aspect === "perfect-progressive") return "proceso en desarrollo con referencia temporal previa"
  return "hecho habitual o general"
}

function inferTags(token) {
  const lower = token.toLowerCase()

  if (AUXILIARIES.has(lower)) return ["auxiliary"]
  if (PRONOUN_SUBJECTS.has(lower)) return ["subject-pronoun"]
  if (lower.endsWith("ing")) return ["verb", "gerund-participle"]
  if (/ed$|en$/.test(lower)) return ["verb", "past-participle"]
  if (lower.endsWith("ly")) return ["adverb"]
  if (lower.endsWith("s")) return ["possible-3rd-person-singular-or-plural"]

  return ["lexical-token"]
}

function inferPos(token, tags = []) {
  const lower = token.toLowerCase()
  if (tags.includes("subject-pronoun")) return "PRON"
  if (tags.includes("auxiliary")) return "AUX"
  if (tags.includes("adverb")) return "ADV"
  if (tags.includes("verb")) return "VERB"
  if (WH_WORDS.has(lower)) return "WH"
  if (["a", "an", "the"].includes(lower)) return "DET"
  if (["and", "or", "but"].includes(lower)) return "CONJ"
  if (["to", "for", "with", "in", "on", "at", "from", "of"].includes(lower)) return "PREP"
  return "NOUN/LEX"
}

function analyzeMorphology(tokens) {
  return tokens.map((token) => {
    const tags = inferTags(token)
    const lower = token.toLowerCase()
    const lemma = lower.endsWith("ing")
      ? lower.replace(/ing$/, "")
      : lower.endsWith("ed")
        ? lower.replace(/ed$/, "")
        : lower

    const features = []
    if (PRONOUN_SUBJECTS.has(lower)) features.push("pronoun")
    if (BE_AUX.has(lower) || HAVE_AUX.has(lower) || DO_AUX.has(lower) || MODAL_AUX.has(lower)) features.push("auxiliary")
    if (lower.endsWith("ing")) features.push("progressive-form")
    if (/ed$|en$/.test(lower)) features.push("participle-or-past")
    if (lower.endsWith("s") && lower.length > 2) features.push("-s-suffix")

    const knowledge = getWordKnowledge(lemma) ?? getWordKnowledge(token)

    return {
      token,
      lemma,
      pos: inferPos(token, tags),
      features,
      knowledge
    }
  })
}

function buildSyntaxTree(clause, tokens) {
  const predicateChunk = tokens.slice(1).join(" ")
  const obj = tokens.slice(3).join(" ")

  return {
    label: "S",
    children: [
      { label: "NP-SUBJ", value: clause.subject ?? "∅" },
      {
        label: "VP",
        children: [
          { label: "AUX", value: clause.auxiliary ?? "∅" },
          { label: "V", value: clause.mainVerb ?? "∅" },
          { label: "XP", value: (clause.predicateComplement ?? obj ?? predicateChunk ?? "∅") }
        ]
      }
    ]
  }
}

function formatTreeBracket(tree) {
  const render = (node) => {
    if (node.value !== undefined) return `[${node.label} ${node.value}]`
    return `[${node.label} ${(node.children ?? []).map(render).join(" ")}]`
  }

  return render(tree)
}

function analyzeSemantics(clause, tokens) {
  const lowerTokens = tokens.map((t) => t.toLowerCase())
  const hasNegation = lowerTokens.some((t) => NEGATION_MARKERS.has(t))

  return {
    predicate: clause.mainVerb,
    roles: {
      agent: clause.subject,
      action: clause.mainVerb,
      theme: clause.predicateComplement ?? (tokens.slice(2).join(" ") || null)
    },
    polarity: hasNegation ? "negative" : "positive",
    modality: MODAL_AUX.has((clause.auxiliary ?? "").toLowerCase()) ? clause.auxiliary.toLowerCase() : "none"
  }
}

function analyzePragmatics(sentence, clause, tokens) {
  const trimmed = sentence.trim()
  const lowerTokens = tokens.map((t) => t.toLowerCase())
  const first = lowerTokens[0] ?? ""
  const hasPlease = lowerTokens.includes("please")

  let speechAct = "statement"
  if (trimmed.endsWith("?")) speechAct = "question"
  if (first && WH_WORDS.has(first)) speechAct = "wh-question"
  if (first === "please" && clause.mainVerb) speechAct = "imperative"
  if (!trimmed.endsWith("?") && clause.mainVerb && first === clause.mainVerb.toLowerCase()) speechAct = "imperative"

  const politeness = hasPlease ? "polite" : "neutral"
  const communicativeIntent = speechAct === "question" || speechAct === "wh-question"
    ? "request-information"
    : speechAct === "imperative"
      ? "request-action"
      : "inform"

  return {
    speechAct,
    politeness,
    communicativeIntent
  }
}

function explainError(code, details) {
  const byCode = {
    SUBJECT_AUX_AGREEMENT: {
      title: "Concordancia sujeto-auxiliar",
      why: "El auxiliar debe concordar con la persona y número del sujeto y con la familia verbal correcta (BE/HAVE/DO/modal).",
      explanation: `El sujeto '${details.subject}' no concuerda con el auxiliar '${details.auxiliary}'.`
    },
    MISSING_PROGRESSIVE_AUX: {
      title: "Falta auxiliar en aspecto progresivo",
      why: "Para expresar acción en curso se necesita auxiliar BE + verbo en -ing.",
      explanation: `Se detectó '${details.mainVerb}' (forma -ing) sin auxiliar BE antes del verbo principal.`
    },
    PERFECT_WITHOUT_PARTICIPLE: {
      title: "Perfecto mal formado",
      why: "El aspecto perfecto requiere HAVE/HAS/HAD + participio pasado.",
      explanation: `El auxiliar '${details.auxiliary}' debería ir con participio (ej. studied, eaten).`
    },
    COPULAR_COMPLEMENT_AGREEMENT: {
      title: "Complemento nominal en cópula",
      why: "Con sujeto singular (he/she/it) suele requerirse complemento nominal singular en oraciones identificativas.",
      explanation: `La secuencia detectada sugiere posible discordancia en '${details.complement}'.`
    },
    EMPTY_INPUT: {
      title: "Oración vacía",
      why: "Necesitamos una cláusula para poder analizar estructura y función.",
      explanation: "Escribe una oración completa en inglés para recibir feedback lingüístico."
    }
  }

  return {
    code,
    concept: ERROR_TO_CONCEPT[code] ?? "clause-structure",
    title: byCode[code].title,
    why: byCode[code].why,
    explanation: byCode[code].explanation,
    suggestion: details.suggestion
  }
}

function buildCorrection(sentence, errors, clause) {
  if (!sentence.trim()) return ""

  let corrected = sentence

  errors.forEach((err) => {
    if (err.code === "SUBJECT_AUX_AGREEMENT" && clause.subject && clause.auxiliary) {
      corrected = corrected.replace(new RegExp(`\\b${clause.auxiliary}\\b`, "i"), err.suggestion)
    }

    if (err.code === "MISSING_PROGRESSIVE_AUX" && clause.subject && clause.mainVerb) {
      const suggestedAux = getBeAuxForSubject(clause.subject)
      corrected = corrected.replace(
        new RegExp(`\\b${clause.subject}\\s+${clause.mainVerb}\\b`, "i"),
        `${clause.subject} ${suggestedAux} ${clause.mainVerb}`
      )
    }
  })

  return corrected
}

function buildExerciseForDifficulty(error, clause, difficulty, index) {
  if (error.code === "SUBJECT_AUX_AGREEMENT") {
    if (difficulty === "hard") {
      return {
        id: `ex-${index + 1}`,
        focus: error.concept,
        difficulty,
        type: "multi-select",
        prompt: "Selecciona todas las oraciones correctas.",
        options: [
          "She is studying syntax.",
          "She are studying syntax.",
          "She has studying syntax.",
          "She is studying linguistics."
        ],
        expectedAnswers: ["She is studying syntax.", "She is studying linguistics."],
        concept: "Concordancia sujeto-auxiliar en presente"
      }
    }

    return {
      id: `ex-${index + 1}`,
      focus: error.concept,
      difficulty,
      type: "fill-in-the-blank",
      prompt: `Completa con el auxiliar correcto: "${clause.subject} ____ studying syntax."`,
      expectedAnswers: [error.suggestion],
      concept: "Concordancia sujeto-auxiliar en presente"
    }
  }

  if (error.code === "MISSING_PROGRESSIVE_AUX") {
    const aux = getBeAuxForSubject(clause.subject)

    return {
      id: `ex-${index + 1}`,
      focus: error.concept,
      difficulty,
      type: difficulty === "easy" ? "rewrite" : "short-answer",
      prompt: difficulty === "easy"
        ? `Reescribe correctamente: "${clause.subject} ${clause.mainVerb} English now."`
        : `Escribe una oración en progresivo con sujeto '${clause.subject}' y verbo '${clause.mainVerb}'.`,
      expectedAnswers: [
        `${clause.subject} ${aux} ${clause.mainVerb} English now.`,
        `${clause.subject} ${aux} ${clause.mainVerb} english now`
      ],
      concept: "Aspecto progresivo: BE + V-ing"
    }
  }

  if (error.code === "PERFECT_WITHOUT_PARTICIPLE") {
    return {
      id: `ex-${index + 1}`,
      focus: error.concept,
      difficulty,
      type: "single-choice",
      prompt: "Elige la forma correcta.",
      options: ["study", "studied", "studying"],
      expectedAnswers: ["studied"],
      concept: "Aspecto perfecto: HAVE + participio"
    }
  }

  return {
    id: `ex-${index + 1}`,
    focus: "clause-structure",
    difficulty,
    type: "short-answer",
    prompt: "Explica por qué esta oración necesita revisión gramatical.",
    expectedAnswers: ["sujeto auxiliar verbo"],
    concept: "Estructura de cláusula"
  }
}

function generateExercises(errors, clause, profile) {
  return errors.map((error, index) => {
    const difficulty = getConceptDifficulty(profile, error.concept)
    return buildExerciseForDifficulty(error, clause, difficulty, index)
  })
}


function detectErrors(sentence, clause, context = {}) {
  const errors = []

  if (!sentence.trim()) {
    errors.push(explainError("EMPTY_INPUT", { suggestion: "Write a full sentence." }))
    return errors
  }

  const lowerSubject = clause.subject?.toLowerCase()
  const agreementAux = clause.auxiliary ?? (clause.verbRole === "copular" ? clause.mainVerb : null)
  const lowerAux = agreementAux?.toLowerCase()
  const lowerMainVerb = clause.mainVerb?.toLowerCase()
  const tokens = context.tokens ?? []
  const auxiliaryIndex = context.auxiliaryIndex ?? -1

  if (lowerSubject && lowerAux && SUBJECT_AUX_RULES[lowerSubject] && !SUBJECT_AUX_RULES[lowerSubject].has(lowerAux)) {
    const suggestion = suggestAuxiliary(lowerSubject, lowerAux)
    errors.push(explainError("SUBJECT_AUX_AGREEMENT", {
      subject: clause.subject,
      auxiliary: agreementAux,
      suggestion
    }))
  }

  if (!lowerAux && lowerMainVerb?.endsWith("ing") && lowerSubject) {
    const aux = getBeAuxForSubject(lowerSubject)
    errors.push(explainError("MISSING_PROGRESSIVE_AUX", {
      mainVerb: clause.mainVerb,
      suggestion: `${aux} ${clause.mainVerb}`
    }))
  }

  const hasBeenAfterHave = lowerAux && HAVE_AUX.has(lowerAux) && auxiliaryIndex >= 0
    ? tokens.slice(auxiliaryIndex + 1).some((token) => token.toLowerCase() === "been")
    : false

  const lexicalHaveCandidate = lowerAux && HAVE_AUX.has(lowerAux)
    ? isLikelyLexicalHaveCore(tokens, auxiliaryIndex, lowerMainVerb)
    : false

  if (lowerAux && HAVE_AUX.has(lowerAux) && !/ed$|en$/.test(lowerMainVerb || "") && !hasBeenAfterHave && !lexicalHaveCandidate) {
    errors.push(explainError("PERFECT_WITHOUT_PARTICIPLE", {
      auxiliary: agreementAux,
      suggestion: "Use a past participle after have/has/had."
    }))
  }


  if ((clause.verbRole === "copular" || (lowerAux && BE_AUX.has(lowerAux))) && ["he", "she", "it"].includes(lowerSubject || "")) {
    const complementToken = (clause.predicateComplement ?? "").toLowerCase()
    const possessivePattern = tokens.findIndex((t) => ["my", "your", "his", "her", "our", "their"].includes(t.toLowerCase()))
    const possessiveComplement = possessivePattern >= 0 ? tokens[possessivePattern + 1] : null
    const candidate = possessiveComplement?.toLowerCase() || complementToken

    if (candidate && candidate.endsWith("s") && !candidate.endsWith("ss")) {
      errors.push(explainError("COPULAR_COMPLEMENT_AGREEMENT", {
        complement: possessiveComplement ?? clause.predicateComplement,
        suggestion: "Use singular noun after possessive determiner in this clause."
      }))
    }
  }

  return errors
}

export function evaluateExercise(exercise, userAnswer) {
  const normalizedUser = Array.isArray(userAnswer)
    ? userAnswer.map(normalizeText).filter(Boolean).sort()
    : [normalizeText(userAnswer)].filter(Boolean)

  const normalizedExpected = (exercise.expectedAnswers ?? []).map(normalizeText).filter(Boolean)
  const isMultiSelect = exercise.type === "multi-select"

  const isCorrect = isMultiSelect
    ? normalizedUser.length > 0 && JSON.stringify(normalizedUser) === JSON.stringify([...normalizedExpected].sort())
    : normalizedUser.length > 0 && normalizedUser.some((value) => normalizedExpected.includes(value))

  const profile = recordExerciseOutcome(exercise.focus, isCorrect)

  return {
    isCorrect,
    feedback: isCorrect
      ? "✅ Correcto. Tu respuesta demuestra control del concepto."
      : "❌ Incorrecto. Revisa el concepto y vuelve a intentarlo.",
    expectedAnswers: isCorrect ? [] : (exercise.expectedAnswers ?? []),
    profile
  }
}

export function analyze(sentence) {
  const tokens = tokenize(sentence)

  if (tokens.length === 0) {
    const errors = detectErrors(sentence, { subject: null, auxiliary: null, mainVerb: null }, { tokens: [], auxiliaryIndex: -1 })
    const profile = getErrorProfile()
    return {
      sentence,
      clause: null,
      tokens: [],
      morphology: [],
      syntax: null,
      semantics: null,
      pragmatics: null,
      errors,
      correction: "",
      exercises: [],
      profile
    }
  }

  const { subject, auxiliary, auxiliaryIndex, mainVerb, predicateComplement, verbRole } = detectClauseCore(tokens)

  const aspect = inferAspect(auxiliary, mainVerb, tokens, auxiliaryIndex)
  const clause = {
    subject,
    auxiliary,
    mainVerb,
    predicateComplement: predicateComplement ?? null,
    verbRole: verbRole ?? (auxiliary ? "auxiliary" : "lexical"),
    aspect,
    function: inferFunction(aspect)
  }

  const errors = detectErrors(sentence, clause, { tokens, auxiliaryIndex })
  let profile = getErrorProfile()

  if (errors.length > 0) {
    const concepts = errors.map((error) => error.concept)
    profile = recordConceptErrors(concepts)
  }

  const morphology = analyzeMorphology(tokens)
  const syntaxTree = buildSyntaxTree(clause, tokens)

  return {
    sentence,
    clause,
    tokens: tokens.map((token, index) => ({
      index,
      token,
      tags: inferTags(token)
    })),
    morphology,
    syntax: {
      tree: syntaxTree,
      bracketed: formatTreeBracket(syntaxTree)
    },
    semantics: analyzeSemantics(clause, tokens),
    pragmatics: analyzePragmatics(sentence, clause, tokens),
    errors,
    correction: buildCorrection(sentence, errors, clause),
    exercises: generateExercises(errors, clause, profile),
    profile
  }
}
