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

  const scores = { copular: 0, auxiliaryChain: 0 }

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
    if (isParticipleLike(tokens[i])) return tokens[i]
  }

  return candidate ?? findMainVerb(tokens, auxiliaryIndex, subjectIndex)
}

export function isLikelyLexicalHaveCore(tokens, auxiliaryIndex, lowerMainVerb) {
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

export function detectClauseCore(tokens) {
  if (tokens.length === 0) {
    return { subject: null, auxiliary: null, auxiliaryIndex: -1, mainVerb: null }
  }

  const first = tokens[0].toLowerCase()
  const second = tokens[1]?.toLowerCase()

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

  if (first === "please") {
    return { subject: "(you)", auxiliary: null, auxiliaryIndex: -1, mainVerb: tokens[1] ?? null, predicateComplement: null, verbRole: "lexical" }
  }

  const isDeterminerLedSubject = DETERMINERS.has(first) && tokens[1] && !AUXILIARIES.has(second || "")
  const subject = isDeterminerLedSubject ? `${tokens[0]} ${tokens[1]}` : (tokens[0] ?? null)
  const subjectIndex = isDeterminerLedSubject ? 1 : 0

  const auxiliaryIndex = tokens.findIndex((t, idx) => idx > subjectIndex && AUXILIARIES.has(t.toLowerCase()))
  const auxiliary = auxiliaryIndex >= 0 ? tokens[auxiliaryIndex] : null

  if (auxiliary && HAVE_AUX.has(auxiliary.toLowerCase())) {
    const candidateAfterHave = findMainVerb(tokens, auxiliaryIndex, subjectIndex)
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
    const predicateHead = findCopularPredicateHead(tokens, auxiliaryIndex, subjectIndex)
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

  const mainVerb = findMainVerb(tokens, auxiliaryIndex, subjectIndex)
  return { subject, auxiliary, auxiliaryIndex, mainVerb, predicateComplement: null, verbRole: auxiliary ? "auxiliary" : "lexical" }
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

export function validateClauseGrammar(clause, tokens = []) {
  const errors = []

  const lowerSubject = clause.subject?.toLowerCase()
  const agreementAux = clause.auxiliary ?? (clause.verbRole === "copular" ? clause.mainVerb : null)
  const lowerAux = agreementAux?.toLowerCase()
  const lowerMainVerb = clause.mainVerb?.toLowerCase()
  const auxiliaryIndex = tokens.findIndex((t) => lowerAux && t.toLowerCase() === lowerAux)

  if (lowerSubject && lowerAux && SUBJECT_AUX_RULES[lowerSubject] && !SUBJECT_AUX_RULES[lowerSubject].has(lowerAux)) {
    errors.push({
      code: "SUBJECT_AUX_AGREEMENT",
      details: {
        subject: clause.subject,
        auxiliary: agreementAux,
        suggestion: suggestAuxiliary(lowerSubject, lowerAux)
      }
    })
  }

  if (!lowerAux && lowerMainVerb?.endsWith("ing") && lowerSubject) {
    const aux = getBeAuxForSubject(lowerSubject)
    errors.push({
      code: "MISSING_PROGRESSIVE_AUX",
      details: {
        mainVerb: clause.mainVerb,
        suggestion: `${aux} ${clause.mainVerb}`
      }
    })
  }

  const hasBeenAfterHave = lowerAux && HAVE_AUX.has(lowerAux) && auxiliaryIndex >= 0
    ? tokens.slice(auxiliaryIndex + 1).some((token) => token.toLowerCase() === "been")
    : false

  const lexicalHaveCandidate = lowerAux && HAVE_AUX.has(lowerAux)
    ? isLikelyLexicalHaveCore(tokens, auxiliaryIndex, lowerMainVerb)
    : false

  if (lowerAux && HAVE_AUX.has(lowerAux) && !/ed$|en$/.test(lowerMainVerb || "") && !hasBeenAfterHave && !lexicalHaveCandidate) {
    errors.push({
      code: "PERFECT_WITHOUT_PARTICIPLE",
      details: {
        auxiliary: agreementAux,
        suggestion: "Use a past participle after have/has/had."
      }
    })
  }

  if ((clause.verbRole === "copular" || (lowerAux && BE_AUX.has(lowerAux))) && ["he", "she", "it"].includes(lowerSubject || "")) {
    const complementToken = (clause.predicateComplement ?? "").toLowerCase()
    const possessivePattern = tokens.findIndex((t) => ["my", "your", "his", "her", "our", "their"].includes(t.toLowerCase()))
    const possessiveComplement = possessivePattern >= 0 ? tokens[possessivePattern + 1] : null
    const candidate = possessiveComplement?.toLowerCase() || complementToken

    if (candidate && candidate.endsWith("s") && !candidate.endsWith("ss")) {
      errors.push({
        code: "COPULAR_COMPLEMENT_AGREEMENT",
        details: {
          complement: possessiveComplement ?? clause.predicateComplement,
          suggestion: "Use singular noun after possessive determiner in this clause."
        }
      })
    }
  }

  return errors
}

export { BE_AUX, HAVE_AUX, DO_AUX, MODAL_AUX, PRONOUN_SUBJECTS, NEGATION_MARKERS }
