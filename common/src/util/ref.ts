import { LianeSearchFilter, RallyingPoint, WithResolvedRef } from "../api";

export type WithSomeResolvedRef<T extends { [x: string]: any }> = WithResolvedRef<any, any, T>;
export type ResolvedFields = (typeof ResolvedRefs)[keyof typeof ResolvedRefs];
export const toUnresolved = <T extends { [x: string]: any }>(value: WithSomeResolvedRef<T>, fields: ResolvedFields): T => {
  if (fields.length > 0) {
    const field = fields[0];
    // @ts-ignore
    return toUnresolved({ ...value, [field]: value[field].id }, fields.slice(1));
  }
  return value;
};

/* Internal resolved types declarations */
export const ResolvedRefs = {
  LianeSearchFilter: ["to", "from"]
} as const;

export type InternalLianeSearchFilter = WithResolvedRef<"from", RallyingPoint, WithResolvedRef<"to", RallyingPoint, LianeSearchFilter>> &
  WithSomeResolvedRef<LianeSearchFilter>;
