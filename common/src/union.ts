export class UnionUtils {
  static isInstanceOf<KType extends string, T extends IUnion<KType>>(notification: { type: string }, type: KType): notification is T {
    return notification.type === type;
  }
}

export type IUnion<Key extends string> = {
  type: Key;
};
