# Utilisateur authentifié comme conducteur
J'ai téléchargé l'application Liane, je suis conducteur régulier ou occasionnel. Je dois avoir accès à toutes les fonctionnalités auxquelles un utilisateur de type spectateur a accès.

## Accès à l'application et navigation
| User story | Solution |
| :-------- | :--------- |
| Je dois pouvoir comprendre pourquoi Liane a besoin d'accéder à mes données de géolocalisation :interrobang: | Trois pages de texte à la première connexion qui expliquent l’intérêt de l’application et du partage de données de géolocalisation|
| Je dois pouvoir naviguer facilement et sans perte de temps dans l'application :interrobang: | Application minimaliste avec peu de boutons, pas de manupulations à faire mis à part le partage de la localisation à la première utilisation. |

## Sécurité, authentification
| User story | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir m'indentifier de façon sécurisée 🟩  | Système d'autentification via mobile avec code envoyé par sms (twilio) sur application web et mobile. <br/> Utilisation des requêtes *sms* (envoi de sms) et *login* (vérification des informations de connexion) de l'API *auth*. |
| Je dois pouvoir garder mon anonymat sur Liane, aucun autre utilisateur ne doit pouvoir récupérer mes informations personnelles 🟩  | La seule donnée sensible partagée et le numéro de téléphone, qui n'est relié à aucun nom. Ce numéro n'est visible que par les administrateurs du site (possibilité d'anonymiser aussi à ce niveau là :interrobang:). Le numéro ne peut être partagé à un autre utilisateur qu'avec accord préalable du propriétaire du numéro.<br/>  |
| Je dois pouvoir évoluer sur Liane de façon complètement anonyme| Les utilisateurs ainsi que les administrateurs ne doivent pas voir les données d'identification des utilisateurs|
| Je dois pouvoir choisir les autorisations de géolocalisation que Liane a sur mon téléphone 🟩  |Lors de la première connexion, une page dédiée expliquant les différents types de partage de géolocalisation et leur intérêt. Quand l'utilisateur choisit une option, il accède automatiquement au pop-up de son téléphone pour autoriser l'envoi de données. |
| Je dois pouvoir modifier les autorisations de géolocalisation facilement et à tout moment 🟩  | Page dédiée sur l'application mobile avec un bouton pour chaque type de partage de données. <br/> Lorsque l'utilisateur clique sur un bouton, la valeur de la variable Permissions.LOCATION est modifiée dans le ContextProvider qui est consulté par l'application avant chaque action.|

## Gestion et partage des données personnelles 
| User story | Solution technique |
| :-------- | :--------- |
| Mes données de géolocalisation doivent être partagée à Liane :seedling: | Utilisation de l'API *expo-location* qui permet de récupérer les informations de géolocalisation d'un mobile. L'application mobile effectue un pré-traitement des positions enregistrées pour créer des RawTrips, listes de géolocalisations. Au niveau du back, le traitement est affiné, les RawTrips peuvent être divisés si l'algorithme remarque un arrêt trop long, et les points de ralliement les plus proches de la route empruntée sont récupérés. Cette liste des RallyingPoints permet ensuite la création de Lianes, des trajets deux points de ralliement qui correspondent à tous les sous trajets possibles entre le rallying point associé au départ du trajet, et celui associé à la fin du trajet. |
| Je dois pouvoir visualiser textuellement les informations qui ont été recueillies par Liane :interrobang: <ul><li>Trajets effectués 🟩  (mobile)</li><li>Récurrence 🟩  (mobile)</li></ul> | Les informations de trajets effectués et récurrence sont récupérées via l'API *liane* et affichées sur la page d'accueil de l'application mobile. |
| Je dois pouvoir visualiser sur une carte les informations relatives à chaque trajet repéré par Liane :interrobang: | Afficher les rallying points du trajet demandé d'une autre couleur et tracer le chemin entre eux, afficher seulement les coordonnées récupérées au niveau de l'application mobile.|
| Je dois pouvoir filtrer les informations recueillies par liane suivant différents critères :interrobang: 🟥 <ul><li>Créneau horaire</li><li>Points de départ et arrivée</li><li>Mode d'enregistrement des données (comment et pourquoi ces données là ont été envoyées à Liane) </li></ul>| Sur l'application web. <br/> Une requête est effectuée qui permet de récupérer uniquement les données de l'utilisateur connecté, et uniquement les données autour du centre actuel de la carte. Ces données peuvent être affichées telles quelles ou filtrée directement au niveau du front pour afficher uniquement les données demandées. |
| Je dois pouvoir accéder à de statistiques de mon utilisation de Liane :seedling: <ul><li>Début sur l'application</li><li>Nombre de lianes générées</li><li>Nombre de trajets effectués</li></ul>|Utilisation de l'API *liane* qui permet de récupérer les différentes statistiques (nombre de lianes créées et de trajets brutes effectués) au niveau du back. |
| Je dois pouvoir supprimer les informations que je veux :seedling: | Sur l'application mobile, un bouton permet la suppression d'une ou toutes les occurences d'un trajet.|


## Covoiturage
| User story  | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir recevoir des demandes de covoiturage de la part d'un potentiel passager 🟥 | |
| Je dois pouvoir accepter ou décliner des demandes de covoiturage 🟥 | |
| Je dois pouvoir communiquer avec un éventuel passager si j'ai accepté sa demande de covoiturage 🟥 | | 
| Je dois pouvoir signaler d'éventuels problèmes avec un passager (retard...) 🟥 :interrobang: | |

# Légende 
🟩 : User Story implémentée et validée 
🟥 : User Story non gérée
:seedling: : User Story en cours de développement
:interrobang: : Validation nécessaire (soit avant d'avancer plus, soit avant de passer l'US en validée) 

