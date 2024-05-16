import { DayOfTheWeekFlag } from "@liane/common";

export type CoVoitureur = {
  id: number; // Identifiant unique du covoitureur
  nom: string;
  prenom: string;
  photo: string; // URL de la photo ou chemin d'accès local à la photo
};

export type GroupeCovoiturage = {
  id: number; // Identifiant unique du groupe
  depart: string; // Point de départ
  arrivee: string; // Point d'arrivée
  heureDepart: string; // Heure de départ au format HH:MM
  covoitureurs: CoVoitureur[]; // Liste des covoitureurs
  nomGroupe: string;
  nouveauxMessages: boolean;
  demandeNouveauGroupe: boolean;
  admin: boolean;
  recurrence: DayOfTheWeekFlag;
};

// Objets de test
const groupe1: GroupeCovoiturage = {
  id: 1,
  depart: "Maison",
  arrivee: "Bureau",
  heureDepart: "08:00",
  recurrence: "0100010",
  covoitureurs: [
    { id: 1, nom: "Dupont", prenom: "Jean", photo: "url_photo_jean" },
    { id: 2, nom: "Durand", prenom: "Marie", photo: "url_photo_marie" }
    // Ajoutez d'autres covoitureurs au besoin
  ],
  nomGroupe: "Groupe travail",
  nouveauxMessages: true,
  demandeNouveauGroupe: false,
  admin: false
};

const groupe2: GroupeCovoiturage = {
  id: 2,
  depart: "Maison",
  arrivee: "Centre commercial",
  heureDepart: "12:00",
  recurrence: "0110000",
  covoitureurs: [
    { id: 3, nom: "Martin", prenom: "Pierre", photo: "url_photo_pierre" },
    { id: 4, nom: "Lefebvre", prenom: "Sophie", photo: "url_photo_sophie" }
    // Ajoutez d'autres covoitureurs au besoin
  ],
  nomGroupe: "Sortie shopping",
  nouveauxMessages: false,
  demandeNouveauGroupe: false,
  admin: true
};

const groupe3: GroupeCovoiturage = {
  id: 3,
  depart: "Bureau",
  arrivee: "Maison",
  heureDepart: "17:30",
  recurrence: "0100100",
  covoitureurs: [
    { id: 5, nom: "Garcia", prenom: "Carlos", photo: "url_photo_carlos" },
    { id: 6, nom: "Roux", prenom: "Sophie", photo: "url_photo_sophie" },
    { id: 3, nom: "Martin", prenom: "Pierre", photo: "url_photo_pierre" }
    // Ajoutez d'autres covoitureurs au besoin
  ],
  nomGroupe: "Retour du travail",
  nouveauxMessages: true,
  demandeNouveauGroupe: false,
  admin: false
};

// Objet contenant les groupes de test
const groupes: GroupeCovoiturage[] = [groupe1, groupe2, groupe3];

export default groupes;
