export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
      {count > 99 ? "99+" : count}
      <span className="sr-only">
        {count === 1 ? " message non lu" : " messages non lus"}
      </span>
    </span>
  );
}
