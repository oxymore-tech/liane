
# Lambda User
J'ai téléchargé l'application Liane et je suis conducteur ou passager

## Accès à l'application et navigation
| User story | Solution |
| :-------- | :--------- |
| Je dois pouvoir comprendre pourquoi Liane a besoin d'accéder à mes données de géolocalisation :interrobang: | Trois pages de texte à la première connexion qui expliquent l’intérêt de l’application et du partage de données de géolocalisation|
| Je dois pouvoir naviguer facilement et sans perte de temps dans l'application :interrobang: | Application minimaliste avec peu de boutons, pas de manupulations à faire mis à part le partage de la localisation à la première utilisation. |

## Sécurité
| User story | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir m'indentifier de façon sécurisée 🟩  | Système d'autentification via mobile avec code envoyé par sms (twilio) sur application web. <br/> Utilisation des requêtes *sms* (envoi de sms) et *login* (vérification des informations de connexion) de l'API *auth*. |
| Je dois pouvoir garder mon anonymat durant toute l'utilisation de Liane 🟩  | La seule donnée sensible partagée et le numéro de téléphone. Ce numéro n'est visible que par les administrateurs du site (possibilité d'anonymiser aussi à ce niveau là :interrobang:). <br/>  |
| Je dois pouvoir choisir les autorisations de géolocalisation que Liane a sur mon téléphone 🟩  |Lors de la première connexion, une page dédiée expliquant les différents types de partage de géolocalisation et leur intérêt. Quand l'utilisateur choisit une option, il accède automatiquement au pop-up de son téléphone pour autoriser l'envoi de données. |
| Je dois pouvoir modifier les autorisations de géolocalisation facilement et à tout moment 🟩  | Page dédiée sur l'application mobile avec un bouton pour chaque type de partage de données. <br/> Lorsque l'utilisateur clique sur un bouton, la valeur de la variable Permissions.LOCATION est modifiée dans le ContextProvider qui est consulté par l'application avant chaque action.|

## Gestion et partage des données personnelles 
| User story | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir partager mes données de géolocalisation à Liane :seedling: | Utilisation de l'API *expo-location* qui permet de récupérer les informations de géolocalisation d'un mobile. |
| Je dois pouvoir visualiser les informations qui ont été recueillies par Liane :interrobang: <ul><li>Trajets effectués 🟩  (mobile)</li><li>Récurrence 🟩  (mobile)</li></ul> |Les données recueillies par Liane sont pré-traitées au niveau de l'application mobile pour créer des RawTrip. Ils sont ensuite envoyés au niveau du back où le traitement est affiné. Les informations de trajets effectués et récurrence sont ensuite récupérées via l'API *liane* et affichées sur la page d'accueil de l'application mobile. |
| Je dois pouvoir filtrer les informations recueillies par liane suivant différents critères :interrobang: 🟥 <ul><li>Créneau horaire</li><li>Points de départ et arrivée</li><li>Mode d'enregistrement des données (comment et pourquoi ces données là ont été envoyées à Liane) </li></ul>| Sur l'application web. <br/> Une requête est effectuée qui permet de récupérer uniquement les données de l'utilisateur connecté, et uniquement les données autour du centre actuel de la carte. Ces données peuvent être affichées telles quelles ou filtrée directement au niveau du front pour afficher uniquement les données demandées. |
| Je dois pouvoir accéder à de statistiques de mon utilisation de Liane :seedling: <ul><li>Début sur l'application</li><li>Nombre de lianes générées</li><li>Nombre de trajets effectués</li></ul>|Utilisation de l'API *liane* qui permet de récupérer les différentes statistiques (nombre de lianes créées et de trajets brutes effectués) au niveau du back. |
| Je dois pouvoir supprimer les informations que je veux :seedling: | Sur l'application mobile, un bouton permet la suppression d'une ou toutes les occurences d'un trajet.|

## Visualisation du réseau Liane 
| User story | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir visualiser des statistiques concernant le réseau Liane  :seedling:|Utilisation de l'API *liane* qui permet de récupérer les différentes statistiques (nombre d'utilisateurs, de lianes et de trajets brutes) au niveau du back avec la requête *stats*. |
| Je dois pouvoir avoir une vision globale des trajets effectués par des conducteurs Liane  :seedling:|La partie web du projet est une carte leaflet. Les coordonnées géographiques (UserLocation) y sont affichées de couleur différentes en fonction de l'IndexedRawTrip dont elles proviennent. Seules les positions proches du centre de la carte sont affichées grâce à la requête *snap* de l'API *liane*. |
| Je dois pouvoir sélectionner les trajets qui m'intéressent grâce à un système de filtres :seedling: | Un formulaire permet à l'administrateur de sélectionner des données spécifiques. Les données accessibles sur le web sont ensuite triées pour matcher avec la demande de l'administrateur et seules les données demandées sont affichés sur la carte leaflet.|
| Je dois pouvoir avoir une vision spécifique pour certains trajets 🟥 | |

## Covoiturage
| User story  | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir demander à participer à un covoiturage entre deux points donnés sur un créneau horaire donné 🟥 | |
| Je dois pouvoir communiquer avec un éventuel conducteur 🟥 | | 
| Je dois pouvoir recevoir des demandes de covoiturage 🟥 | |
| Je dois pouvoir accepter ou décliner des demandes de covoiturage 🟥 | |
| Je dois pouvoir communiquer avec un éventuel passager 🟥 | | 
| Je dois pouvoir signaler d'éventuels problèmes avec un passager (retard...) 🟥 :interrobang: | |


# Légende 
🟩 : User Story implémentée et validée 
:interrobang: : Validation nécessaire (soit avant d'avancer plus, soit avant de passer l'US en validée) 
🟥 : User Story non gérée
:seedling: : User Story en cours de développement
