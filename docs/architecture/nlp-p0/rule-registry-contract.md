# P0 — Rule Registry Contract (Design-Only)

## Objetivo
Formalizar cómo se definen, versionan y ejecutan reglas lingüísticas en el analizador sin acoplarlas al flujo procedural actual.

> Estado: **design-only** (sin implementación runtime en esta fase).

## Ubicación recomendada (fase de implementación)
- `src/linguistics/pipeline/rules/registry.js`
- `src/linguistics/pipeline/rules/contracts.js`
- `src/linguistics/pipeline/rules/categories/*.js`
- `src/linguistics/pipeline/rule_engine.js`

## Contrato `RuleDefinition`

```ts
RuleDefinition {
  id: string; // R_AGR_3SG_SIMPLE_PRESENT
  version: string; // semver, ej. 1.0.0
  status: "active" | "deprecated" | "experimental";
  domain: "agreement" | "aspect" | "auxiliary" | "syntax" | "pragmatics";
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  priority: number; // mayor = más fuerte en conflicto
  scope: {
    sentenceTypes: Array<"declarative" | "question" | "imperative" | "fragment">;
    registers?: Array<"neutral" | "informal" | "spoken">;
    dialects?: Array<"en-US" | "en-GB" | "global">;
  };
  preconditions: Condition[];
  detect(context: AnalysisContext): DetectionResult;
  explain: {
    concept: string; // p.ej. subject-verb-agreement-simple-present
    pedagogicalTemplateId: string;
  };
  fixStrategy?: {
    enabled: boolean;
    mode: "rewrite" | "hint-only";
  };
  tags: string[];
}
```

## Contrato `RuleOutcome`

```ts
RuleOutcome {
  ruleId: string;
  matched: boolean;
  severity: "info" | "warning" | "error";
  confidence: number; // 0..1
  evidence: EvidenceItem[];
  conflictKey?: string; // agrupa resultados excluyentes
  payload?: {
    errorCode?: string; // compatibilidad con explanation_generator legacy
    suggestion?: string;
    expected?: string;
    observed?: string;
    spans?: TokenSpan[];
  };
}
```

## Política de resolución de conflictos (P0)
1. `priority` DESC
2. `confidence` DESC
3. `specificity` DESC (más precondiciones satisfechas)
4. `status` (`active` sobre `experimental`)

Regla operativa:
- Dentro del mismo `conflictKey` solo se mantiene el mejor `RuleOutcome` como `selected`.
- Los demás se conservan en `suppressed` para trazabilidad y debug pedagógico.

## Reglas mínimas obligatorias en P0
1. `R_AUX_SUBJECT_AGREEMENT`
2. `R_AGR_3SG_SIMPLE_PRESENT`
3. `R_PROGRESSIVE_REQUIRES_BE`
4. `R_PERFECT_REQUIRES_PARTICIPLE`

Estas cuatro cubren los errores core ya presentes en el sistema actual y permiten migración sin ruptura del output.
