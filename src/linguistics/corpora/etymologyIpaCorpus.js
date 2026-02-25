/**
 * Mini corpus abierto para MVP (contenido redactado para uso educativo en este proyecto).
 * Puede reemplazarse por datasets más amplios (CC BY/CC0) en una iteración posterior.
 */
export const ETYMOLOGY_IPA_CORPUS = {
  study: {
    ipa: "/ˈstʌdi/",
    wordClass: "verb / noun",
    etymology: "Del latín studium (aplicación, celo) vía francés antiguo estude.",
    meaning: "Dedicar tiempo a aprender algo de forma sistemática.",
    usage: "She studies linguistics every day.",
    notes: "Con he/she/it en presente simple suele tomar -s: studies."
  },
  syntax: {
    ipa: "/ˈsɪn.tæks/",
    wordClass: "noun",
    etymology: "Del griego sýntaxis (orden, disposición), por latín tardío syntaxis.",
    meaning: "Organización de las palabras en una oración.",
    usage: "Syntax helps us understand sentence structure.",
    notes: "Se usa mucho en lingüística formal y gramática descriptiva."
  },
  have: {
    ipa: "/hæv/",
    wordClass: "verb (auxiliary / lexical)",
    etymology: "Del inglés antiguo habban (tener, poseer), de raíz germánica.",
    meaning: "Puede marcar perfecto (auxiliar) o posesión/experiencia (verbo léxico).",
    usage: "She has studied. / I have lunch at noon.",
    notes: "Distinguir uso auxiliar vs léxico es clave para análisis correcto."
  },
  be: {
    ipa: "/biː/",
    wordClass: "verb (auxiliary / copular)",
    etymology: "Fusión histórica de varias raíces indoeuropeas en el paradigma de 'to be'.",
    meaning: "Verbo de estado y auxiliar para progresivo/pasiva.",
    usage: "She is studying English.",
    notes: "Formas: am, is, are, was, were, been, being."
  },
  work: {
    ipa: "/wɜːrk/",
    wordClass: "verb / noun",
    etymology: "Del inglés antiguo weorc (trabajo, acción), raíz germánica.",
    meaning: "Realizar actividad laboral o funcionar.",
    usage: "Do they work today?",
    notes: "Como verbo principal puede ir con DO-support en preguntas/negación."
  },
  close: {
    ipa: "/kloʊz/",
    wordClass: "verb / adjective",
    etymology: "Del francés antiguo clos, del latín clausus (cerrado).",
    meaning: "Cerrar algo o terminar un evento/proceso.",
    usage: "Please close the door.",
    notes: "En imperativos suele aparecer sin sujeto explícito."
  },
  door: {
    ipa: "/dɔːr/",
    wordClass: "noun",
    etymology: "Del inglés antiguo duru, de raíz germánica común.",
    meaning: "Abertura móvil de acceso o salida.",
    usage: "Please close the door.",
    notes: "Suele funcionar como objeto directo en órdenes cotidianas."
  },
  english: {
    ipa: "/ˈɪŋ.ɡlɪʃ/",
    wordClass: "noun / adjective",
    etymology: "Del inglés antiguo englisc, relacionado con el pueblo Angles.",
    meaning: "Idioma inglés o relativo a Inglaterra/cultura anglófona.",
    usage: "She is studying English now.",
    notes: "Con mayúscula cuando se refiere al idioma."
  },
  linguistics: {
    ipa: "/lɪŋˈɡwɪs.tɪks/",
    wordClass: "noun",
    etymology: "Del francés linguistique, de lingua (latín: lengua/idioma).",
    meaning: "Disciplina científica que estudia el lenguaje.",
    usage: "She has studied linguistics.",
    notes: "Suele aparecer como campo académico no contable."
  }
}

function candidateKeys(rawToken) {
  const base = String(rawToken ?? "").toLowerCase().replace(/[^a-z]/g, "")
  if (!base) return []

  const keys = new Set([base])
  if (base.endsWith("ies") && base.length > 3) keys.add(base.slice(0, -3) + "y")
  if (base.endsWith("es") && base.length > 2) keys.add(base.slice(0, -2))
  if (base.endsWith("s") && base.length > 1) keys.add(base.slice(0, -1))
  if (base.endsWith("ing") && base.length > 4) keys.add(base.slice(0, -3))
  if (base.endsWith("ed") && base.length > 3) keys.add(base.slice(0, -2))

  return Array.from(keys)
}

export function getWordKnowledge(rawToken) {
  const keys = candidateKeys(rawToken)
  for (const key of keys) {
    if (ETYMOLOGY_IPA_CORPUS[key]) return ETYMOLOGY_IPA_CORPUS[key]
  }
  return null
}
