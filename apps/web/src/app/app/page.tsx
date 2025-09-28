"use client";

import { useCustomer } from "autumn-js/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function Page() {
  const { customer } = useCustomer();

  console.log(customer);
  return (
    <div className="flex h-screen w-full flex-col">
      <div className="mx-auto mt-20 flex min-h-[60%] w-full max-w-lg flex-col items-center justify-between border p-4">
        <div className="flex w-full justify-between px-5 py-3">
          <div>Jym</div>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
        <div className="my-10 flex flex-col gap-6">
          <h1 className="font-serif text-4xl">Welcome to Jym</h1>
          <Button>Get Started</Button>
        </div>
      </div>
    </div>
  );
}
