export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dashboard chrome (sidebar, top bar) and bootstrap logic ship in Phase 4.
  return <div className="min-h-screen">{children}</div>;
}
