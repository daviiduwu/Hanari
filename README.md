# Hanari

MVP de analizador lingüístico para aprendizaje de inglés con enfoque estructural (no curso tradicional).

## Estructura del producto (primero arquitectura)

> Compatibilidad objetivo: **GitHub Pages** (sitio estático, sin backend de pago).

- `index.html`
  - Página principal con interfaz limpia tipo dashboard.
  - Incluye menú con secciones: Inicio, Yo, Recursos, Herramientas, Juegos, Comunidad, Donaciones, Opciones, Sign out.
  - La sección **Herramientas** contiene el analizador de oraciones y ejercicios adaptativos.
- `src/linguistics/analyzer.js`
  - Núcleo lingüístico rule-based.
  - Analiza cláusula, detecta errores, explica por qué, genera ejercicios y evalúa respuestas.
- `src/linguistics/errorProfile.js`
  - Perfil adaptativo por concepto usando `localStorage` (con fallback en memoria).
  - Acumula errores de entrada y resultados de ejercicios (`aciertos/fallos/mastery/streak`).
- `src/components/App.jsx` y `src/components/TestAnalyzer.jsx`
  - Variante React de pruebas del mismo flujo.
  - Reutiliza el mismo motor para no duplicar reglas.
- `analyzer.js`
  - Re-export de compatibilidad.

## Qué hace ahora la app

1. Muestra página principal con nivel estimado del usuario (según mastery global).
2. Permite navegar por menú modular pensado para escalar producto real.
3. En Herramientas, analiza la cláusula (`subject`, `auxiliary`, `mainVerb`, `aspect`, `function`).
4. Detecta errores gramaticales iniciales:
   - concordancia sujeto-auxiliar,
   - progresivo sin auxiliar,
   - perfecto sin participio.
5. Explica cada error en lenguaje pedagógico y propone corrección.
6. Genera ejercicios por concepto con texto libre, selección única y selección múltiple.
7. Evalúa respuestas del usuario, registra aciertos/fallos y adapta la dificultad.

## Siguiente paso incremental (recomendado)

1. Separar plantillas de ejercicios por concepto en `src/linguistics/exerciseTemplates.js`.
2. Añadir historial de sesiones (tiempo por respuesta, tasa de acierto por día) para rankings.
3. Crear módulo de comunidad/rankings desacoplado (`src/social/`) para escalar a miles de usuarios.
