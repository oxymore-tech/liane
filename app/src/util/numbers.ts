export const mod = function (x: number, n: number) {
  return ((x % n) + n) % n;
};
