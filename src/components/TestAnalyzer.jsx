import { useState } from "react"
import { analyze, evaluateExercise } from "../linguistics/analyzer"

export default function TestAnalyzer() {
  const [text, setText] = useState("")
  const [result, setResult] = useState(null)
  const [exerciseInputs, setExerciseInputs] = useState({})
  const [exerciseFeedback, setExerciseFeedback] = useState({})

  function handleAnalyze() {
    setResult(analyze(text))
    setExerciseInputs({})
    setExerciseFeedback({})
  }

  function submitExercise(exercise) {
    const raw = exerciseInputs[exercise.id] ?? ""
    const payload = Array.isArray(raw) ? raw : String(raw)
    const evaluation = evaluateExercise(exercise, payload)

    setResult((current) => ({ ...current, profile: evaluation.profile }))
    setExerciseFeedback((current) => ({
      ...current,
      [exercise.id]: evaluation
    }))
  }

  function updateMultiSelect(exerciseId, value, checked) {
    setExerciseInputs((current) => {
      const currentList = Array.isArray(current[exerciseId]) ? current[exerciseId] : []
      const nextList = checked
        ? [...currentList, value]
        : currentList.filter((item) => item !== value)
      return { ...current, [exerciseId]: nextList }
    })
  }

  return (
    <div>
      <h2>Grammar Test</h2>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a sentence"
      />
      <button onClick={handleAnalyze}>Analyze</button>

      {result?.clause && (
        <section>
          <h3>Clause analysis</h3>
          <p>Subject: {result.clause.subject ?? "N/A"}</p>
          <p>Auxiliary: {result.clause.auxiliary ?? "N/A"}</p>
          <p>Main verb: {result.clause.mainVerb ?? "N/A"}</p>
          <p>Aspect: {result.clause.aspect}</p>
          <p>Function: {result.clause.function}</p>
        </section>
      )}

      {!!result?.errors?.length && (
        <section>
          <h3>Corrección</h3>
          <p>Suggested sentence: {result.correction}</p>
          {result.errors.map((err) => (
            <article key={err.code}>
              <p><strong>{err.title}</strong></p>
              <p>Qué está mal: {err.explanation}</p>
              <p>Por qué: {err.why}</p>
              <p>Sugerencia: {err.suggestion}</p>
            </article>
          ))}
        </section>
      )}

      <ul>
        {result?.tokens?.map((w) => (
          <li key={`${w.token}-${w.index}`}>
            {w.token} → {w.tags.join(", ")}
          </li>
        ))}
      </ul>

      <ul>
        {result?.profile?.concepts && Object.entries(result.profile.concepts).map(([concept, stats]) => (
          <li key={concept}>
            {concept}: intentos {stats.attempts}, aciertos {stats.correct}, fallos {stats.mistakes}, mastery {(stats.mastery * 100).toFixed(0)}%
          </li>
        ))}
      </ul>

      <ul>
        {result?.exercises?.map((exercise) => {
          const feedback = exerciseFeedback[exercise.id]
          return (
            <li key={exercise.id}>
              <p>{exercise.prompt} ({exercise.type} · {exercise.difficulty})</p>

              {exercise.type === "single-choice" && exercise.options?.map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name={exercise.id}
                    value={option}
                    onChange={(e) => setExerciseInputs((c) => ({ ...c, [exercise.id]: e.target.value }))}
                  />
                  {option}
                </label>
              ))}

              {exercise.type === "multi-select" && exercise.options?.map((option) => (
                <label key={option}>
                  <input
                    type="checkbox"
                    value={option}
                    onChange={(e) => updateMultiSelect(exercise.id, option, e.target.checked)}
                  />
                  {option}
                </label>
              ))}

              {!["single-choice", "multi-select"].includes(exercise.type) && (
                <input
                  type="text"
                  placeholder="Tu respuesta"
                  onChange={(e) => setExerciseInputs((c) => ({ ...c, [exercise.id]: e.target.value }))}
                />
              )}

              <button onClick={() => submitExercise(exercise)}>Responder</button>
              {feedback && <p>{feedback.feedback}</p>}
              {feedback && !feedback.isCorrect && <p>Respuesta esperada: {feedback.expectedAnswers.join(" | ")}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
