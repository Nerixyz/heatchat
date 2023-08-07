export function clearChildren(el: HTMLElement) {
  while (el.firstChild) {
    // @ts-ignore -- last child will exist
    el.removeChild(el.lastChild);
  }
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  type: K,
  ...classes: string[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(type);
  el.classList.add(...classes);
  return el;
}
