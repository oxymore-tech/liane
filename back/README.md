## Overall architecture

The project is built on dotnet core 5 in C#.

- `Liane.Api` : contient les définitions d'objets de base ainsi que les interfaces des services.
- `Liane.Service` : contient les implémentations des interfaces des services (dans le sous-dossier Internal).
- `Liane.Web` : contient le fichier Startup.cs où il faut ajouter les services développés et un sous-dossier Controllers où sont définis tous les endpoints de l'API.
- `Liane.Test` : contient les classes de test des différents services ainsi que des classes contenant des données brutes permettant d'exécuter les tests.

De plus, à la racine du dossier back se trouvent deux scripts : initdb.sh qui permet de faire un ajout massif de données dans la base de données Redis et start.sh qui permet de lancer le serveur.

## Init database

```bash
redis_start
./initdb.sh
```

## Launch the project

Dotnet est indispensable pour pouvoir lancer la partie back du projet. 

Pour installer dotnet : https://dotnet.microsoft.com. 

Dotnet peut aussi être installé avec brew en utilisant la commande 
```bash
brew install homebrew/cask/dotnet
```

Une fois dotnet installé, il suffit d'exécuter le script start.sh avec la commande suivante :
```bash
./start.sh
```

Vous pouvez alors vous rendre sur http://localhost:8081/swagger qui affiche une documentation des endpoints lancés par le programme. 
