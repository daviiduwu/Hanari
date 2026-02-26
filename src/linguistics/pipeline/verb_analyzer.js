import { BE_AUX, HAVE_AUX } from "./grammar_engine.js"

export function inferAspect(auxiliary, mainVerb, tokens = [], auxiliaryIndex = -1) {
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

export function inferFunction(aspect) {
  if (aspect === "progressive") return "acción en curso"
  if (aspect === "perfect") return "resultado o experiencia conectada al presente/pasado"
  if (aspect === "perfect-progressive") return "proceso en desarrollo con referencia temporal previa"
  return "hecho habitual o general"
}

export function analyzeVerbPhrase(clause, tokens = []) {
  const auxIndex = clause.auxiliary
    ? tokens.findIndex((t) => t.toLowerCase() === clause.auxiliary.toLowerCase())
    : -1

  const aspect = inferAspect(clause.auxiliary, clause.mainVerb, tokens, auxIndex)

  return {
    ...clause,
    aspect,
    function: inferFunction(aspect)
  }
}
