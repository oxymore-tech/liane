export class ArrayUtils {
  public static groupBy<T>(xs: T[], key: (t: T) => string): { [k: string]: T[] } {
    return xs.reduce(
      function (rv, x) {
        (rv[key(x)] = rv[key(x)] || []).push(x);
        return rv;
      },
      {} as { [k: string]: T[] }
    );
  }
}
