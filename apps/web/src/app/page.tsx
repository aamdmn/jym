import { IconBrandTelegram, IconDice2Filled } from "@tabler/icons-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { AuthTest } from "../components/AuthTest";
import { PreloadedUserWrapper } from "../components/PreloadedUserWrapper";

export default function Home() {
  return (
    <div className="flex min-h-screen justify-center font-sans">
      <main className="flex w-full max-w-4xl flex-col items-start space-y-8 p-4">
        <div className="mt-10 flex items-center justify-center gap-2">
          <IconDice2Filled className="size-7 stroke-[1.3px]" />
          <span className="font-light text-2xl uppercase">jym</span>
        </div>

        <div className="flex w-full flex-col items-start justify-center gap-2">
          <h1 className="max-w-xl text-start font-regular font-serif text-6xl leading-tight tracking-tight">
            Adaptive Fitness Coach That Actually Listens
          </h1>

          <Button className="mt-8" size={"lg"} variant="outline">
            <IconBrandTelegram className="size-5 stroke-[1.3px]" />
            Get Started
          </Button>
        </div>

        {/* Authentication Test */}
        <div className="w-full space-y-4">
          <AuthTest />
        </div>

        {/* Server-side user data examples */}
        <div className="w-full space-y-4">
          <h2 className="font-semibold text-2xl">
            Server-Side User Data Examples
          </h2>

          {/* Approach 2: preloadQuery + usePreloadedQuery (server-rendered + reactive) */}
          <Suspense fallback={<div>Loading preloaded user profile...</div>}>
            <PreloadedUserWrapper />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
