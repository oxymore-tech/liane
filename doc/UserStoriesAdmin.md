# Administrateur Liane
Je dois avoir une vision générale du réseau Liane 

##  Accès aux informations disponibles sur le serveur
|  User story | Solution technique |
| :---------------| :----------------|
| Je dois pouvoir me connecter en tant qu'administrateur 🟩 | Système d'autentification via mobile avec code envoyé par sms (twilio) sur application web. <br/> Utilisation des requêtes *sms* (envoi de sms) et *login* (vérification des informations de connexion) de l'API *auth*. |
| Je dois avoir accès à des statistiques sur l'utilisation de Liane :seedling: <ul><li>Nombre d'utilisateurs 🟩</li><li>Utilisateurs les plus actifs</li><li>Nombre de covoiturages demandés</li><li>Nombre de covoiturages effectués</li><li>Nombre de connexions web</li><li>Nombre total de lianes 🟩</li><li>Nombre total de trajets 🟩</li></ul> | Utilisation de l'API *liane* qui permet de récupérer les différentes statistiques (nombre d'utilisateurs, de lianes et de trajets brutes) au niveau du back avec la requête *stats*.  |
| Je dois pouvoir visualiser les données collectées :seedling: | La partie web du projet est une carte leaflet. Les coordonnées géographiques (UserLocation) y sont affichées de couleur différentes en fonction de l'IndexedRawTrip dont elles proviennent. Seules les positions proches du centre de la carte sont affichées grâce à la requête *snap* de l'API *liane*. |
| Je dois pouvoir trier parmi les données collectées et choisir celles que je veux afficher :seedling: <ul><li>Utilisateur 🟩</li><li>Trajet 🟩</li><li>Créneau horaire</li><li>Type de recueil de données :seedling:</li></ul>| Un formulaire permet à l'administrateur de sélectionner des données spécifiques. Les données accessibles sur le web sont ensuite triées pour matcher avec la demande de l'administrateur et seules les données demandées sont affichés sur la carte leaflet. |
| Je dois pouvoir déplacer les points de ralliements qui ont été préalablement définis :seedling: | Les points de raliements sont "draggable", la nouvelle position à laquelle l'utilisateur les déplace est enregistrée au niveau du web puis transmise au back qui pourra alors modifier les bases de données |


|  *Amélioration de Liane via beta testeurs* | Solution technique |
| :---------------| :----------------|
| Je dois pouvoir questionner les beta testeurs 🟥 | |
| Je dois voir les erreurs éventuelles signalées par les beta testeurs 🟥 | |
| Je dois pouvoir répondre aux demandes et problèmes des beta testeurs 🟥 | |
| Je dois pouvoir voir et valider les nouvelles aires de covoiturage proposées par les beta testeurs 🟥| |


# Légende 
🟩 : User Story implémentée et validée 
:interrobang: : Validation nécessaire (soit avant d'avancer plus, soit avant de passer l'US en validée) 
🟥 : User Story non gérée
:seedling: : User Story en cours de développement
