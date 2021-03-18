# Run front

```bash
cd "front"
yarn
```

```bash
yarn ios
```

-- or --

```bash
yarn android
```

-- or --

```bash
yarn web
```

# Build front


```bash
yarn build
```

# Architecture
L\'architecture de ce projet se décompose en trois parties majeures : 
- Une application mobile avec laquelle interagissent les conducteurs et qui permet de collecter leurs déplacements;
- Une application web avec laquelle interagissent les passagers pour chercher des trajets et demander à covoiturer
- Un serveur qui interroge la base de données, effectue des calculs et échange des informations avec les deux applications.

## Serveur
La partie backend est composée de quatre dossiers principaux :
- Le dossier Liane.Api contient les définitions d'objets de base ainsi que les interfaces des services.
- Le dossier Liane.Service contient les implémentations des interfaces des services (dans le sous-dossier Internal).
- Le dossier Liane.Web contient le fichier Startup.cs où il faut ajouter les services développés et un sous-dossier Controllers où sont définis tous les endpoints de l'API.
- Le dossier Liane.Test contient les classes de test des différents services ainsi que des classes contenant des données brutes permettant d'exécuter les tests.

De plus, à la racine du dossier back se trouvent deux scripts : initdb.sh qui permet de faire un ajout massif de données dans la base de données Redis et start.sh qui permet de lancer le serveur.

## Application mobile
L\'application mobile est découpé en 3 parties distinctes
- le dossier Components qui contient les différents services :
	- apiRequest.tsx : fonctions permettant de communiquer avec le backend (envoi de données GPS, inscription...)
	- locationStorage.tsx : fonctions permettant le stockage des données de localisation (utilisation de l\'API AsyncStorage d'Expo)
	- locationTask.tsx : fonctions définissant la tache ainsi que son lancement
	- permissionScreen.tsx : permet l\'affichage de l\'écran de permissions
- le dossier Images qui contient les différentes images de l\'application mobile
- le dossier Screens qui contient les différents composants React Native (vues dans React Native)
- le dossier utils (authContext.tsx, helpers.tsx)
- App.tsx :
Des dossiers (.expo, /android, ios, ...) sont générés par Expo.


## Application web
L'implémentation de l'application web se trouve dans le dossier \textit{web/src} qui se décompose en quatre parties
- Les api qui récupèrent les différentes méthodes et objets issus du backend;
- Les composants qu\'on souhaite afficher, notamment la carte et ses différents éléments;
- Les pages, qui correspondent aux pages web de l\'application. Il y a essentiellement deux types de pages : la page principale (\textit{index.tsx}) et les pages spécifiques aux conducteurs (\textit{user.tsx});
- Les styles : ici les styles ne sont pas détaillés, ils sont par défaut.

## Concepts clés
- RouteStat.cs : rassemble l\'ensemble des coordonnées pour une route ainsi que le nombre de fois que cette route est empruntée (c\'est la statistique).
- LatLng.cs : coordonnées GPS d'un point au format latitude puis longitude.
- RallyingPoint.cs : représente un point auquel sont rattachés les utilisateurs. Ils sont décrit par un identifiant Id, une position sous forme de LatLng et un réel représentant une distance quand on cherche la distance à un autre point. Ces points sont la clé du fonctionnement de l'application. Ils sont comme des arrêts de bus ou des gares et permettent de protéger la vie privée des utilisateurs.
- index.ts : fichier regroupant les objets énoncés précédemment mais adaptés en typescript.
- Coords.cs : type correspondant à une coordonnée GPS sous la forme latitute et longitude. Deux paramètres optionnels concernent la précision de la donnée ainsi que sa vitesse.
- Trip.cs : objet représentant un trajet avec la liste des points de ralliements par lesquels il passe, l\'utilisateur effectant ce trajet et l\'heure de départ.
- UserLocation.cs : type correspondant la localisation d\'un utilisateur à l'aide de ses coordonnées ainsi que la data à laquelle ces dernières ont été enregistrées.
- Driver.cs / Passenger.cs : type représentant un conducteur contenant ses coordonnées pour le point de départ et d'arrivée ainsi que la date de départ.
