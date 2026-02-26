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
import { tokenizeSentence } from "./pipeline/tokenizer.js"
import { tagPosTokens } from "./pipeline/pos_tagger.js"
import { detectClauseCore } from "./pipeline/grammar_engine.js"
import { analyzeVerbPhrase } from "./pipeline/verb_analyzer.js"
import { buildSyntaxTree, formatTreeBracket } from "./pipeline/sentence_tree_builder.js"
import { detectErrors } from "./pipeline/explanation_generator.js"

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
const WH_WORDS = new Set(["what", "why", "how", "when", "where", "who", "whom", "whose", "which"])
const NEGATION_MARKERS = new Set(["not", "n't"])

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
}

function getBeAuxForSubject(subject) {
  const s = subject?.toLowerCase()
  if (s === "i") return "am"
  if (["he", "she", "it"].includes(s)) return "is"
  return "are"
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
  const tokenObjects = tokenizeSentence(sentence)
  const taggedTokens = tagPosTokens(tokenObjects)
  const lexicalTokens = taggedTokens
    .filter((token) => token.pos !== "PUNCT")
    .flatMap((token) => (token.kind === "contraction" ? token.parts : [token.surface]))

  if (lexicalTokens.length === 0) {
    const errors = detectErrors(sentence, { subject: null, auxiliary: null, mainVerb: null }, { tokens: [] })
    const profile = getErrorProfile()
    return {
      sentence,
      clause: null,
      tokens: taggedTokens.map((t) => ({
        index: t.index,
        token: t.surface,
        pos: t.pos,
        tags: t.tags
      })),
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

  const baseClause = detectClauseCore(lexicalTokens)
  const clause = analyzeVerbPhrase(baseClause, lexicalTokens)

  const errors = detectErrors(sentence, clause, { tokens: lexicalTokens })
  let profile = getErrorProfile()

  if (errors.length > 0) {
    const concepts = errors.map((error) => error.concept)
    profile = recordConceptErrors(concepts)
  }

  const morphology = analyzeMorphology(lexicalTokens)
  const syntaxTree = buildSyntaxTree(clause, lexicalTokens)

  return {
    sentence,
    clause,
    tokens: taggedTokens.map((token) => ({
      index: token.index,
      token: token.surface,
      pos: token.pos,
      tags: token.tags?.length ? token.tags : inferTags(token.surface)
    })),
    morphology,
    syntax: {
      tree: syntaxTree,
      bracketed: formatTreeBracket(syntaxTree)
    },
    semantics: analyzeSemantics(clause, lexicalTokens),
    pragmatics: analyzePragmatics(sentence, clause, lexicalTokens),
    errors,
    correction: buildCorrection(sentence, errors, clause),
    exercises: generateExercises(errors, clause, profile),
    profile
  }
}
