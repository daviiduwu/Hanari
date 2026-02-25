import { useState } from "react"
import { analyze } from "../linguistics/analyzer"

export default function TestAnalyzer() {
  const [text, setText] = useState("")
  const [result, setResult] = useState(null)

  function handleAnalyze() {
    setResult(analyze(text))
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
        {result?.exercises?.map((exercise) => (
          <li key={exercise.id}>
            {exercise.prompt} ({exercise.type})
          </li>
        ))}
      </ul>
    </div>
  )
}
