const LEXICON = {
  i: { lemma: "i", pos: ["pronoun"], person: 1, number: "singular", syntacticRole: ["subject"] },
  you: { lemma: "you", pos: ["pronoun"], person: 2, number: "both", syntacticRole: ["subject", "object"] },
  he: { lemma: "he", pos: ["pronoun"], person: 3, number: "singular", syntacticRole: ["subject"] },
  she: { lemma: "she", pos: ["pronoun"], person: 3, number: "singular", syntacticRole: ["subject"] },
  it: { lemma: "it", pos: ["pronoun"], person: 3, number: "singular", syntacticRole: ["subject", "object"] },
  we: { lemma: "we", pos: ["pronoun"], person: 1, number: "plural", syntacticRole: ["subject"] },
  they: { lemma: "they", pos: ["pronoun"], person: 3, number: "plural", syntacticRole: ["subject"] },

  be: {
    lemma: "be",
    pos: ["verb", "auxiliary"],
    irregular: true,
    forms: { base: "be", thirdPersonSingular: "is", presentPlural: "are", presentFirstSingular: "am", pastSingular: "was", pastPlural: "were", participle: "been", gerund: "being" },
    syntax: { canBeAuxiliary: true, canBeCopular: true }
  },
  have: {
    lemma: "have",
    pos: ["verb", "auxiliary"],
    irregular: true,
    forms: { base: "have", thirdPersonSingular: "has", past: "had", participle: "had", gerund: "having" },
    syntax: { canBeAuxiliary: true, canBeLexical: true }
  },
  do: {
    lemma: "do",
    pos: ["verb", "auxiliary"],
    irregular: true,
    forms: { base: "do", thirdPersonSingular: "does", past: "did", participle: "done", gerund: "doing" },
    syntax: { canBeAuxiliary: true, canBeLexical: true }
  },
  go: {
    lemma: "go",
    pos: ["verb"],
    irregular: true,
    forms: { base: "go", thirdPersonSingular: "goes", past: "went", participle: "gone", gerund: "going" },
    syntax: { requires3rdPersonSingularS: true }
  },
  study: {
    lemma: "study",
    pos: ["verb", "noun"],
    irregular: false,
    forms: { base: "study", thirdPersonSingular: "studies", past: "studied", participle: "studied", gerund: "studying" },
    syntax: { requires3rdPersonSingularS: true }
  },
  work: {
    lemma: "work",
    pos: ["verb", "noun"],
    irregular: false,
    forms: { base: "work", thirdPersonSingular: "works", past: "worked", participle: "worked", gerund: "working" },
    syntax: { requires3rdPersonSingularS: true }
  },
  eat: {
    lemma: "eat",
    pos: ["verb"],
    irregular: true,
    forms: { base: "eat", thirdPersonSingular: "eats", past: "ate", participle: "eaten", gerund: "eating" },
    syntax: { requires3rdPersonSingularS: true }
  }
}

function normalizeWord(rawWord) {
  return String(rawWord ?? "").trim().toLowerCase().replace(/[^a-z']/g, "")
}

function inferRegularLemma(word) {
  if (word.endsWith("ies") && word.length > 3) return word.slice(0, -3) + "y"
  if (word.endsWith("es") && word.length > 2) return word.slice(0, -2)
  if (word.endsWith("s") && word.length > 1) return word.slice(0, -1)
  if (word.endsWith("ing") && word.length > 4) {
    const stem = word.slice(0, -3)
    return stem.endsWith("i") ? `${stem.slice(0, -1)}y` : stem
  }
  if (word.endsWith("ed") && word.length > 3) {
    const stem = word.slice(0, -2)
    return stem.endsWith("i") ? `${stem.slice(0, -1)}y` : stem
  }
  return word
}

export function getLexiconEntry(rawWord) {
  const word = normalizeWord(rawWord)
  if (!word) return null
  if (LEXICON[word]) return LEXICON[word]

  for (const entry of Object.values(LEXICON)) {
    if (!entry.forms) continue
    const forms = Object.values(entry.forms)
    if (forms.includes(word)) return entry
  }

  const maybeLemma = inferRegularLemma(word)
  if (LEXICON[maybeLemma]) return LEXICON[maybeLemma]

  return null
}

export function getVerbProfile(rawWord) {
  const entry = getLexiconEntry(rawWord)
  if (!entry || !entry.pos?.includes("verb")) return null
  return entry
}

export function inferVerbForm(rawWord, entry = getVerbProfile(rawWord)) {
  const word = normalizeWord(rawWord)
  if (!entry?.forms) return "unknown"

  for (const [formName, formValue] of Object.entries(entry.forms)) {
    if (formValue === word) return formName
  }

  if (word.endsWith("ing")) return "gerund"
  if (word.endsWith("ed")) return "past"
  if (word.endsWith("s")) return "thirdPersonSingular"
  return "base"
}

export function getPosCandidates(rawWord) {
  const entry = getLexiconEntry(rawWord)
  return entry?.pos ?? []
}

export function isAuxiliaryCandidate(rawWord) {
  return getPosCandidates(rawWord).includes("auxiliary")
}

export function getSubjectAgreementFeatures(rawWord) {
  const entry = getLexiconEntry(rawWord)
  if (!entry || !entry.pos?.includes("pronoun")) return null
  return { person: entry.person, number: entry.number }
}
