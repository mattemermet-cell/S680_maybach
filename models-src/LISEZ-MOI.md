# Déposer le modèle 3D brut

Fichier attendu : `models-src/s680.glb` (≈ 33 Mo).

Limites GitHub : upload navigateur **25 Mo max par fichier**, `git push` **100 Mo max**.
Un fichier de 33 Mo ne passe donc pas par le glisser-déposer du site web.

## Méthode 1 — git / GitHub Desktop (la plus simple)
1. Cloner le dépôt (ou l'ouvrir dans GitHub Desktop).
2. Copier le fichier en `models-src/s680.glb`.
3. Commit, puis push sur `main`.

## Méthode 2 — navigateur, en deux morceaux
1. 7-Zip → clic droit sur le .glb → Ajouter à l'archive → format 7z,
   « Fractionner en volumes » = `20M`.
2. Sur GitHub : Add file → Upload files, déposer `s680.7z.001` et `s680.7z.002`
   dans `models-src/`.
3. Prévenir Claude : il recolle et extrait.

## Méthode 3 — Release GitHub
Releases → Draft a new release → joindre le .glb (limite 2 Go) → publier.
Donner l'URL à Claude.
