"use client";

import { Button } from "@/components/ui/button";
import UserDropdown from "@/components/user-dropdown";

export default function Page() {
  // Helper function to create iMessage deep link
  function createiMessageDeepLink(): void {
    const recipient = "sandbox.loopmessage.com@imsg.im";
    const message = "im done, lets start";
    const encodedMessage = encodeURIComponent(message);
    const deepLink = `imessage://compose?recipient=${recipient}&body=${encodedMessage}`;

    window.location.href = deepLink;
  }

  return (
    <div className="flex h-screen w-full flex-col">
      <div className="mx-auto mt-20 flex min-h-[60%] w-full max-w-lg flex-col items-center justify-between rounded-2xl border border-dashed p-4">
        <div className="flex w-full justify-between px-5 py-3">
          <div className="font-serif italic">Jym Logo</div>
          <UserDropdown />
        </div>
        <div className="my-10 flex flex-col gap-6">
          <h1 className="font-serif text-4xl">Welcome to Jym</h1>
          <Button
            onClick={() => {
              // Create iMessage deep link with pre-filled message
              createiMessageDeepLink();
            }}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
