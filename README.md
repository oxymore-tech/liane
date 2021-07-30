# Informations générales
Les différents diagrammes présents sur ce github ne pourront être affichés à moins d'installer un des plugins suivants :

https://github.com/BackMarket/github-mermaid-extension

https://github.com/marcozaccari/markdown-diagrams-browser-extension

Les diagrammes inclus dans les fichiers markdown de ce projet sont écrits en `mermaid`. Toute la documentation nécessaire peut être trouvée ici : 
https://mermaid-js.github.io/mermaid/#/



# What is Liane :seedling:

Liane est un projet né d'un constat. La voiture est une nécessité en milieu rural, et beaucoup de personnes utilisent leur voiture sur des mêmes trajets. De plus, le parc automobile est vieillissant dans les campagnes et les coût liés à ce mode de déplacement pourrait engendrer une sédentarité importante pour des personnes modestes.
Des solutions on été mises en place à échelle locale, comme des groupes What'sApp, mais leur faible efficacité ne permet pas de faire du covoiturage une solution durable. C'est pour cela que Liane a été imaginée. Une application permettant de mettre facilement en contact conducteurs et passagers, avec comme maître mots la simplicité et le partage. 

Liane n'a pour l'instant pas imaginé de récompense (financière au autre) pour ses utilisateurs. Le conducteur prend des passagers en covoiturage comme un acte citoyen, pour participer à la vie de la communauté. Le côté communautaire est très important au sein du projet Liane, et le covoiturage est vu comme vecteur de rencontres et de lien social. 


# Overall architecture :neckbeard:

- [back](back/README.md) : Un serveur qui interroge la base de données, effectue des calculs et échange des informations avec les deux applications
- [app](app/README.md) : Une application mobile avec laquelle interagissent les conducteurs et qui permet de collecter leurs déplacements
- [web](web/README.md) : Une application web avec laquelle interagissent les passagers pour chercher des trajets et demander à covoiturer, ainsi que pour visualiser les informations qui les concernent.


# Key Concepts

- `LatLng` : Coordonnées GPS d'un point au format latitude puis longitude.

- `UserLocation` : type correspondant la localisation d'un utilisateur à laquelle est ajoutée des données supplémentaires telles que la précision de la localisation, la vitesse et la date.

- `RallyingPoint` : Représente un point auquel sont rattachés les utilisateurs. Ils sont décrit par un identifiant Id, une position sous forme de LatLng et un réel représentant une distance quand on cherche la distance à un autre point. Ces points sont la clé du fonctionnement de l'application. Ils sont comme des arrêts de bus ou des gares et permettent de protéger la vie privée des utilisateurs.

- `RawTrip`: Type correspondant à un trajet brut c'est à dire un trajet tel qu'il a été enregistré sur le mobile d'un utilisateur. Il est composé d'une liste de UserLocation et d'une chaîne de caractères correspondant au numéro de téléphone de l'utilisateur.

- `Liane`: Une liane représente un trajet entre deux rallying points. Il peut s'agir d'un trajet réel effectué par un utilisateur ou d'un morceau de trajet effectué par un utilisateur. Un trajet réel est en général découpé en plusieurs Lianes. Ce type est composé d'un rallying point de départ "from", un rallying point d'arrivée "to" et une liste d'objets de type LianeUsage. 

- `LianeUsage` : Il s'agit d'une sous information ajoutée à une Liane et permettant d'avoir des données supplémentaires comme le(s) créneau(x) horaire(s) auxquel(s) les Lianes sont empruntées ainsi qu'une information permettant de savoir si la Liane courante est un trajet ou un sous trajet. 

