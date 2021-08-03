# Utilisateur non authentifié (spectateur)
Je veux avoir une vision générale du réseau Liane, je veux comprendre comment fonctionne l'application, je regarde l'application par curiosité, je ne suis pas encore authentifié

Il s'agit du statut accessible à n'importe quelle personne. Ce statut peut être utilisé seul ou combiné avec un ou plusieurs des statuts suivants :
- [Administrateur](doc/UserStoriesAdmin.md) : J'ai accès à des données privilégiées de Liane, j'ai une vision globale et spécifique du réseau Liane
- [Beta testeur](doc/UserStoriesBeta.md) : Je signaler des problèmes sur l'application et je participe à l'amélioration de Liane
- [Conducteur](doc/UserStoriesConducteur.md) : J'ai télépchargé l'application mobile Liane, je suis conducteur régulier ou occasionnel
- [Passager](doc/UserStoriesPassager.md) : Je souhaite participer à des covoiturages avec Liane 


## Visualisation du réseau Liane 
| User story | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir visualiser des statistiques concernant le réseau Liane  :seedling:|Utilisation de l'API *liane* qui permet de récupérer les différentes statistiques (nombre d'utilisateurs, de lianes et de trajets brutes) au niveau du back avec la requête *stats*. |
| Je dois pouvoir avoir une vision globale des trajets effectués par des conducteurs Liane  :seedling:|La partie web du projet est une carte leaflet. Les coordonnées géographiques (UserLocation) y sont affichées de couleur différentes en fonction de l'IndexedRawTrip dont elles proviennent. Seules les positions proches du centre de la carte sont affichées grâce à la requête *snap* de l'API *liane*. |
| Je dois pouvoir sélectionner les trajets qui m'intéressent grâce à un système de filtres :seedling: | Un formulaire permet à l'administrateur de sélectionner des données spécifiques. Les données accessibles sur le web sont ensuite triées pour matcher avec la demande de l'administrateur et seules les données demandées sont affichés sur la carte leaflet.|
| Je dois pouvoir avoir une vision spécifique pour les trajets sélectionnés (fréquence d'utilisation du trajet sur le créneau horaire choisi) 🟥 | |

## Accès aux différents status 
| User story | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir accéder au [statut de conducteur](doc/UserStoriesConducteur.md) si je possède les autorisations nécessaires| Authentification en tant que conducteur avec twilio par numéro de téléphone et code envoyé par sms. Requête faite au serveur permettant de savoir si le numéro de téléphone est associé à des données envoyées par l'application mobile. Si ce n'est pas le cas, accès impossible au statut de conducteur. |
| Je dois pouvoir accéder au [statut de passager](doc/UserStoriesPassager.md) | accessible sans autorisations particulière, mais authentification avec twilio (numéro de téléphone et code par sms) nécessaire |
| Je dois pouvoir accéder au [statut d'administrateur](doc/UserStoriesAdmin.md) si je possède les autorisations nécessaires| Authentification en tant qu'administrateur avec twilio par numéro de téléphone et code envoyé par sms. Requête faite au serveur pour savoir si le numéro de téléphone fait partie de la liste des numéros des administrateurs liane.|
| Je dois pouvoir accéder au [statut de beta testeur](doc/UserStoriesBeta.md) | A voir, peut être faire une demande pour devenir beta testeur :interrobang:|

# Légende 
🟩 : User Story implémentée et validée  
🟥 : User Story non gérée
:seedling: : User Story en cours de développement
:interrobang: : Validation nécessaire (soit avant d'avancer plus, soit avant de passer l'US en validée)
