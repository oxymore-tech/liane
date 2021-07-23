# General information
Diagrams will not be displayed on github unless you have installed one of the following plugins : 
https://github.com/BackMarket/github-mermaid-extension
https://github.com/marcozaccari/markdown-diagrams-browser-extension


# What is Liane :seedling:

# Overall architecture :neckbeard:

- [back](back/README.md) : Un serveur qui interroge la base de données, effectue des calculs et échange des informations avec les deux applications
- [app](app/README.md) : Une application mobile avec laquelle interagissent les conducteurs et qui permet de collecter leurs déplacements
- [web](web/README.md) : Une application web avec laquelle interagissent les passagers pour chercher des trajets et demander à covoiturer

# Key Concepts

- `RouteStat` : rassemble l'ensemble des coordonnées pour une route ainsi que le nombre de fois que cette route est empruntée (c'est la statistique).
- `LatLng` : coordonnées GPS d'un point au format latitude puis longitude.
- `RallyingPoint` : représente un point auquel sont rattachés les utilisateurs. Ils sont décrit par un identifiant Id, une position sous forme de LatLng et un réel représentant une distance quand on cherche la distance à un autre point. Ces points sont la clé du fonctionnement de l'application. Ils sont comme des arrêts de bus ou des gares et permettent de protéger la vie privée des utilisateurs.
- `Coords` : type correspondant à une coordonnée GPS sous la forme latitute et longitude. Deux paramètres optionnels concernent la précision de la donnée ainsi que sa vitesse.
- `Trip` : objet représentant un trajet avec la liste des points de ralliements par lesquels il passe, l'utilisateur effectant ce trajet et l'heure de départ.
- `UserLocation` : type correspondant la localisation d'un utilisateur à l'aide de ses coordonnées ainsi que la data à laquelle ces dernières ont été enregistrées.
- `Driver` / `Passenger` : type représentant un conducteur contenant ses coordonnées pour le point de départ et d'arrivée ainsi que la date de départ.
