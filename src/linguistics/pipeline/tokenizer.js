const PUNCTUATION_RE = /[.,!?;:]/

function splitContraction(token) {
  const lower = token.toLowerCase()
  const pairs = [
    [/(.+)n't$/, "$1", "n't"],
    [/(.+)'re$/, "$1", "'re"],
    [/(.+)'ve$/, "$1", "'ve"],
    [/(.+)'ll$/, "$1", "'ll"],
    [/(.+)'d$/, "$1", "'d"],
    [/(.+)'m$/, "$1", "'m"],
    [/(.+)'s$/, "$1", "'s"]
  ]

  for (const [pattern, leftReplacement, right] of pairs) {
    if (pattern.test(lower)) {
      const left = lower.replace(pattern, leftReplacement)
      if (left.length > 0) return [left, right]
    }
  }

  return [lower]
}

export function tokenizeSentence(text) {
  const input = String(text ?? "")
  const matches = input.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[.,!?;:]/g) ?? []

  let cursor = 0
  return matches.map((surface, index) => {
    const start = input.indexOf(surface, cursor)
    const end = start + surface.length
    cursor = end

    if (PUNCTUATION_RE.test(surface)) {
      return {
        index,
        surface,
        normalized: surface,
        kind: "punctuation",
        parts: [surface],
        start,
        end
      }
    }

    const parts = splitContraction(surface)
    return {
      index,
      surface,
      normalized: surface.toLowerCase(),
      kind: parts.length > 1 ? "contraction" : "word",
      parts,
      start,
      end
    }
  })
}
