## Architecture générale

Le projet utilise dotnet core 5, et est implémenté en C#.

- `Liane.Api` : objets et interfaces des services de l'API liane
- `Liane.Service` : impléméntation des services
- `Liane.Web` : mise à disposition des services d'API via REST (controllers HTTP)
- `Liane.Test` : tests unitaires

## Prérequis

Installer [.net](https://dotnet.microsoft.com).

Installer [docker](https://docker.org) pour utiliser les outils liane.

Initialiser la base mongo necessaire pour liane :

```bash
./liane init
```

```bash
./liane stop # Stop la base mongo
```

## Configuration SMS (optionnel)

Seulement si vous voulez envoyer des sms, il est nécessaire de définir l'ApiKey de brevo :

```bash
export LIANE_SMS__APIKEY=XXX
```

## Développement sur le projet 

Installer [.net](https://dotnet.microsoft.com).

* Si vous utilisez MacOS, vous pouvez l'installer à l'aide de brew : `brew install homebrew/cask/dotnet` ;
* Avec ubuntu (que ce soit WSL ou non), vous pouvez récupérer des instructions détaillées [ici](https://docs.microsoft.com/fr-fr/dotnet/core/install/linux-ubuntu).

Une fois que dotnet est installé, vous pouvez lancer le projet en utilisant :

```bash
./liane start
```

Vous pouvez ensuite ouvrir http://localhost:5000/swagger qui affiche
la documentation de chaque endpoint.
