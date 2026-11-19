// 扩展功能的接口（预留）：主程序在这些位置调用扩展；本版本不含任何扩展，全部为空操作
export function initExtras() {}
export function extrasFocusKey() { return false; }
export function extrasKey() { return false; }
export function extrasTap() { return false; }
export function extrasOpenItem() {}
export function extrasHint() { return ''; }
export function extrasTick() {}
export function extrasStart() {}
export const extrasDebug = {};
