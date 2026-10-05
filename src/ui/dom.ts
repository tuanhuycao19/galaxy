/** Tiny helper for building DOM nodes without a framework. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<'className' | 'textContent' | 'title' | 'type', string>> = {},
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}
