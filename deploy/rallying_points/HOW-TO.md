# Ajouter des points de ralliement

## Obtenir les données au format JSON

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

## Utiliser les données

Ces données doivent ensuite être traitées par le script Python `generate_rp.py`.
Ce script génère un fichier texte qui permettra d'ajouter chaque ville à Redis. 
Cela produit de requêtes de la forme : 

```
GEOADD nom_du_set lat lng nom_de_la_ville
```

Le fichier `rp.temprp.txt` est ensuite chargé dans Redis avec le script 
`init-redis-data.sh` (pour le serveur de production).

## Logique d'ajout dans Redis

Afin d'optimiser la requête sur les données de Redis, les points de ralliement 
sont placés dans une grille appliquée à la France. Le schéma suivant explique 
cette logique.

![Carte de la France découpée](france.png)

Ainsi, lorsqu'une requête pour trouver le point de ralliement de plus proche est 
faites, on retrouve d'abord la case de la grille dans laquelle notre position se 
trouve, puis on demande les points de ralliement les plus proches.
