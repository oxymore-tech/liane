# Passager 
Je dois avoir accès à toutes les fonctionnalités auxquelles un [utilisateur de type spectateur](UserStoriesSpectateur.md) a accès. Je dois pouvoir participer à un covoiturage en tant que passager. 

## Accès à l'application et navigation
| User story | Solution |
| :-------- | :--------- |
| Je dois pouvoir comprendre pourquoi Liane a besoin d'accéder à mes données de géolocalisation :interrobang: | Trois pages de texte à la première connexion qui expliquent l’intérêt de l’application et du partage de données de géolocalisation|
| Je dois pouvoir naviguer facilement et sans perte de temps dans l'application :interrobang: | Application minimaliste avec peu de boutons, pas de manupulations à faire mis à part le partage de la localisation à la première utilisation. |

## Sécurité
| User story | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir m'indentifier de façon sécurisée 🟩  | Système d'autentification via mobile avec code envoyé par sms (twilio) sur application web. <br/> Utilisation des requêtes *sms* (envoi de sms) et *login* (vérification des informations de connexion) de l'API *auth*. |
| Je dois pouvoir garder mon anonymat durant toute l'utilisation de Liane 🟩  | La seule donnée sensible partagée et le numéro de téléphone. Ce numéro ne peut ê |
| User story | Solution techniquetre partagé qu'après validation auprès de son propriétaire. |


## Covoiturage
| User story  | Solution technique |
| :-------- | :--------- |
| Je dois pouvoir demander à participer à un covoiturage entre deux points donnés sur un créneau horaire donné 🟥 | |
| Je dois pouvoir voir les trajets les plus proches de ma demande si aucun trajet correspondant strictement à ma demande n'est disponible 🟥 | |
| Je dois pouvoir communiquer avec un éventuel conducteur 🟥 | | 
| Je dois pouvoir signaler d'éventuels problèmes avec un conducteur 🟥 :interrobang: | |
