# P0 — Migration Plan (Legacy -> Registry)

## Objetivo
Migrar gradualmente desde `validateClauseGrammar` procedural a `rule_engine + registry` sin romper `analyze()` ni UI.

## Estado actual (legacy)
- Detección de errores en `src/linguistics/pipeline/grammar_engine.js`.
- Mapeo pedagógico en `src/linguistics/pipeline/explanation_generator.js`.

## Mapeo inicial de reglas legacy
| Legacy Error Code | Nueva Rule ID |
|---|---|
| SUBJECT_AUX_AGREEMENT | R_AUX_SUBJECT_AGREEMENT |
| SUBJECT_VERB_AGREEMENT_SIMPLE_PRESENT | R_AGR_3SG_SIMPLE_PRESENT |
| MISSING_PROGRESSIVE_AUX | R_PROGRESSIVE_REQUIRES_BE |
| PERFECT_WITHOUT_PARTICIPLE | R_PERFECT_REQUIRES_PARTICIPLE |
| COPULAR_COMPLEMENT_AGREEMENT | R_COPULAR_COMPLEMENT_AGREEMENT |

## Plan por iteraciones

### Iteración 1 (paridad funcional)
1. Introducir `rule_engine.run(context)` detrás de feature flag.
2. Ejecutar legacy + registry en paralelo (shadow mode).
3. Registrar diferencias en `trace.decisions`.

### Iteración 2 (switch parcial)
1. Activar output de registry para 4 reglas core.
2. Mantener legacy como fallback para reglas no migradas.

### Iteración 3 (consolidación)
1. Mover explicación a consumo de `ReasoningTrace.finalFindings`.
2. Eliminar ramas legacy de reglas ya migradas.

## Criterios de salida de P0
- 4 reglas core migradas con paridad funcional.
- `ReasoningTrace` disponible por cada análisis.
- UI consume findings sin romper formato de errores histórico.
