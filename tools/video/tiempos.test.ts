import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcularTiempos } from './tiempos.ts';

test('cada plano dura su voz más el respiro y empieza donde acaba el anterior', () => {
  const t = calcularTiempos([9, 7, 13, 16, 10, 10, 8]);
  assert.deepEqual(
    t.map((p) => p.duracion),
    [10, 8, 14, 17, 11, 11, 9],
  );
  assert.deepEqual(
    t.map((p) => p.inicio),
    [0, 10, 18, 32, 49, 60, 71],
  );
});

test('un total por debajo de 60 s es un error', () => {
  assert.throws(() => calcularTiempos([9, 7]), /60/);
});

test('un total por encima de 90 s es un error', () => {
  assert.throws(() => calcularTiempos(Array(7).fill(15)), /90/);
});

test('el respiro se puede cambiar', () => {
  const t = calcularTiempos([10, 10, 10, 10, 10, 10], 0.5);
  assert.equal(t[5]!.inicio, 52.5);
  assert.equal(t[5]!.duracion, 10.5);
});
