export type RallyingPoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  kind: string;
  address: string;
  zip_code: string;
  city: string;
  place_count: number | null;
  is_active: boolean;
};

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
};

export type TripPassenger = {
  user: PublicUser;
  from_stop: TripStop;
  to_stop: TripStop;
  distance_meters: number;
  indicative_contribution_cents: number | null;
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
  indicative_cents_per_km: number;
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
  warnings: string[];
  far_from_stop_meters: number;
};

export type AdminProof = {
  passenger: PublicUser;
  from_stop: TripStop;
  to_stop: TripStop;
  distance_meters: number;
  indicative_contribution_cents: number | null;
  proof_class: ProofClass | null;
  proof_detail: ProofDetail | null;
};

export type AdminTrip = Trip & { proofs: AdminProof[] };

export type MessageKind =
  | "Text"
  | "MemberJoined"
  | "MemberLeft"
  | "TripProposed"
  | "TripCanceled"
  | "TripStarted"
  | "TripFinished";

export type Message = {
  id: string;
  liane_id: string;
  author: PublicUser;
  kind: MessageKind;
  text: string;
  data: { trip_id?: string; departure_time?: string } | null;
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
