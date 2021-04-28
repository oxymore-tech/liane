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

```bash
./start.sh
```
