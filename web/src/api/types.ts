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

export type Liane = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  stops: RallyingPoint[];
  route: { type: "LineString"; coordinates: [number, number][] } | null;
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

export type MyLiane = Liane & { membership: Membership };

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
