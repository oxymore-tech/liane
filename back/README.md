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

## Configuration Twilio (optionnel)

Seulement si vous voulez envoyer des sms, il est nécessaire de définir trois variables d'environnement :

```bash
export LIANE_TWILIO__ACCOUNT=XXX
export LIANE_TWILIO__FROM=+000
export LIANE_TWILIO__TOKEN=xxx
```

## Développement sur le projet 

Installer [.net](https://dotnet.microsoft.com).

* Si vous utilisez MacOS, vous pouvez l'installer à l'aide de brew : `brew install homebrew/cask/dotnet` ;
* Avec ubuntu (que ce soit WSL ou non), vous pouvez récupérer des instructions détaillées [ici](https://docs.microsoft.com/fr-fr/dotnet/core/install/linux-ubuntu).

Une fois que dotnet est installé, vous pouvez lancer le projet en utilisant :

```bash
./liane start
```

Vous pouvez ensuite ouvrir http://localhost:8081/swagger qui affiche
la documentation de chaque endpoint.

## Ajouter des points de ralliement

Afin d'obtenir la liste des villes au format JSON, nous utilisons
l'API [Overpass]() d'[OpenStreetMap](https://www.openstreetmap.fr/).
Le site web [Overpass Turbo](http://overpass-turbo.eu/) permet d'exécuter
des requêtes directement et d'exporter les données ainsi récupérées.

La requête utilisée est la suivante :

```
[out:json][timeout:1000];
// fetch area “France” to search in
{{geocodeArea:France}}->.searchArea;
// gather results
(
  node[place~"city|town|village"](area.searchArea);
);
// print results
out body;
>;
out skel qt;
```

Il serait par exemple possible de modifier `place` 
par `"city|town|village|hamlet"` afin de récupérer aussi
les hameaux.

Une fois les données récupérées il faut les mettre dans le fichier `villes.json`
présent dans le dossier `back/src/Liane/Liane.Web/Ressources` et de déclencher la
re-génération des points de ralliement depuis l'interface administrateur. **Toutes
les données précédentes seront perdues.**
