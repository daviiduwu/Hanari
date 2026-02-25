/**
 * Rule-based linguistic analyzer + feedback engine (MVP).
 * Compatible with static hosting (GitHub Pages).
 */
const AUXILIARIES = new Set([
  "am", "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did",
  "have", "has", "had",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must"
])

const BE_AUX = new Set(["am", "is", "are", "was", "were"])
const HAVE_AUX = new Set(["have", "has", "had"])
const PRONOUN_SUBJECTS = new Set(["i", "you", "he", "she", "it", "we", "they"])

const SUBJECT_AUX_RULES = {
  i: new Set(["am", "was", "have", "had", "do"]),
  you: new Set(["are", "were", "have", "had", "do"]),
  he: new Set(["is", "was", "has", "had", "does"]),
  she: new Set(["is", "was", "has", "had", "does"]),
  it: new Set(["is", "was", "has", "had", "does"]),
  we: new Set(["are", "were", "have", "had", "do"]),
  they: new Set(["are", "were", "have", "had", "do"])
}

function tokenize(text) {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((raw) => raw.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, ""))
    .filter(Boolean)
}

function inferAspect(auxiliary, mainVerb) {
  if (!auxiliary || !mainVerb) return "simple"

  const aux = auxiliary.toLowerCase()
  const verb = mainVerb.toLowerCase()

  if (BE_AUX.has(aux) && verb.endsWith("ing")) return "progressive"
  if (HAVE_AUX.has(aux) && /ed$|en$/.test(verb)) return "perfect"
  return "simple"
}

function inferFunction(aspect) {
  if (aspect === "progressive") return "acción en curso"
  if (aspect === "perfect") return "resultado o experiencia conectada al presente/pasado"
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

function explainError(code, details) {
  const byCode = {
    SUBJECT_AUX_AGREEMENT: {
      title: "Concordancia sujeto-auxiliar",
      why: "El auxiliar debe concordar con la persona y número del sujeto.",
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
    EMPTY_INPUT: {
      title: "Oración vacía",
      why: "Necesitamos una cláusula para poder analizar estructura y función.",
      explanation: "Escribe una oración completa en inglés para recibir feedback lingüístico."
    }
  }

  return {
    code,
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
      corrected = corrected.replace(
        new RegExp(`\\b${clause.auxiliary}\\b`, "i"),
        err.suggestion
      )
    }

    if (err.code === "MISSING_PROGRESSIVE_AUX" && clause.subject && clause.mainVerb) {
      const lowerSubject = clause.subject.toLowerCase()
      const suggestedAux = ["he", "she", "it"].includes(lowerSubject) ? "is" : "are"
      corrected = corrected.replace(
        new RegExp(`\\b${clause.subject}\\s+${clause.mainVerb}\\b`, "i"),
        `${clause.subject} ${suggestedAux} ${clause.mainVerb}`
      )
    }
  })

  return corrected
}

function generateExercises(errors, clause) {
  return errors.map((err, index) => {
    if (err.code === "SUBJECT_AUX_AGREEMENT") {
      return {
        id: `ex-${index + 1}`,
        focus: "subject-auxiliary-agreement",
        type: "fill-in-the-blank",
        prompt: `Completa con el auxiliar correcto: "${clause.subject} ____ studying syntax."`,
        answer: err.suggestion,
        concept: "Concordancia sujeto-auxiliar en presente"
      }
    }

    if (err.code === "MISSING_PROGRESSIVE_AUX") {
      return {
        id: `ex-${index + 1}`,
        focus: "progressive-aspect",
        type: "rewrite",
        prompt: `Reescribe correctamente: "${clause.subject} ${clause.mainVerb} English now."`,
        answer: `${clause.subject} ${["he", "she", "it"].includes(clause.subject.toLowerCase()) ? "is" : "are"} ${clause.mainVerb} English now.`,
        concept: "Aspecto progresivo: BE + V-ing"
      }
    }

    if (err.code === "PERFECT_WITHOUT_PARTICIPLE") {
      return {
        id: `ex-${index + 1}`,
        focus: "perfect-aspect",
        type: "multiple-choice",
        prompt: `Elige la forma correcta: "She has ____ linguistics." (study / studied / studying)`,
        answer: "studied",
        concept: "Aspecto perfecto: HAVE + participio"
      }
    }

    return {
      id: `ex-${index + 1}`,
      focus: "general-grammar",
      type: "reflection",
      prompt: "Explica por qué esta oración necesita revisión gramatical.",
      answer: "Revisar estructura sujeto + auxiliar + verbo principal.",
      concept: "Estructura de cláusula"
    }
  })
}

function detectErrors(sentence, clause) {
  const errors = []

  if (!sentence.trim()) {
    errors.push(explainError("EMPTY_INPUT", { suggestion: "Write a full sentence." }))
    return errors
  }

  const lowerSubject = clause.subject?.toLowerCase()
  const lowerAux = clause.auxiliary?.toLowerCase()
  const lowerMainVerb = clause.mainVerb?.toLowerCase()

  if (lowerSubject && lowerAux && SUBJECT_AUX_RULES[lowerSubject] && !SUBJECT_AUX_RULES[lowerSubject].has(lowerAux)) {
    const suggestion = ["he", "she", "it"].includes(lowerSubject) ? "is" : "are"
    errors.push(explainError("SUBJECT_AUX_AGREEMENT", {
      subject: clause.subject,
      auxiliary: clause.auxiliary,
      suggestion
    }))
  }

  if (!lowerAux && lowerMainVerb?.endsWith("ing")) {
    const suggestion = ["he", "she", "it"].includes(lowerSubject) ? "is" : "are"
    errors.push(explainError("MISSING_PROGRESSIVE_AUX", {
      mainVerb: clause.mainVerb,
      suggestion: `${suggestion} ${clause.mainVerb}`
    }))
  }

  if (lowerAux && HAVE_AUX.has(lowerAux) && !/ed$|en$/.test(lowerMainVerb || "")) {
    errors.push(explainError("PERFECT_WITHOUT_PARTICIPLE", {
      auxiliary: clause.auxiliary,
      suggestion: "Use a past participle after have/has/had."
    }))
  }

  return errors
}

export function analyze(sentence) {
  const tokens = tokenize(sentence)

  if (tokens.length === 0) {
    const errors = detectErrors(sentence, { subject: null, auxiliary: null, mainVerb: null })
    return {
      sentence,
      clause: null,
      tokens: [],
      errors,
      correction: "",
      exercises: []
    }
  }

  const subject = tokens[0] ?? null
  const auxiliary = tokens.find((t, idx) => idx > 0 && AUXILIARIES.has(t.toLowerCase())) ?? null
  const mainVerb = tokens.find((t, idx) => {
    if (idx === 0) return false
    if (auxiliary && t === auxiliary) return false
    return /ing$|ed$|en$|s$/.test(t.toLowerCase())
  }) ?? tokens[1] ?? null

  const aspect = inferAspect(auxiliary, mainVerb)
  const clause = {
    subject,
    auxiliary,
    mainVerb,
    aspect,
    function: inferFunction(aspect)
  }

  const errors = detectErrors(sentence, clause)

  return {
    sentence,
    clause,
    tokens: tokens.map((token, index) => ({
      index,
      token,
      tags: inferTags(token)
    })),
    errors,
    correction: buildCorrection(sentence, errors, clause),
    exercises: generateExercises(errors, clause)
  }
}
