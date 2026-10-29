/**
 * Avisa cuando hay una versión nueva publicada: Vite da a cada versión un script con otro nombre, así que
 * basta comparar el del index.html del servidor con el que corre. Se comprueba al abrir y al volver a la pestaña.
 */
export function vigilarActualizaciones(): void {
  const actual = document
    .querySelector<HTMLScriptElement>('script[type="module"][src]')
    ?.getAttribute('src');
  const aviso = document.getElementById('actualizacion');
  if (!actual || !aviso) return;
  aviso.addEventListener('click', () => location.reload());

  const comprobar = async (): Promise<void> => {
    try {
      const html = await (await fetch(location.pathname, { cache: 'no-store' })).text();
      const nuevo = /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(html)?.[1];
      if (nuevo && nuevo !== actual) aviso.hidden = false;
    } catch {
      // Sin conexión: no se avisa de nada.
    }
  };
  void comprobar();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void comprobar();
  });
}
