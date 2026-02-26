const AUX = new Set(["am", "is", "are", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had", "will", "would", "shall", "should", "can", "could", "may", "might", "must"])
const PRON = new Set(["i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them"])
const DET = new Set(["a", "an", "the", "this", "that", "these", "those", "my", "your", "his", "her", "our", "their"])
const PREP = new Set(["to", "for", "with", "in", "on", "at", "from", "of", "by", "about", "into", "over", "under"])
const CONJ = new Set(["and", "or", "but", "so", "because", "although"])
const PARTICLES = new Set(["not", "n't"])

function isVerbLike(word) {
  return /ing$|ed$|en$/.test(word)
}

export function tagPosTokens(tokenObjects) {
  return tokenObjects.map((token, idx, arr) => {
    if (token.kind === "punctuation") {
      return { ...token, pos: "PUNCT", tags: ["punctuation"] }
    }

    const w = token.normalized
    const prev = arr[idx - 1]?.normalized
    const next = arr[idx + 1]?.normalized

    if (AUX.has(w)) return { ...token, pos: "AUX", tags: ["auxiliary"] }
    if (PRON.has(w)) return { ...token, pos: "PRON", tags: ["pronoun"] }
    if (DET.has(w)) return { ...token, pos: "DET", tags: ["determiner"] }
    if (PREP.has(w)) return { ...token, pos: "PREP", tags: ["preposition"] }
    if (CONJ.has(w)) return { ...token, pos: "CONJ", tags: ["conjunction"] }
    if (PARTICLES.has(w)) return { ...token, pos: "PART", tags: ["particle"] }
    if (w.endsWith("ly")) return { ...token, pos: "ADV", tags: ["adverb"] }
    if (isVerbLike(w)) return { ...token, pos: "VERB", tags: ["verb-form"] }

    if (prev && DET.has(prev)) return { ...token, pos: "NOUN", tags: ["noun-after-det"] }
    if (prev && AUX.has(prev) && !(next && PREP.has(next))) return { ...token, pos: "VERB", tags: ["verb-after-aux"] }

    return { ...token, pos: "NOUN", tags: ["default-noun-lex"] }
  })
}
