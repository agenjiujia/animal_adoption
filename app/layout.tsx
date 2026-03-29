import AppShell from "@/app/_components/AppShell";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
