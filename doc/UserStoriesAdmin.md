# Administrateur Liane
Je dois avoir une vision générale du réseau Liane.
Je dois avoir accès à toutes les fonctionnalités auxquelles un [utilisateur de type spectateur](doc/UserStoriesLambda.md) a accès. 
Mon statut d'administrateur n'est pas compatible avec un statut de beta testeur. 

##  Accès privilégié aux informations disponibles sur le serveur
|  User story | Solution technique |
| :---------------| :----------------|
| Le système doit pouvoir reconnaître que je suis administrateur 🟩 | Système d'autentification via mobile avec code envoyé par sms (twilio) sur application web. <br/> Utilisation des requêtes *sms* (envoi de sms) et *login* (vérification des informations de connexion) de l'API *auth*. Une liste des administrateurs est disponible et l'utilisateur est reconnu comme administrateur si son numéro de téléphone fait partie de cette liste. Il aura donc accès à des données spécifiques à son statut d'administrateur. |
| Je dois avoir accès à des statistiques supplémentaires sur l'utilisation de Liane :seedling: <ul><li>Utilisateurs les plus actifs</li><li>Nombre de covoiturages demandés</li><li>Nombre de covoiturages effectués</li><li>Nombre de connexions web</li><li>Nombre total de lianes 🟩</li><li>Nombre total de trajets 🟩</li></ul> | Utilisation de l'API *liane* qui permet de récupérer les différentes statistiques (nombre de lianes et de trajets brutes...) au niveau du back avec la requête *stats*.  |
| Je dois pouvoir visualiser les données brutes collectées :seedling: | La partie web du projet est une carte leaflet. Les coordonnées géographiques (UserLocation) y sont affichées de couleur différentes en fonction de l'IndexedRawTrip dont elles proviennent. Seules les positions proches du centre de la carte sont affichées grâce à la requête *snap* de l'API *liane*. |
| Je dois pouvoir trier parmi les données brutes collectées et choisir celles que je veux afficher :seedling: <ul><li>Utilisateur 🟩</li><li>Trajet 🟩</li><li>Créneau horaire</li><li>Type de recueil de données :seedling:</li></ul>| Un formulaire permet à l'administrateur de sélectionner des données spécifiques. Les données accessibles sur le web sont ensuite triées pour matcher avec la demande de l'administrateur et seules les données demandées sont affichés sur la carte leaflet. |


## Gestion des points de ralliement 
|User story | Solution technique |
| :---------------| :----------------|
| Je dois pouvoir ajuster la position d'un point de ralliement :seedling: | Les markers leaflet sont rendus *draggable* ce qui permet de les déplacer grâce à un cliquer-glisser. Le déplacement est ensuite validé ou non par l'administrateur. Si le déplacement est validé, l'application web utilise la requête "" de l'API "", qui permettra la modification des coordonnées des points de ralliement dans la base de données.|
| Je dois pouvoir activer ou désactiver un point de ralliement 🟥 | Un bouton est créé dans un pop-uppour chaque rallying point, qui permet d'activer un rallying point si il n'est pas activé et inversement. Les ralllying point désactivés sont visibles dans une autre couleur sur la carte. Un bouton de validation permet de lancer une requête de l'API * qui modifiera l'état (actif ou non) du rallying point dans la base de données). |
| Je dois pouvoir supprimer un point de ralliement 🟥 | Lorsqu'on clique sur un rallying point inactif, on a accès à un bouton "supprimer". Un popup s'affiche pour demander la validation de la suppression. Si l'utilisateur valide, une requête est envoyée via l'API * qui permet de supprimer le rallying point de la base de données. |
| Je dois pouvoir ajouter un nouveau point de ralliement 🟥 | |

## Amélioration de Liane via beta testeurs
| User story | Solution technique |
| :---------------| :----------------|
| Je dois pouvoir questionner les beta testeurs 🟥 | |
| Je dois voir les erreurs éventuelles signalées par les beta testeurs 🟥 | |
| Je dois pouvoir répondre aux demandes et problèmes des beta testeurs 🟥 | |
| Je dois pouvoir voir et valider les nouvelles aires de covoiturage proposées par les beta testeurs 🟥| |


# Légende 
🟩 : User Story implémentée et validée 
🟥 : User Story non gérée
:seedling: : User Story en cours de développement
:interrobang: : Validation nécessaire (soit avant d'avancer plus, soit avant de passer l'US en validée) 
