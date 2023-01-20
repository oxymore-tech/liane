export type SortOptions<T> = { [P in keyof T]?: number };

export type RootQuerySelector<T> = {
  /** @see https://docs.mongodb.com/manual/reference/operator/query/and/#op._S_and */
  $and?: Array<FilterQuery<T>>;
  /** @see https://docs.mongodb.com/manual/reference/operator/query/nor/#op._S_nor */
  $nor?: Array<FilterQuery<T>>;
  /** @see https://docs.mongodb.com/manual/reference/operator/query/or/#op._S_or */
  $or?: Array<FilterQuery<T>>;
  /** @see https://docs.mongodb.com/manual/reference/operator/query/text */
  $text?: {
    $search: string;
    $language?: string;
    $caseSensitive?: boolean;
    $diacriticSensitive?: boolean;
  };
  /** @see https://docs.mongodb.com/manual/reference/operator/query/where/#op._S_where */
  $where?: string | Function;
  /** @see https://docs.mongodb.com/manual/reference/operator/query/comment/#op._S_comment */
  $comment?: string;
  // we could not find a proper TypeScript generic to support nested queries e.g. 'user.friends.name'
  // this will mark all unrecognized properties as any (including nested queries)
  [key: string]: any;
};
type RegExpForString<T> = T extends string ? RegExp | T : T;
type MongoAltQuery<T> = T extends ReadonlyArray<infer U> ? T | RegExpForString<U> : RegExpForString<T>;

export type Condition<T> = MongoAltQuery<T> | QuerySelector<MongoAltQuery<T>>;
export type QuerySelector<T> = {
  // Comparison
  $eq?: T;
  $gt?: T;
  $gte?: T;
  $in?: T[];
  $lt?: T;
  $lte?: T;
  $ne?: T;
  $nin?: T[];
  // Logical
  $not?: T extends string ? QuerySelector<T> | RegExp : QuerySelector<T>;
  // Element
  /**
     * When `true`, `$exists` matches the documents that contain the field,
     * including documents where the field value is null.
     */
  $exists?: boolean;
  $regex?: T extends string ? RegExp | string : never;
};

export type FilterQuery<T> = {
  [P in keyof T]?: Condition<T[P]>;
} &
RootQuerySelector<T>;
