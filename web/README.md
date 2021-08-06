## Overall architecture

Ce projet utilise les technologies [React](https://fr.reactjs.org/) et [Next.js](https://nextjs.org/)

`web/src` :

- `api` : qui récupèrent les différentes méthodes et objets issus du backend;
- `components` : qu\'on souhaite afficher, notamment la carte et ses différents éléments;
- `pages` : qui correspondent aux pages web de l\'application. Il y a essentiellement deux types de pages : la page principale (\textit{index.tsx}) et les pages spécifiques aux conducteurs (\textit{user.tsx});
- `styles` : ici les styles ne sont pas détaillés, ils sont par défaut.


## Launch the project

You also need to have installed [nvm](https://github.com/nvm-sh/nvm) (version 14)
and [yarn](https://classic.yarnpkg.com/en/) on your computer. 

* Using MacOS, you can install nvm using [this tutorial](https://jamesauble.medium.com/install-nvm-on-mac-with-brew-adb921fb92cc) and yarn using the command `brew install yarn` ;

After installing both nvm and yarn you can use the following commands to build and run the application.

```bash
nvm use
yarn
yarn dev
```






