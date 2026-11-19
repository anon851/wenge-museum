import { HALLS as OLD } from './base.js';

const index = new Map();
for (const h of OLD) for (const p of h.panels) {
  if (index.has(p.t)) throw new Error('重复的展板标题：' + p.t);
  index.set(p.t, p);
}
const used = new Set();
// 引用 base.js 中的展板；可传入要覆盖的字段
export function B(title, patch) {
  const p = index.get(title);
  if (!p) throw new Error('找不到展板：' + title);
  used.add(title);
  return patch ? { ...p, ...patch } : p;
}
export const unusedBase = () => [...index.keys()].filter(t => !used.has(t));
