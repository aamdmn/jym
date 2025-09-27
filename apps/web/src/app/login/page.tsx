import PhoneInputComponent from "@/components/phone-input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="font-bold text-2xl">Login</h1>
      <form className="flex flex-col gap-4">
        <PhoneInputComponent />
        <Button type="submit">Next</Button>
      </form>
    </div>
  );
}
