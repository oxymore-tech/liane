## Overall architecture

The project is built on react and [Next.js](https://nextjs.org/)

`web/src` :

- `api` : qui récupèrent les différentes méthodes et objets issus du backend;
- `components` : qu\'on souhaite afficher, notamment la carte et ses différents éléments;
- `pages` : qui correspondent aux pages web de l\'application. Il y a essentiellement deux types de pages : la page principale (\textit{index.tsx}) et les pages spécifiques aux conducteurs (\textit{user.tsx});
- `styles` : ici les styles ne sont pas détaillés, ils sont par défaut.

## Launch the project

```bash
nvm use
yarn
yarn dev
```
