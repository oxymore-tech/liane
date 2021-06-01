## Overall architecture

The project is built on react and [Next.js](https://nextjs.org/)

`web/src` :

- `api` : qui récupèrent les différentes méthodes et objets issus du backend;
- `components` : qu\'on souhaite afficher, notamment la carte et ses différents éléments;
- `pages` : qui correspondent aux pages web de l\'application. Il y a essentiellement deux types de pages : la page principale (\textit{index.tsx}) et les pages spécifiques aux conducteurs (\textit{user.tsx});
- `styles` : ici les styles ne sont pas détaillés, ils sont par défaut.


## Launch the project

Avant de lancer le projet, la version 14 de nvm doit être installée. 

Le tutoriel suivant explique la démarche à suivre sous macOS : https://jamesauble.medium.com/install-nvm-on-mac-with-brew-adb921fb92cc. 

Il faut ensuite exécuter les commandes suivantes après avoir installé yarn si nécessaire ( avec la commande `brew install yarn`par exemple). 

```bash
nvm use
yarn
yarn dev
```






