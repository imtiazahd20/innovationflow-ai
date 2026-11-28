import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";

// Every page under /dashboard gets the module navigation. The nav reads the current address,
// so it sits behind <Suspense> with a same-height placeholder to avoid the page jumping.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <>
      <Suspense fallback={<div aria-hidden className="h-[52px] border-b-4 border-flow-ink bg-flow-cream" />}>
        <AppNav />
      </Suspense>
      {children}
    </>
  );
}
