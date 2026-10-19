const canvas = document.querySelector<HTMLCanvasElement>('#juego');
if (!canvas) throw new Error('Falta el canvas #juego');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('El navegador no soporta Canvas 2D');

canvas.width = 480;
canvas.height = 352;
ctx.fillStyle = '#1d3b2a';
ctx.fillRect(0, 0, canvas.width, canvas.height);
