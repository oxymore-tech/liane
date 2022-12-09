## Architecture générale

Language : [typescript](https://typescript.org)

Basé sur [React Native](https://fr.reactjs.org/).

- `src/api` : `objets` et `services` d'API, la plupart sont des clients HTTP qui accèdent aux API HTTP
  du [`back`](../back/README.md)
- `src/screens` les différents écrans de l'app mobile. Ils correspondent aux composants UX de premier niveau.
- `src/components` : les différents composants sous-jacents de l'application

## Prerequis (première fois)

```bash
cd app
npm i --legacy-peer-deps
```

Puis installer [Android studio](https://docs.expo.dev/workflow/android-studio-emulator/)

## Lancer le projet en mode développement

```bash
npm run start
npm run android # ou run ios selon la platforme
```

Note: pour activer la nouvelle architecture React Native sur Android, définir la propriété `newArchEnabled` à `true`. 

