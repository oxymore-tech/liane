# Passager 
Je dois avoir accès à toutes les fonctionnalités auxquelles un [utilisateur de type spectateur](UserStoriesSpectateur.md) a accès. Je dois pouvoir participer à un covoiturage en tant que passager. 

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

# Légende 
🟩 : User Story implémentée et validée 
🟥 : User Story non gérée
:seedling: : User Story en cours de développement
:interrobang: : Validation nécessaire (soit avant d'avancer plus, soit avant de passer l'US en validée) 
