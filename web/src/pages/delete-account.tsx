export default function Page() {
  return (
    <div className="relative isolate overflow-hidden bg-white px-6 py-24 sm:py-32 lg:overflow-visible lg:px-0 rounded-full">
      <div className="bg-gray-300 lg:mx-96 p-4 rounded-md">
        <div>
          <img className="w-8 m-4" src="/images/Vector.png"/>
          <span className="text-xl font-bold">Comment supprimer votre compte utilisateur dans liane ?</span>
        </div>
        <div className="p-4">
          <div className="text-lg font-bold">
            Voici les étapes à suivre pour supprimer votre compte :
          </div>
          <div className="p-4">
            <li>Ouvrer l&apos;application Liane (Android ou IPhone)</li>
            <li>Appuyer sur le bouton <span className="font-mono text-blue-600 font-bold">Profil</span> en haut à droite de l&apos;écran</li>
            <li>Appuyer sur le menu <span className="font-mono text-blue-600 font-bold">Compte</span></li>
            <li>Appuyer sur le bouton <span className="font-mono text-blue-600 font-bold">Supprimer ce compte</span></li>
            <li>Un message de confirmation apparait. Si vous êtes de vouloir supprimer définitivement les informations vous concernant, cliquer sur le
              bouton <span className="font-mono text-blue-600 font-bold">Confirmer</span></li>
          </div>
        </div>
        <div className="p-4">
          <div className="text-lg font-bold">
            La suppression de votre compte entrainera :
          </div>
          <div className="p-4">
            <li>La suppression des informations personnelles vous concernant : prénom, nom, genre, photo de profil, numéro de téléphone</li>
            <li>Suppression de vos trajets actuels et à venir</li>
          </div>
        </div>
        <div className="p-4">
          <div className="text-lg font-bold">
            Si vous supprimez votre compte :
          </div>
          <div className="p-4">
            <li>Vous ne pourrez plus accéder à votre compte</li>
            <li>Dans les trajets que vous avez partagés avec d&apos;autres personnes vous apparaitrait comme <span
              className="font-mono text-blue-600 font-bold">Utilisateur inconnu</span></li>
            <li>Les messages que vous avez envoyés à d&apos;autres personnes apparaitront avec la mention <span
              className="font-mono text-blue-600 font-bold">Utilisateur inconnu</span></li>
          </div>
        </div>
      </div>
    </div>
  );
}
