export function buildSyntaxTree(clause, tokens) {
  const predicateChunk = tokens.slice(1).join(" ")
  const obj = tokens.slice(3).join(" ")

  return {
    label: "S",
    children: [
      { label: "NP-SUBJ", value: clause.subject ?? "∅" },
      {
        label: "VP",
        children: [
          { label: "AUX", value: clause.auxiliary ?? "∅" },
          { label: "V", value: clause.mainVerb ?? "∅" },
          { label: "XP", value: (clause.predicateComplement ?? obj ?? predicateChunk ?? "∅") }
        ]
      }
    ]
  }
}

export function formatTreeBracket(tree) {
  const render = (node) => {
    if (node.value !== undefined) return `[${node.label} ${node.value}]`
    return `[${node.label} ${(node.children ?? []).map(render).join(" ")}]`
  }

  return render(tree)
}
