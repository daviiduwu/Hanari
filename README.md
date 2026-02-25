# Hanari

MVP de analizador lingüístico para aprendizaje de inglés con enfoque estructural (no curso tradicional).

## Estructura del producto (primero arquitectura)

> Compatibilidad objetivo: **GitHub Pages** (sitio estático, sin backend de pago).

- `index.html`
  - UI principal web/móvil inicial.
  - Consume el motor lingüístico y muestra análisis, correcciones y ejercicios.
- `src/linguistics/analyzer.js`
  - Núcleo lingüístico rule-based.
  - Aquí vive toda la lógica de análisis, detección de errores y generación de práctica.
- `src/components/App.jsx` y `src/components/TestAnalyzer.jsx`
  - Variante React del mismo flujo.
  - Reutiliza el mismo motor para no duplicar reglas.
- `analyzer.js`
  - Re-export de compatibilidad.

## Qué hace ahora la app

1. Analiza la cláusula (`subject`, `auxiliary`, `mainVerb`, `aspect`, `function`).
2. Detecta errores gramaticales iniciales:
   - concordancia sujeto-auxiliar,
   - progresivo sin auxiliar,
   - perfecto sin participio.
3. Explica cada error en lenguaje pedagógico:
   - qué está mal,
   - por qué,
   - sugerencia.
4. Propone una oración corregida.
5. Genera ejercicios de práctica basados en los errores detectados.

## Siguiente paso incremental (recomendado)

1. Añadir `src/linguistics/errorProfile.js` para guardar historial conceptual por usuario (localStorage primero).
2. Hacer que `generateExercises()` use ese historial para dificultad adaptativa.
3. Definir un contrato JSON estable para futuro tutor IA/chat/ranking sin romper el frontend.
