export type RallyingPointKind =
  | "CarpoolArea"
  | "HighwayExit"
  | "Parking"
  | "Supermarket"
  | "RelayParking"
  | "AbandonedRoad"
  | "AutoStop"
  | "TownHall";

export type RallyingPoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  kind: RallyingPointKind;
  address: string;
  zip_code: string;
  city: string;
  place_count: number | null;
  is_active: boolean;
};

/**
 * Un point vu par l'administration. `source` : origine du point, absente s'il a été créé à la main.
 * `edited_at` : dernière création ou modification à la main. `lianes` : noms des lianes qui s'y arrêtent.
 */
export type AdminRallyingPoint = RallyingPoint & {
  source: string | null;
  edited_at: string | null;
  lianes: string[];
};

export type RallyingPointInput = Omit<RallyingPoint, "id">;

export type Direction = "Outbound" | "Return" | "Both";

/** « Straight » : ligne droite entre les arrêts, faute de calcul d'itinéraire. */
export type RouteSource = "Osrm" | "Straight";

export type RouteLine = { type: "LineString"; coordinates: [number, number][] };

export type RoutePreview = {
  route: RouteLine;
  route_source: RouteSource;
  distance_meters: number;
  duration_seconds: number | null;
  stop_distances: number[];
};

export type Liane = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  stops: RallyingPoint[];
  /** Distance en mètres de chaque arrêt depuis le premier, le long du tracé. */
  stop_distances: number[];
  route: RouteLine | null;
  route_source: RouteSource;
  distance_meters: number;
  duration_seconds: number | null;
  member_count: number;
  created_at: string;
  updated_at: string;
};

export type DaySchedule = {
  day: number;
  outbound_members: number;
  outbound_drivers: number;
  return_members: number;
  return_drivers: number;
};

export type MembershipInput = {
  board_stop_id: string;
  alight_stop_id: string;
  week_days: string;
  direction: Direction;
  can_drive: boolean;
  outbound_time: string | null;
  return_time: string | null;
};

export type Membership = MembershipInput & { joined_at: string };

export type PublicUser = {
  id: string;
  pseudo: string | null;
};

export type LianeMember = Membership & { user: PublicUser };

export type LianeDetail = Liane & {
  schedule: DaySchedule[];
  membership: Membership | null;
  members: LianeMember[] | null;
};

export type LianeInput = {
  name: string;
  stop_ids: string[];
  is_active: boolean;
};

export type Report = {
  id: string;
  liane: { id: string; name: string; slug: string };
  reported: PublicUser;
  reporter: PublicUser;
  reason: string;
  created_at: string;
  reported_is_member: boolean;
};

export type User = {
  id: string;
  phone: string;
  pseudo: string | null;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  is_signed_up: boolean;
};

export type MyLiane = Liane & {
  membership: Membership;
  /** Messages des autres membres arrivés depuis la dernière lecture. */
  unread_count: number;
};

export type TripDirection = "Outbound" | "Return";

export type TripState = "Planned" | "Started" | "Finished" | "Canceled";

export type TripRole = "Driver" | "Passenger";

/** Début (« Je démarre », « Je monte ») ou fin (« J'arrive », « Je descends ») du trajet d'un occupant. */
export type GestureKind = "Start" | "End";

export type PositionStatus = "Granted" | "Denied" | "Unavailable";

/** Ce que la preuve du trajet atteste, dit sans jargon. */
export type Attestation = "Full" | "Partial" | "None";

export type TripStop = { id: string; label: string; city: string };

export type Trip = {
  id: string;
  liane: { id: string; name: string; slug: string };
  driver: PublicUser;
  departure_time: string;
  direction: TripDirection;
  from_stop: TripStop;
  to_stop: TripStop;
  seat_count: number;
  seats_left: number;
  distance_meters: number;
  state: TripState;
  /** À venir ou en cours : ni terminé, ni annulé, ni périmé. */
  is_open: boolean;
  my_role: TripRole | null;
  /** Le conducteur partage les frais avec les passagers qui ont aussi un porte-monnaie. */
  driver_has_wallet: boolean;
};

export type TripPassenger = {
  user: PublicUser;
  from_stop: TripStop;
  to_stop: TripStop;
  distance_meters: number;
  started_at: string | null;
  ended_at: string | null;
  attestation: Attestation | null;
};

export type MyGesture = {
  kind: GestureKind;
  recorded_at: string;
  position_status: PositionStatus;
};

export type TripDetail = Trip & {
  driver_started_at: string | null;
  driver_ended_at: string | null;
  passengers: TripPassenger[];
  my_gestures: MyGesture[];
  next_gesture: GestureKind | null;
  gesture_window: {
    start_opens_at: string;
    start_closes_at: string;
    end_closes_at: string;
  };
};

export type MyTrips = { upcoming: Trip[]; past: Trip[] };

export type TripInput = {
  departure_time: string;
  direction: TripDirection;
  seat_count: number;
  from_stop_id: string;
  to_stop_id: string;
};

export type GestureInput = {
  kind: GestureKind;
  position?: { lat: number; lng: number; accuracy_meters: number | null };
  position_status?: PositionStatus;
};

export type ProofClass = "A" | "B" | "C";

