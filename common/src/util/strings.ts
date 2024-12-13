export const capitalize = (v: string | null | undefined) => {
  if (!v) {
    return v;
  }
  return v.at(0)!.toUpperCase() + v.slice(1);
};

export const getUniqueColor = (identity: string) => {
  let hash = 0;
  if (identity.length === 0) {
    return hash;
  }
  for (let i = 0; i < identity.length; i++) {
    hash = identity.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return hash % 360;
};
