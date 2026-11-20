import { Badge } from "@/components/ui";

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge tone="urgent" className="min-w-6 justify-center font-bold">
      {count > 99 ? "99+" : count}
      <span className="sr-only">
        {count === 1 ? " message non lu" : " messages non lus"}
      </span>
    </Badge>
  );
}
