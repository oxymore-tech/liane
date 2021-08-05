## Architecture générale 

Le projet utilise [React](https://fr.reactjs.org/), 
[Typescript](https://www.typescriptlang.org/) et [Expo.io](https://expo.io/).

Organisation des sources (dossier `src`) :

## `api` 
Interfaces des APIs disponibles
## `components` 
L'ensemble des composants implémentés et utilisables dans les différentes pages de l'application
## `screens` 
Contient les différentes pages créées. 

## Démarrage

Afin d'utiliser l'application en mode développement, il est nécessaire d'installer expo.io. 
Vous trouverez [ici](https://docs.expo.io/get-started/installation/) les instructions détaillées pour ce faire.
Nvm et yarn doivent aussi être installés sur votre ordinateur. Pour en savoir plus, consultez les liens suivants : [nvm](https://github.com/nvm-sh/nvm) (version 15) 
[yarn](https://classic.yarnpkg.com/en/).


Après avoir installé Expo CLI sur votre ordinateur et Expo GO sur téléphone ou tablette, il est possible d'utiliser les commandes suivantes pour build et run l'application : 

```bash
nvm use
yarn
yarn web
```

L'application devrait alors s'être lancée correctement. 

Pour accéder à l'application déployée, il est possible de scanner le QR code affiché à l'écran. 
Les outils de développement sont accessibles à l'adresse :  http://localhost:19002/.
Vous pouvez aussi accéder à l'application à l'adresse http://localhost:19006/ sur machine.

## Setting private IP adress
En mode développement, il est essentiel de donner à l'application son adresse IP privée afin de pouvoir accéder aux APIs. 
Allez dans ``app/src/api/http.ts``, et changer la ligne : 
``const BaseUrl = __DEV__ ? "http://192.168.X.XXX:8081/api" : "https://liane.gjini.co/api";`` en remplaçant les Xs avec votre adresse IP privée. 
Vous pouvez récupérer votre adresse IP à partir de votre terminal en utilisant la commande suivante :``ifconfig``.


