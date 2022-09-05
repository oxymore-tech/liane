## Architecture générale

Language : [typescript](https://typescript.org)

Basé sur [react native](https://fr.reactjs.org/) et [expo](https://expo.io/).

- `src/api` : `objets` et `services` d'API, la plupart sont des clients HTTP qui accèdent aux API HTTP du [`back`](../back/README.md)
- `src/screens` les différents écrans de l'app mobile. Ils correspondent aux composants UX de premier niveau.
- `src/components` : les différents composants sous-jacents de l'application

## Prerequis (première fois)

```bash
cd app
nvm use            # sélectionne la bonne version de node

# Install expo and eas
npm install --global add expo-cli
npm install --global add eas-cli
```

Puis installer [Android studio](https://docs.expo.dev/workflow/android-studio-emulator/)

## Lancer le projet en mode développement

```bash
nvm use

npm install

npm run android
# ou si cela ne marche pas
npm run android --tunnel
```

## Déploiement en production

```bash
nvm use
eas build --auto-submit
```