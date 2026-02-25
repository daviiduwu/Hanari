import nlp from "compromise"

export function analyze(text) {

  const doc = nlp(text)

  const words = doc.terms().json()

  return words.map(w => ({
    word: w.text,
    category: w.tags
  }))
}
