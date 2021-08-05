# Documentation de la partie back-end du Liane

## Architecture générale

Le projet utilise dotnet core 5, et est implémenté en C#.

- `Liane.Api` : services interface ;
- `Liane.Service` : services implementation ;
- `Liane.Web` : controllers and services instantiation ;
- `Liane.Test` : unit testing classes ;

## Gestion des trajets (Trips). 

Le diagramme suivant explique l'architecture du projet.


```
classDiagram
    class LianeUsage {
        +string User
        +long TimeStamp
        +bool IsPrimary
        +string TripId
    }
    class Liane {
        +RallyingPoint From
        +RallyingPoint To
    }
    class LianeTrip {
        +string User
        +long TimeStamp
    }

    LianeUsage <-- Liane : List<LianeUsage> LianeUsages
    LianeTrip --> Liane : List<Liane> Lianes
    LianeUsage --> Liane : Liane Liane
    
```


![](../doc/LIANE_TRIP.jpg)

Cette architecture répond à quatre nécessités de ce projet :
- Récupérer l'ensemble des trajets d'un utilisateur ;
- Permettre à un utilisateur de supprimer un trajet ;
- Récupérer tous les trajets dans une zone géographique spécifique en fonctions de différents critères ;
- Permettre aux administrateurs de regénérer les trajets ;


## Bases de données

Ce projet utilise deux bases de données : Mongo DB et Redis. 

Il esrt nécessaire d'installer Docker afin de pouvoir lancer les bases de données. 
Il est ensuite possible d'utiliser les commandes suivantes pour la gestion des bases de données :

#### Lancer et arrêter les systèmes de bases de données


Afin de lancer et d'initialiser les bases de données Mongo et Redis, vous pouvez utiliser la commande suivante :

```bash
./liane init
```

Si vous voulez arrêter les bases de données, vous pouvez utiliser les commandes suivantes :

```bash
./liane stop
```

## Configuration Twilio

Pour utiliser Twilio (service permettant l'envoi de sms afin de permettre l'authentification), il est nécessaire de définir trois variables d'environnement :

```bash
export LIANE_TWILIO__ACCOUNT=XXX
export LIANE_TWILIO__FROM=+000
export LIANE_TWILIO__TOKEN=xxx
```

## Démarrer le projet 

Dotnet est obligatoire pour lancer la partie backend du projet. Pour 
obtenir des informations sur Dotnet, cliquez [ici](https://dotnet.microsoft.com).

* Si vous utilisez MacOS, vous pouvez l'installer à l'aide de brew : `brew install homebrew/cask/dotnet` ;
* Avec ubuntu (que ce soit WSL ou non), vous pouvez récupérer des instructions détaillées [ici](https://docs.microsoft.com/fr-fr/dotnet/core/install/linux-ubuntu).

Une fois que dotnet est installé, vous pouvez lancer le projet en utilisant :

```bash
./liane start
```

Vous pouvez ensuite ouvrir http://localhost:8081/swagger qui affiche
la documentation de chaque endpoint.
