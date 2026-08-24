import { BuilderProvider } from "@/context/BuilderContext";

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BuilderProvider>{children}</BuilderProvider>;
}
