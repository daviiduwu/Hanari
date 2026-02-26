import { validateClauseGrammar } from "./grammar_engine.js"

const ERROR_TO_CONCEPT = {
  SUBJECT_AUX_AGREEMENT: "subject-auxiliary-agreement",
  MISSING_PROGRESSIVE_AUX: "progressive-aspect",
  PERFECT_WITHOUT_PARTICIPLE: "perfect-aspect",
  COPULAR_COMPLEMENT_AGREEMENT: "copular-complement-agreement",
  SUBJECT_VERB_AGREEMENT_SIMPLE_PRESENT: "subject-verb-agreement-simple-present"
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

    SUBJECT_VERB_AGREEMENT_SIMPLE_PRESENT: {
      title: "Concordancia sujeto-verbo en presente simple",
      why: "Con sujeto de tercera persona singular (he/she/it), el verbo léxico en presente simple suele requerir terminación -s/-es.",
      explanation: `El sujeto '${details.subject}' requiere forma verbal de tercera persona. Se detectó '${details.verb}' y se esperaba '${details.expectedVerb}'.`
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

export function detectErrors(sentence, clause, context = {}) {
  if (!sentence.trim()) {
    return [explainError("EMPTY_INPUT", { suggestion: "Write a full sentence." })]
  }

  const tokens = context.tokens ?? []
  const rawErrors = validateClauseGrammar(clause, tokens)

  return rawErrors.map((error) => explainError(error.code, error.details))
}