/** Une déclaration invraisemblable, signalée sans changer la classe. */
export type ProofWarning =
  | "DriverStartFarFromStop"
  | "DriverEndFarFromStop"
  | "DriverTripTooShort"
  | "PassengerStartFarFromStop"
  | "PassengerEndFarFromStop"
  | "PassengerTripTooShort";

export type ProofGesture = {
  recorded_at: string;
  position_status: PositionStatus;
  accuracy_meters: number | null;
  distance_to_stop_meters: number | null;
  far_from_stop: boolean;
};

export type ProofOccupant = {
  attested: boolean;
  start: ProofGesture | null;
  end: ProofGesture | null;
};

export type ProofDetail = {
  connection: { attested: boolean; booked_at: string };
  driver: ProofOccupant;
  passenger: ProofOccupant;
  distinct_identities: boolean;
  warnings: ProofWarning[];
  far_from_stop_meters: number;
};

export type AdminProof = {
  passenger: PublicUser;
  from_stop: TripStop;
  to_stop: TripStop;
  distance_meters: number;
  proof_class: ProofClass | null;
  proof_detail: ProofDetail | null;
};

export type AdminTrip = Trip & { proofs: AdminProof[] };

/** Corps de `POST /journeys` du registre de preuve de covoiturage (API v3.4). */
export type RegistryTimePlace = { datetime: string; lat: number; lon: number };

export type RegistryIdentity = {
  operator_user_id: string;
  identity_key: string;
  phone_trunc: string;
};

export type RegistryJourney = {
  operator_journey_id: string;
  operator_trip_id: string;
  operator_class: ProofClass;
  incentives: { index: number; amount: number; siret: string }[];
  start: RegistryTimePlace;
  end: RegistryTimePlace;
  distance: number;
  driver: { identity: RegistryIdentity; revenue: number };
  passenger: {
    identity: RegistryIdentity;
    contribution: number;
    seats: number;
  };
};

export type MissingField =
  | "end.datetime"
  | "driver.identity"
  | "passenger.identity";

export type TimeSource =
  | "PassengerGesture"
  | "DriverGesture"
  | "PlannedDeparture";

export type PositionSource = "PassengerGesture" | "PlannedStop";

export type DeclaredGesture = {
  datetime: string;
  lat: number | null;
  lon: number | null;
};

export type DeclaredGestures = {
  start: DeclaredGesture | null;
  end: DeclaredGesture | null;
};

/**
 * Un couple conducteur/passager de l'export. `journey` est absent quand une donnée obligatoire
 * du registre manque ; `missing` dit laquelle. `liane` porte ce qui n'appartient pas au registre.
 */
export type ExportedJourney = {
  journey: RegistryJourney | null;
  missing: MissingField[];
  liane: {
    trip_id: string;
    liane_id: string;
    driver_id: string;
    passenger_id: string;
    operator_class: ProofClass;
    planned_departure_time: string;
    start_time_source: TimeSource;
    start_position_source: PositionSource;
    end_time_source: TimeSource | null;
    end_position_source: PositionSource;
    driver: DeclaredGestures;
    passenger: DeclaredGestures;
    proof_detail: ProofDetail | null;
    warnings: "DistanceUnderOneKilometer"[];
  };
};

/** Le trajet dont parle un message automatique. */
export type TripReference = { trip_id: string; departure_time: string };

/** `kind` dit ce que porte `data` : rien pour un texte ou une adhésion, le trajet sinon. */
export type MessageContent =
  | { kind: "Text" | "MemberJoined" | "MemberLeft"; data?: undefined }
  | {
      kind: "TripProposed" | "TripCanceled" | "TripStarted" | "TripFinished";
      data: TripReference;
    };

export type MessageKind = MessageContent["kind"];

export type Message = MessageContent & {
  id: string;
  liane_id: string;
  author: PublicUser;
  text: string;
  created_at: string;
};

/** Du plus récent au plus ancien. */
export type MessagePage = { messages: Message[]; has_more: boolean };

/** Une liane qui passe près du départ et de l'arrivée cherchés, avec les arrêts suggérés. */
export type LianeSearchResult = {
  liane: Liane;
  from_stop_id: string;
  to_stop_id: string;
  direction: Direction;
  section_distance_meters: number;
  from_distance_meters: number;
  to_distance_meters: number;
};

/** `Disabled` : Liane n'a pas de tarif de partage des frais, personne n'a de porte-monnaie. */
export type Wallet =
  | { kind: "Disabled" }
  | { kind: "Closed"; cents_per_km: number }
  | { kind: "Open"; cents_per_km: number; opened_at: string };

/** `role` est celui du titulaire du relevé : passager, il doit le montant ; conducteur, il le reçoit. */
export type StatementEntry = {
  trip_id: string;
  role: TripRole;
  counterpart: PublicUser;
  departure_time: string;
  from_stop: TripStop;
  to_stop: TripStop;
  distance_meters: number;
  cents_per_km: number;
  amount_cents: number;
};

/** Les trajets d'un mois, dus à `due_on` ; ce qui est dû et ce qui est reçu ne se compensent pas. */
export type Statement = {
  month: string;
  due_on: string;
  owed_cents: number;
  received_cents: number;
  entries: StatementEntry[];
};
