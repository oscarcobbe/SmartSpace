export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        header, footer, header + div, .fixed.top-0.bg-brand-500 { display: none !important; }
      `}</style>
      {children}
    </>
  );
}
