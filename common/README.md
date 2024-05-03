# Liane common js library

- utils
- types
- services (api, auth, etc.)

## Install

```bash
yarn build
```

Lancer les tests e2e :

```bash
# initialiser le back, prerequis utilisateur de test et les points ralliements
liane purge
liane dump_on_local
yarn test
```