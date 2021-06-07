## Overall architecture

The project is built on dotnet core 5 in C#.

- `Liane.Api` : contient les définitions d'objets de base ainsi que les interfaces des services.
- `Liane.Service` : contient les implémentations des interfaces des services (dans le sous-dossier Internal).
- `Liane.Web` : contient le fichier Startup.cs où il faut ajouter les services développés et un sous-dossier Controllers où sont définis tous les endpoints de l'API.
- `Liane.Test` : contient les classes de test des différents services ainsi que des classes contenant des données brutes permettant d'exécuter les tests.

De plus, à la racine du dossier back se trouvent deux scripts : initdb.sh qui permet de faire un ajout massif de données dans la base de données Redis et start.sh qui permet de lancer le serveur.

## Bases de données

In order to launch the databases, it is necessary to install docker. 
Then, you can call the utilitary file using `./util.sh` and use the 
following commad to manage the database.

#### Lancer les bases de données

Ce projet utilise deux systèmes de gestion de bases de données : Mongo et Redis. 

Les commandes suivantes permettent de lancer les deux bases de données :

```bash
mongo_start
redis_start
```

Les commandes suivantes permettent de redémarrer Mongo et Redis 
en remettant à zéro la base de données :

```bash
mongo_purge
redis_purge
```

Les commandes suivantes permettent d'arrêter les deux systèmes de BDD :

```bash
mongo_stop
redis_stop
```

#### Initialiser la base de données

Lorsque Mongo est Redis sont lancés, il est possible d'utiliser 
la commande `./initdb.sh` pour initialiser la base de donnée.  

## Launch the project

*Dotnet* est indispensable pour pouvoir lancer la partie back du projet. Pour
obtenir des informations générales pour l'installation de *dotnet*, 
rendez-vous [ici](https://dotnet.microsoft.com).

* Sur MacOS, vous pouvez l'installer en utilisant *brew* : `brew install homebrew/cask/dotnet` ;
* Sur Ubuntu (WSL ou pas), vous pouvez obtenir des instructions détaillés [ici](https://docs.microsoft.com/fr-fr/dotnet/core/install/linux-ubuntu).

Une fois dotnet installé, il est possible de lancer de lancer le 
projet avec la commande `./start.sh`

Vous pouvez alors vous rendre sur http://localhost:8081/swagger qui 
affiche une documentation des endpoints lancés par le programme. 
