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
corepack enable    # active yarn

# Install expo and eas
yarn global add expo-cli
yarn global add eas-cli
```

Installer Expo GO sur téléphone ou tablette

## Dev

```bash
nvm use
yarn
yarn web
```

Puis scanner le QR code affiché à l'écran.

## Déploiement en production

```bash
nvm use
eas build
eas submit
```

