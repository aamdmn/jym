"use client";

import { IconDice2Filled, IconLogin2, IconMessage } from "@tabler/icons-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  function createiMessageDeepLink(): void {
    const recipient = "sandbox.loopmessage.com@imsg.im";
    const message = "yo, what's up jym?";
    const encodedMessage = encodeURIComponent(message);
    const deepLink = `imessage://compose?recipient=${recipient}&body=${encodedMessage}`;

    window.location.href = deepLink;
  }

  return (
    <div className="flex min-h-screen justify-center font-sans">
      <main className="flex w-full max-w-4xl flex-col items-start space-y-8 p-4">
        <div className="mt-10 flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconDice2Filled className="size-7 stroke-[1.3px]" />
            <span className="font-light text-2xl uppercase">jym</span>
          </div>
          <div>
            <Link href="/login">
              <Button size={"sm"} variant="ghost">
                <IconLogin2 className="size-5 stroke-[1.3px]" />
                Login
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-32 flex w-full flex-col items-start justify-center gap-2">
          <h1 className="max-w-xl text-start font-regular font-serif text-6xl leading-tight tracking-tight">
            Adaptive Fitness Coach That Actually Listens
          </h1>

          <Button
            className="mt-8"
            onClick={() => {
              createiMessageDeepLink();
            }}
            size={"lg"}
            variant="default"
          >
            <IconMessage className="size-5 stroke-[1.3px]" />
            Get Started
          </Button>
        </div>
      </main>
    </div>
  );
}
