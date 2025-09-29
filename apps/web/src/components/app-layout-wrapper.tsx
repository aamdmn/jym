"use client";

import Logo from "@/components/icons/logo";
import TabsNavbar from "@/components/tabs-navbar";
import UserDropdown from "@/components/user-dropdown";

export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center">
      <div className="mt-14">
        <TabsNavbar />
      </div>
      <div className="mx-auto mt-8 mb-20 flex min-h-[60%] w-full max-w-xl flex-col rounded-2xl border-2 border-gray-400 border-dashed px-6 py-4">
        <div className="flex w-full justify-between py-3">
          <Logo className="h-8" theme="monochrome" />
          <UserDropdown />
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
