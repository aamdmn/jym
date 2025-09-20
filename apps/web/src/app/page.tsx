import { IconBrandTelegram, IconDice2Filled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen justify-center font-sans">
      <main className="flex w-full max-w-4xl flex-col items-start p-4">
        <div className="mt-10 flex items-center justify-center gap-2">
          <IconDice2Filled className="size-7 stroke-[1.3px]" />
          <span className="font-light text-2xl uppercase">jym</span>
        </div>

        <div className="mt-36 flex w-full flex-col items-start justify-center gap-2">
          <h1 className="max-w-xl text-start font-regular font-serif text-6xl leading-tight tracking-tight">
            Adaptive Fitness Coach That Actually Listens
          </h1>

          <Button className="mt-8" size={"lg"} variant="outline">
            <IconBrandTelegram className="size-5 stroke-[1.3px]" />
            Get Started
          </Button>
        </div>
      </main>
    </div>
  );
}
