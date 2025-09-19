import { IconBrandTelegram, IconDice2Filled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen justify-center font-sans">
      <main className="flex w-full max-w-4xl flex-col items-start">
        <div className="mt-10 flex items-center justify-center gap-2">
          <IconDice2Filled className="size-7 stroke-[1.3px]" />
          <span className="font-light text-2xl uppercase">jym</span>
        </div>

        <div className="mt-36 flex w-full flex-col items-center justify-center gap-2">
          <h1 className="text-center font-medium text-6xl leading-tight tracking-tight">
            Adaptive Fitness Coach That Actually Listens
          </h1>

          <Button className="mt-8" size={"lg"} variant="outline">
            <IconBrandTelegram className="size-5" />
            Get Started
          </Button>
        </div>
      </main>
    </div>
  );
}
