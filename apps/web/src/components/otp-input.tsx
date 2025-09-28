"use client";

import { OTPInput, type SlotProps } from "input-otp";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type OTPInputComponentProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export default function OTPInputComponent({
  value,
  onChange,
  maxLength = 6,
  label = "Verification Code",
  disabled = false,
  className,
}: OTPInputComponentProps) {
  const id = useId();

  return (
    <div className={cn("*:not-first:mt-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <OTPInput
        containerClassName="flex items-center gap-3 has-disabled:opacity-50"
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        onChange={onChange}
        render={({ slots }) => (
          <div className="flex gap-2">
            {slots.map((slot, idx) => (
              <Slot key={idx} {...slot} />
            ))}
          </div>
        )}
        value={value}
      />
    </div>
  );
}

function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        "flex size-12 items-center justify-center rounded-md border border-input bg-background font-medium text-foreground text-lg shadow-xs transition-[color,box-shadow]",
        { "z-10 border-ring ring-[3px] ring-ring/50": props.isActive }
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
      {props.hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
}
