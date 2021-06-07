## Overall architecture

The project is built on dotnet core 5 in C#.

- `Liane.Api` : contient les définitions d'objets de base ainsi que les interfaces des services.
- `Liane.Service` : contient les implémentations des interfaces des services (dans le sous-dossier Internal).
- `Liane.Web` : contient le fichier Startup.cs où il faut ajouter les services développés et un sous-dossier Controllers où sont définis tous les endpoints de l'API.
- `Liane.Test` : contient les classes de test des différents services ainsi que des classes contenant des données brutes permettant d'exécuter les tests.

## Bases de données

In order to launch the databases, it is necessary to install docker. 
Then, you can call the utilitary file using `./util.sh` and use the 
following command to manage the database.

#### Lancer les bases de données

This project uses two databases systems : Mongo and Redis. 

The following commands start the databases :

```bash
./util.sh mongo_start
./util.sh redis_start
```

The following commands restart the databases and reset the data :

```bash
./util.sh mongo_purge
./util.sh redis_purge
```

The following commands stop the databases :

```bash
./util.sh mongo_stop
./util.sh redis_stop
```

#### Initialiser la base de données

Once Mongo and Redis are lauched, you can use the command
`./initdb.sh` to inject data into the databases.  

## Launch the project

Dotnet is mandatory in order to launch the backend part of the project. To 
get informations about dotnet go [here](https://dotnet.microsoft.com).

* On MacOS, you can install it using brew : `brew install homebrew/cask/dotnet` ;
* On Unbuntu (whether it is WSL or not), you can get detailled instructions [here](https://docs.microsoft.com/fr-fr/dotnet/core/install/linux-ubuntu).

Once dotnet is installed, you can launch the project using `./start.sh`

You can then go on http://localhost:8081/swagger which displays
the documentation of each endpoint.
