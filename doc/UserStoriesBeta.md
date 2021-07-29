
# Beta testeur
J'ai un mobile et ai téléchargé liane, je suis conducteur régulier ou occasionnel
Je participe à l'élaboration et l'amélioration de l'application

## Accès à l'application et navigation
| User stories | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir comprendre pourquoi Liane a besoin d'accéder à mes données de géolocalisation 🟩 :interrobang: | Trois pages de texte à la première connexion qui expliquent l'intérêt de l'application et du partage de données de géolocalisation|
| Je dois pouvoir naviguer facilement et sans perte de temps dans l'application 🟩 :interrobang: | Application minimaliste avec peu de boutons, pas de manupulations à faire mis à part le partage de la localisation à la première utilisation.|

## Sécurité 
| User stories | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir m'indentifier de façon sécurisée 🟩 | Système d'autentification via mobile avec code envoyé par sms (twilio) sur application web. <br/> Utilisation des requêtes *sms* (envoi de sms) et *login* (vérification des informations de connexion) de l'API *auth*. |
| Je dois pouvoir garder mon anonymat durant toute l'utilisation de Liane 🟩 | La seule donnée sensible partagée et le numéro de téléphone. Ce numéro n'est visible que par les administrateurs du site (possibilité d'anonymiser aussi à ce niveau là :interrobang:). <br/> |
| Je dois pouvoir choisir les autorisations de géolocalisation que Liane a sur mon téléphone 🟩 | Lors de la première connexion, une page dédiée expliquant les différents types de partage de géolocalisation et leur intérêt. Quand l'utilisateur choisit une option, il accède automatiquement au pop-up de son téléphone pour autoriser l'envoi de données. |
| Je dois pouvoir modifier les autorisations de géolocalisation facilement et à tout moment 🟩 | Page dédiée sur l'application mobile avec un bouton pour chaque type de partage de données. <br/> Lorsque l'utilisateur clique sur un bouton, la valeur de la variable Permissions.LOCATION est modifiée dans le ContextProvider qui est consulté par l'application avant chaque action. |

## Gestion et partage de données 
| User stories | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir partager mes données de géolocalisation à Liane :seedling: | Utilisation de l'API *expo-location* qui permet de récupérer les informations de géolocalisation d'un mobile. |
| Je dois pouvoir visualiser les informations qui ont été recueillies par Liane :interrobang: <ul><li>Trajets effectués 🟩 (mobile)</li><li>Récurrence 🟩 (mobile)</li></ul> | Les données recueillies par Liane sont pré-traitées au niveau de l'application mobile pour créer des RawTrip. Ils sont ensuite envoyés au niveau du back où le traitement est affiné. Les informations de trajets effectués et récurrence sont ensuite récupérées via l'API *liane* et affichées sur la page d'accueil de l'application mobile. <br/>  |
| Je dois pouvoir filtrer les informations recueillies par liane suivant différents critères :interrobang: <ul><li>Créneau horaire</li><li>Points de départ et arrivée</li><li>Mode d'enregistrement des données (comment et pourquoi ces données là ont été envoyées à Liane) </li></ul>| Sur l'application web, une requête est effectuée qui permet de récupérer uniquement les données de l'utilisateur connecté, et uniquement les données autour du centre actuel de la carte. Ces données peuvent être affichées telles quelles ou filtrée directement au niveau du front pour afficher uniquement les données demandées.|
| Je dois pouvoir accéder à de statistiques de mon utilisation de Liane :seedling: <ul><li>Début sur l'application</li><li>Nombre de lianes générées</li><li>Nombre de trajets effectués</li></ul>| Utilisation de l'API *liane* qui permet de récupérer les différentes statistiques (nombre de lianes créées et de trajets brutes effectués) au niveau du back.|
| Je dois pouvoir supprimer les informations que je veux 🟥 | Sur l'application mobile, un bouton permet la suppression d'une ou toutes les occurences d'un trajet.|

## Amélioration de Liane
| User stories | Solution technique |
| :-------- | :------ |
| Je dois pouvoir signaler des erreurs éventuelles 🟥 | |
| Je dois pouvoir faire un retour général sur mon expérience utilisateur 🟥 | |
| Je dois pouvoir suggérer des aures de covoiturage sur les routes que j'emprunte régulièrement 🟥 | |
| Je dois pouvoir contacter un administrateur ou un service support facilement 🟥 | |

# Légende 
🟩 : User Story implémentée et validée 
:interrobang: : Validation nécessaire (soit avant d'avancer plus, soit avant de passer l'US en validée) 
🟥 : User Story non gérée
:seedling: : User Story en cours de développement
