/**
 * Mengompilasi string kode JS menjadi fungsi draw.
 * @param {string} codeString - Kode JavaScript dari editor
 * @returns {{ draw: Function|null, error: string|null }}
 */
export function compileDrawFunction(codeString) {
  try {
    const factory = new Function(`
      "use strict";
      ${codeString}
      if (typeof draw !== 'function') {
        throw new Error('The draw(ctx, time, width, height) function was not found.');
      }
      return draw;
    `);
    return { draw: factory(), error: null };
  } catch (err) {
    return { draw: null, error: err.message };
  }
}