import { useState } from "react"
import { analyze } from "../linguistics/analyzer"

export default function TestAnalyzer(){

  const [text,setText] = useState("")
  const [result,setResult] = useState([])

  function handleClick(){
    setResult(analyze(text))
  }

  return (
    <div>

      <h2>Grammar Test</h2>

      <input
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder="Write a sentence"
      />

      <button onClick={handleClick}>
        Analyze
      </button>

      <ul>
        {result.map((w,i)=>(
          <li key={i}>
            {w.word} → {w.category.join(", ")}
          </li>
        ))}
      </ul>

    </div>
  )
}
