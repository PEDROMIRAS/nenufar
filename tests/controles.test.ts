import { describe, expect, it } from 'vitest';
import controles from '../src/data/controles.json';

describe('textos de controles del mando', () => {
  const datos = controles as unknown as {
    ayuda: Record<string, string[][]>;
    pistas: Record<string, unknown>;
  };

  it('ayuda y pistas de mando con tantas filas como las de teclado', () => {
    expect(datos.ayuda.mando).toHaveLength(datos.ayuda.teclado!.length);
    expect(datos.pistas.mando).toHaveLength((datos.pistas.teclado as string[]).length);
  });

  it('sin teclas del teclado en los textos de mando', () => {
    const textos = [...datos.ayuda.mando!.flat(), ...(datos.pistas.mando as string[])];
    for (const t of textos) expect(t).not.toMatch(/Enter|Esc|Mayúsculas/);
  });
});
