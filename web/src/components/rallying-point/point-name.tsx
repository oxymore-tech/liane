import { cn } from "@/components/utils";

type Point = { label: string; city: string; zip_code?: string };

/** Le nom d'un point de ralliement : son libellé, à défaut sa commune. */
export const pointName = (point: Point) => point.label || point.city;

/** La commune d'un point, sauf si son nom la contient déjà. */
export const pointCity = (point: Point) =>
  point.city && !pointName(point).includes(point.city) ? point.city : null;

/**
 * Un point de ralliement : son nom en gras, sa commune en gris.
 * Sur deux lignes, ou sur une seule (`inline`) au milieu d'une phrase.
 */
export function PointName({
  point,
  inline = false,
  zipCode = false,
  className,
}: {
  point: Point;
  inline?: boolean;
  /** Dans une liste de suggestions, le code postal distingue les communes de même nom. */
  zipCode?: boolean;
  className?: string;
}) {
  const city = pointCity(point);
  if (inline) {
    return (
      <span className={className}>
        <strong>{pointName(point)}</strong>
        {city && <span className="font-normal text-gris"> ({city})</span>}
      </span>
    );
  }
  const second = [zipCode && point.zip_code, city].filter(Boolean).join(" ");
  return (
    <span className={cn("block", className)}>
      <span className="block font-bold">{pointName(point)}</span>
      {second && (
        <span className="block text-sm font-normal text-gris">{second}</span>
      )}
    </span>
  );
}

/** Un tronçon entre deux points : « nom → nom », ou « nom ⇄ nom » dans les deux sens. */
export function PointRoute({
  from,
  to,
  bothWays = false,
}: {
  from: Point;
  to: Point;
  bothWays?: boolean;
}) {
  return (
    <>
      <PointName inline point={from} /> {bothWays ? "⇄" : "→"}{" "}
      <PointName inline point={to} />
    </>
  );
}
