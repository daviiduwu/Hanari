# Hanari

MVP de analizador lingüístico para aprendizaje de inglés con enfoque estructural (no curso tradicional).

## Estructura del producto (primero arquitectura)

> Compatibilidad objetivo: **GitHub Pages** (sitio estático, sin backend de pago).

- `index.html`
  - Página principal con interfaz limpia tipo dashboard.
  - Incluye menú con secciones: Inicio, Yo, Recursos, Herramientas, Juegos, Comunidad, Donaciones, Opciones, Sign out.
  - La sección **Herramientas** contiene el analizador de oraciones y ejercicios adaptativos.
- `src/linguistics/analyzer.js`
  - Orquestador lingüístico rule-based y multicapa.
- `src/linguistics/pipeline/`
  - Módulos base desacoplados del análisis:
    - `tokenizer.js`: tokenización con puntuación y contracciones.
    - `pos_tagger.js`: POS tagging híbrido (reglas + contexto local).
  - Analiza cláusula, detecta errores, genera correcciones/ejercicios y evalúa respuestas.
  - Incluye un módulo de inferencia heurística (IA local simbólica) para decidir entre lectura auxiliar vs copulativa.
  - Añade capas lingüísticas MVP: morfología, sintaxis (árbol morfosintáctico), semántica y pragmática.
- `src/linguistics/errorProfile.js`
  - Perfil adaptativo por concepto usando `localStorage` (con fallback en memoria).
  - Acumula errores de entrada y resultados de ejercicios (`aciertos/fallos/mastery/streak`).
- `src/linguistics/corpora/etymologyIpaCorpus.js`
  - Mini corpus abierto inicial (etimología + fonología IPA + uso).
  - Se consulta desde morfología para mostrar menú léxico por palabra seleccionada.
- `src/components/App.jsx` y `src/components/TestAnalyzer.jsx`
  - Variante React de pruebas del mismo flujo.
  - Reutiliza el mismo motor para no duplicar reglas.
- `analyzer.js`
  - Re-export de compatibilidad.

## Qué hace ahora la app

1. Muestra página principal con nivel estimado del usuario (según mastery global).
2. Permite navegar por menú modular pensado para escalar producto real.
3. En Herramientas, analiza la cláusula (`subject`, `auxiliary`, `mainVerb`, `predicateComplement`, `verbRole`, `aspect`, `function`).
4. Detecta errores gramaticales iniciales:
   - concordancia sujeto-auxiliar,
   - progresivo sin auxiliar,
   - perfecto sin participio.
   - desacuerdo en complemento nominal copulativo (ej. `She is my girlfriends`).
5. Explica cada error en lenguaje pedagógico y propone corrección.
6. Genera ejercicios por concepto con texto libre, selección única y selección múltiple.
7. Evalúa respuestas del usuario, registra aciertos/fallos y adapta la dificultad.
8. Entrega capas lingüísticas visibles para aprendizaje:
   - morfología (lemma, POS, rasgos y enlace a corpus etimológico/fonológico),
   - árbol sintáctico en formato bracket,
   - roles semánticos básicos,
   - inferencia pragmática (acto de habla, cortesía, intención).
9. Permite seleccionar palabras para abrir un menú léxico con: IPA, etimología, clase de palabra, significado y ejemplo de uso en oración.

## Siguiente paso incremental (recomendado)

1. Separar plantillas de ejercicios por concepto en `src/linguistics/exerciseTemplates.js`.
2. Añadir parser de dependencias incremental (`src/linguistics/dependencyParser.js`) para enriquecer árbol y roles.
3. Conectar pragmática con contexto conversacional (historial de turnos) para tutor IA.
