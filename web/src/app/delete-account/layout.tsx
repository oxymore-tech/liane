export default function MdxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate h-full bg-white px-6 py-12 sm:py-24 lg:px-0">
      <div className="overflow-y-scroll h-full bg-gray-700 lg:mx-24 p-4 rounded-md">{children}</div>
    </div>
  );
}
