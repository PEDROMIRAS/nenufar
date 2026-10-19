import { expect, test } from 'vitest';

// Prueba de humo: confirma que Vitest corre. Se borra cuando exista el primer test real (paso 5).
test('vitest funciona', () => {
  expect(1 + 1).toBe(2);
});
