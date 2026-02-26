# P0 — Reasoning Trace Contract (Design-Only)

## Objetivo
Registrar de forma auditable cómo el motor llega a una conclusión lingüística:
- qué observó,
- qué reglas evaluó,
- cuáles descartó,
- y por qué emitió cada feedback pedagógico.

> Estado: **design-only** (sin implementación runtime en esta fase).

## Ubicación recomendada (fase de implementación)
- `src/linguistics/pipeline/reasoning/trace.js`
- `src/linguistics/pipeline/reasoning/contracts.js`

## Contrato `ReasoningTrace`

```ts
ReasoningTrace {
  traceId: string;
  sentence: string;
  contextSnapshot: {
    tokens: TokenSnapshot[];
    clause: ClauseSnapshot | null;
    morphology?: MorphSnapshot[];
    metadata?: {
      sentenceType?: "declarative" | "question" | "imperative" | "fragment";
      registerGuess?: "neutral" | "informal" | "spoken";
      dialect?: "en-US" | "en-GB" | "global";
    };
  };
  steps: TraceStep[];
  decisions: {
    triggeredRules: string[];
    suppressedRules: Array<{ ruleId: string; reason: string }>;
    finalFindings: Finding[];
  };
  pedagogy: {
    learnerLevel?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
    explanationPlan: string[]; // orden recomendado para feedback
  };
}
```

## Contrato `TraceStep`

```ts
TraceStep {
  stepIndex: number;
  phase: "precondition" | "detection" | "conflict-resolution" | "explanation";
  ruleId?: string;
  inputRefs: string[]; // ej. token[2], clause.mainVerb
  operation: string;   // ej. check_subject_person
  result: "pass" | "fail" | "skip";
  details: Record<string, unknown>;
}
```

## Contrato `Finding`

```ts
Finding {
  ruleId: string;
  concept: string;
  severity: "info" | "warning" | "error";
  confidence: number;
  linguisticCause: string;
  learnerMessageShort: string;
  learnerMessageDeep?: string;
  nextPracticeHint?: string;
  suggestion?: string;
}
```

## Reglas de calidad del trace (P0)
1. Toda conclusión (`finalFinding`) debe apuntar al menos a 1 `TraceStep` con `result: pass`.
2. Toda regla suprimida en conflicto debe incluir `reason` explícito.
3. El output final para UI debe poder construirse solo desde `decisions.finalFindings`.
4. El trace no debe depender de acceso a red ni backend (compatibilidad GitHub Pages).
