## Overall architecture

The project is built on dotnet core 5 in C#.

- `Liane.Api` : contient les définitions d'objets de base ainsi que les interfaces des services.
- `Liane.Service` : contient les implémentations des interfaces des services (dans le sous-dossier Internal).
- `Liane.Web` : contient le fichier Startup.cs où il faut ajouter les services développés et un sous-dossier Controllers où sont définis tous les endpoints de l'API.
- `Liane.Test` : contient les classes de test des différents services ainsi que des classes contenant des données brutes permettant d'exécuter les tests.

## Databases

This project uses two databases systems : Mongo and Redis. 

In order to launch the databases, it is necessary to install docker. 
Then, you can use the following commands to manage the database.


#### Launch and stop databases

In order to launch and init the databases Mongo and Redis, you can use the command :

```bash
./liane init
```

If you want to stop the databases, use the following commands : 

```bash
./liane stop
```

## Twilio configuration

To use Twilio (the service to send messages), you need to define three environment variables :

```bash
export LIANE_TWILIO__ACCOUNT=XXX
export LIANE_TWILIO__FROM=+000
export LIANE_TWILIO__TOKEN=xxx
```

## Launch the project

Dotnet is mandatory in order to launch the backend part of the project. To 
get information about dotnet go [here](https://dotnet.microsoft.com).

* On MacOS, you can install it using brew : `brew install homebrew/cask/dotnet` ;
* On Unbuntu (whether it is WSL or not), you can get detailled instructions [here](https://docs.microsoft.com/fr-fr/dotnet/core/install/linux-ubuntu).

Once dotnet is installed, you can launch the project using : 

```bash
./liane start
```

You can then go on http://localhost:8081/swagger which displays
the documentation of each endpoint.
