# Hanari

MVP de analizador lingüístico para aprendizaje de inglés con enfoque estructural (no curso tradicional).

## Estructura del producto (primero arquitectura)

> Compatibilidad objetivo: **GitHub Pages** (sitio estático, sin backend de pago).

- `index.html`
  - UI principal web/móvil inicial.
  - Consume el motor lingüístico, muestra análisis, correcciones y ejercicios interactivos.
- `src/linguistics/analyzer.js`
  - Núcleo lingüístico rule-based.
  - Analiza cláusula, detecta errores, explica por qué, genera ejercicios y evalúa respuestas.
- `src/linguistics/errorProfile.js`
  - Perfil adaptativo por concepto usando `localStorage` (con fallback en memoria).
  - Acumula errores de entrada y resultados de ejercicios (`aciertos/fallos/mastery/streak`).
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
5. Genera ejercicios por concepto con modos de respuesta:
   - texto libre,
   - selección única,
   - selección múltiple.
6. No muestra la respuesta hasta que el usuario responde.
7. Registra aciertos/fallos del ejercicio y adapta dificultad por concepto desde la sesión 1.

## Siguiente paso incremental (recomendado)

1. Separar plantillas de ejercicios por concepto en `src/linguistics/exerciseTemplates.js` para escalar generación.
2. Guardar historial de intentos por ejercicio (timestamp + tiempo de resolución) para rankings y gamificación.
3. Exponer un contrato JSON estable para tutor IA/chat/ranking sin romper el frontend.
