# Qu'est-ce que `liane` :seedling:

Development

![Deploy workflow](https://github.com/oxymore-tech/liane/actions/workflows/deploy.yml/badge.svg?branch=develop)
![Deploy workflow](https://github.com/oxymore-tech/liane/actions/workflows/android.yml/badge.svg?branch=develop)
![Deploy workflow](https://github.com/oxymore-tech/liane/actions/workflows/ios.yml/badge.svg?branch=develop)

Production

![Deploy workflow](https://github.com/oxymore-tech/liane/actions/workflows/deploy.yml/badge.svg?branch=main)
![Deploy workflow](https://github.com/oxymore-tech/liane/actions/workflows/android.yml/badge.svg?branch=main)
![Deploy workflow](https://github.com/oxymore-tech/liane/actions/workflows/ios.yml/badge.svg?branch=main)

Liane est un projet né d'un constat. La voiture est une nécessité en milieu rural, et beaucoup de personnes utilisent leur voiture sur des mêmes trajets. De plus, le parc automobile est vieillissant dans les campagnes et les coût liés à ce mode de déplacement pourrait engendrer une sédentarité importante pour des personnes modestes.
Des solutions on été mises en place à échelle locale, comme des groupes What'sApp, mais leur faible efficacité ne permet pas de faire du covoiturage une solution durable. C'est pour cela que Liane a été imaginée. Une application permettant de mettre facilement en contact conducteurs et passagers, avec comme maître mots la simplicité et le partage. 

Liane n'a pour l'instant pas imaginé de récompense (financière au autre) pour ses utilisateurs. Le conducteur prend des passagers en covoiturage comme un acte citoyen, pour participer à la vie de la communauté. Le côté communautaire est très important au sein du projet Liane, et le covoiturage est vu comme vecteur de rencontres et de lien social. 

# Installation du projet :neckbeard:

Récupérer le projet liane via git :

```bash
cd ~/workspace/perso
git clone git@github.com:oxymore-tech/liane.git
```

Installer liane CLI (outils pour le dev) :

Créer le fichier `.env.local` dans le répertoire `back` avec le contenu suivant :

```bash
LIANE_SMS__APIKEY=
LIANE_AUTH__TESTACCOUNT=
LIANE_AUTH__TESTCODE=
```

Changer la valeur de LIANE_HOME si besoin et exécuter le code suivant : 

```bash
LIANE_HOME=~/workspace/perso/liane

echo "PATH=\${PATH}:${LIANE_HOME}/back" >> ~/.bashrc
echo "source ${LIANE_HOME}/back/liane-completion.bash" >> ~/.bashrc
```

Pour vérifier, ouvrez un nouveau terminal et entrez :

```bash
liane
```

Vous devez obtenir le résultat suivant :

```bash
Usage: liane (token|init|start|stop|dump_on_local)
```

Ensuite lancez les 3 modules de lianes :

- [back : backend API](back/README.md)
- [common : common js layer, e2e tests](common/README.md)
- [app : mobile app](app/README.md)
- [web : web app](web/README.md)

# Troubleshooting :scream:

Manage IOS certificates and provisioning profiles :
[doc/ios_certificate.md](doc/ios_certificate.md)
