# S 680 Maybach — site 3D interactif

Projet personnel, non officiel, non affilié à Mercedes-Benz ni à Maybach.

Interprétation 3D de la Mercedes-Maybach S 680 : extérieur, habitacle cuir beige matelassé,
ciel étoilé noir (configuration imaginée), options et configurateur (teinte, cuir, ambiance, vue).

## Lancer

```bash
npm install
npm run dev       # http://127.0.0.1:5173
npm run build     # dist/
```

## Stack

Vite, Three.js, GSAP (configurateur). Polices auto-hébergées (`@fontsource`), aucune requête externe.
Rendu : environnement studio procédural, bloom léger (desktop), cuir matelassé et ciel étoilé en shaders.

## Modèle 3D

Source : « Mercedes-Benz S680 Maybach » par Nieve5677, CC BY 4.0 — voir `models-src/CREDITS.md`.
Le fichier brut (98 Mo, déposé en Release `Model-3d`) est optimisé par `tools/optimize.mjs` :

```bash
node tools/optimize.mjs source.glb public/models/s680.glb
node tools/optimize.mjs source.glb public/models/s680-lite.glb lite   # appareils tactiles
```

(soudage des sommets, décimation par primitive à bords verrouillés, normales à angle de pli,
compression meshopt). Dépendances du script : `@gltf-transform/core`, `@gltf-transform/extensions`,
`@gltf-transform/functions`, `meshoptimizer`.

## Données

Chiffres et options réelles : Mercedes-Benz USA (S 680 4MATIC, millésime 2027). Ce qui n'y figure pas
(ciel étoilé, teintes et cuirs proposés) est marqué « configuration imaginée ».
