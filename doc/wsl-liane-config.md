# Configurer le project sous WSL2

## Script docker

Pour lancer le serveur en local sous WSL il faut modifier le script Docker pour utiliser les docker volumes (évite des incompatibilités avec les systèmes de fichiers WSL2):

Dans **back/liane.sh** ajouter la variable *MONGO_VOLUME_NAME* et modifier la fonction *mongo_start()* commme suit :

```sh
MONGO_VOLUME_NAME="LianeMongoVolume" # Docker volume for windows


function mongo_start {
    mongo_stop

    docker volume create --name=${MONGO_VOLUME_NAME}

    docker run -d --name mongo \
        -e MONGO_INITDB_ROOT_USERNAME=mongoadmin \
        -e MONGO_INITDB_ROOT_PASSWORD=secret \
        -p 27017:27017 \
        -v ${MONGO_VOLUME_NAME}:/data/db \
        --restart unless-stopped mongo:4.4.4
}
```

## Script powershell

- Pour l'application mobile afin de pouvoir connecter son téléphone avec expo et aussi pour pouvoir communiquer avec le serveur depuis le téléphone il faut lancer un script powershell en mode administrateur pour relier les ports entre windows et WSL2 : [Lien script unlock ports](unlock_expo_ports.ps1)

Il est conseillé de créer un raccourci pour le script et de lui donner les droits administrateurs.
Il faut lancer le script avant chaque utilisation de expo (vous pouvez aussi programmer l'exécution)  

   
## Lancement de l'app et du serveur 

- Ensuite il faut définir l'adresse du serveur pour l'app car l'adresse IP WSL2 peut varier,

Modifier **app/api/http.ts** en ajoutant :

```typescript
const myServerAddr = "your.ip.adress.here";
const BaseUrl = __DEV__ ? `http://${myServerAddr}:8081` : "https://liane.gjini.co";
const BasePath = "/api";

[...]

function formatUrl<T>(uri: string, { listOptions, params }: QueryAsOptions<T>) {
  const url = new URL(BasePath + uri, BaseUrl);
	[...]
```
À noter que :

*Le serveur sur le filesystem WSL2 : pas besoin de /api  
Le serveur sur le filesystem Windows : besoin de /api*



- Voici un alias à ajouter dans *~/.bashrc* pour enfin lancer l'app avec expo sous WSL:

```sh
# Expo setup w/ WSL (works with ps script)
alias expo-wsl='
        windows_ip=$(netsh.exe interface ip show address "Wi-Fi" |grep "IP" |tr -s " "| cut -d " " -f 4);
        windows_ip=${windows_ip::-1};
        sed -i "/const myServerAddr/s/\".*\"/\"$windows_ip\"/" $HOME/liane/app/src/api/http.ts;
        REACT_NATIVE_PACKAGER_HOSTNAME=$windows_ip expo start
        '
```
IMPORTANT : 
- Remplacer *$HOME/liane/app/src/api/http.ts* par le chemine vers *app/src/http.ts*
- Potentiellement remplacer "Wi-Fi" par "Ethernet" ou directement affecter à *$windows_ip* votre addresse IP.

## Remarques supplémentaires

Il reste des problèmes auxquels je n'ai pas de solutions :

- Le projet C# (back) sur le filesystem de WSL2 n'est pas accessible pour Rider.
  (Il faut donc créer 2 dépôts Git 1 sur windows / un WSL2)

- Pas de déboggage possible avec Rider sur le filesystem de windows (il faut surement modifier le script powershell unlock expo port)