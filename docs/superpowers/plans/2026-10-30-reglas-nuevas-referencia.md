# Referencia de equilibrado

Salida de `npx vitest run tests/equilibrado.test.ts --disableConsoleIntercept` (300 partidas por heroína y dificultad, semillas fijas).

## Antes de las reglas nuevas (2026-10-30)

Fórmula de resta, nivel máximo 10, rangos de victoria 75-85 / 55-65 / 35-45.

```
facil · ronin: partidas completas 82%
  combate real: bosque 99.4% · ruinas 100% · cripta 99.4%
  jefes:        bosque 99.7% · ruinas 99.7% · cripta 100% · final 94.6%
  vida que quita un combate: bosque 16.3% · ruinas 8.5% · cripta 8.6%
facil · maga: partidas completas 83.3%
  combate real: bosque 99% · ruinas 99.8% · cripta 100%
  jefes:        bosque 100% · ruinas 100% · cripta 100% · final 89.6%
  vida que quita un combate: bosque 19.8% · ruinas 22.2% · cripta 8.6%
normal · ronin: partidas completas 59.7%
  combate real: bosque 98.8% · ruinas 99.9% · cripta 99.2%
  jefes:        bosque 99.6% · ruinas 99.6% · cripta 100% · final 74.6%
  vida que quita un combate: bosque 17.4% · ruinas 8.8% · cripta 9.2%
normal · maga: partidas completas 63.7%
  combate real: bosque 98.4% · ruinas 99.3% · cripta 99.9%
  jefes:        bosque 100% · ruinas 100% · cripta 100% · final 75.8%
  vida que quita un combate: bosque 20.9% · ruinas 23.6% · cripta 9.9%
dificil · ronin: partidas completas 39%
  combate real: bosque 98% · ruinas 99.6% · cripta 98%
  jefes:        bosque 100% · ruinas 99.2% · cripta 99.4% · final 65%
  vida que quita un combate: bosque 17.7% · ruinas 10.7% · cripta 11.1%
dificil · maga: partidas completas 40%
  combate real: bosque 97.7% · ruinas 97.6% · cripta 99.6%
  jefes:        bosque 100% · ruinas 100% · cripta 100% · final 63.8%
  vida que quita un combate: bosque 21.1% · ruinas 25.7% · cripta 10.9%
```

Lo que se ve: las partidas se pierden casi siempre en el jefe final (65-95 % de victoria), no en los combates normales.
