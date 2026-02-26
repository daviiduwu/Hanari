# P0 — Rule Catalog (Initial 10)

Este catálogo define prioridades iniciales para arrancar `rule_registry` sin reescritura total.

| ID | Dominio | Prioridad | Conflict Key | Nivel | Descripción |
|---|---|---:|---|---|---|
| R_AUX_SUBJECT_AGREEMENT | agreement | 100 | agreement:aux | A1 | Concordancia sujeto-auxiliar (BE/HAVE/DO/modal). |
| R_AGR_3SG_SIMPLE_PRESENT | agreement | 95 | agreement:main-verb | A1 | 3ª persona singular en presente simple sin auxiliar. |
| R_PROGRESSIVE_REQUIRES_BE | aspect | 90 | aspect:progressive | A1 | Estructura BE + V-ing. |
| R_PERFECT_REQUIRES_PARTICIPLE | aspect | 90 | aspect:perfect | A2 | Estructura HAVE + participio. |
| R_COPULAR_COMPLEMENT_AGREEMENT | syntax | 75 | copular:complement | A2 | Restricción de complemento nominal en cópula. |
| R_DO_SUPPORT_BASE_FORM | auxiliary | 85 | auxiliary:do-support | A2 | DO-support exige verbo base. |
| R_EXISTENTIAL_THERE_AGREEMENT | agreement | 82 | agreement:existential-there | B1 | Concordancia en “there is/are ...”. |
| R_SUBJECT_HEAD_NOUN_AGREEMENT | syntax | 88 | agreement:subject-head | B1 | Concordancia con núcleo del sujeto en sintagmas largos. |
| R_FRAGMENT_CLASSIFIER | pragmatics | 60 | sentence:fragment | A2 | Clasifica fragmentos naturales vs error estructural. |
| R_REGISTER_VARIANT_FLAG | pragmatics | 55 | register:variant | B1 | Señala variantes de registro (spoken/informal) sin sobrerregir. |

## Política incremental
- Fase P0.1: migrar primero las 4 reglas ya implementadas en modo procedural.
- Fase P0.2: añadir DO-support y existential there.
- Fase P0.3: añadir subject-head agreement + fragment/register.

## No objetivos en P0
- Parser sintáctico completo.
- Cobertura de idioms complejos.
- Resolución discursiva multi-turno.
