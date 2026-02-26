export function initSubsectionControllers() {
  const navs = Array.from(document.querySelectorAll('[data-subsection-nav]'))
  navs.forEach((nav) => {
    const group = nav.getAttribute('data-subsection-nav')
    const buttons = Array.from(nav.querySelectorAll('button[data-subsection]'))
    const cards = Array.from(document.querySelectorAll(`[data-subsection-group="${group}"]`))

    const activate = (subsection) => {
      buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.subsection === subsection))
      cards.forEach((card) => card.classList.toggle('active', card.dataset.subsection === subsection))
    }

    const activeBtn = buttons.find((b) => b.classList.contains('active'))
    activate(activeBtn?.dataset.subsection ?? buttons[0]?.dataset.subsection)

    nav.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-subsection]')
      if (!btn) return
      activate(btn.dataset.subsection)
    })
  })
}
