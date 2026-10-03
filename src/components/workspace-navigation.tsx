"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const pages = [
  ["/dashboard", "Overview"],
  ["/needs", "Needs"],
  ["/network", "Network"],
  ["/companies", "Companies"],
  ["/graph", "Graph"],
  ["/opportunities", "Opportunities"],
  ["/pipeline", "Pipeline"],
  ["/partnerships", "Partnerships"],
  ["/onboarding", "Onboarding"],
  ["/settings", "Settings"],
];
export function WorkspaceNavigation() {
  const path = usePathname();
  return (
    <nav aria-label="Main navigation">
      {pages.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={
            path === href || path.startsWith(`${href}/`) ? "page" : undefined
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
