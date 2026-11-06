import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function PinInput({
  value,
  onChange,
  autoFocus,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  onComplete?: (v: string) => void;
}) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={(v) => onChange(v.replace(/\D/g, ""))}
      onComplete={onComplete}
      inputMode="numeric"
      pattern="^[0-9]*$"
      autoFocus={autoFocus}
      containerClassName="w-full justify-center"
    >
      <InputOTPGroup className="flex w-full max-w-sm gap-1.5 xs:gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <InputOTPSlot
            key={i}
            index={i}
            className="h-14 w-auto min-w-0 flex-1 rounded-xl border bg-card text-2xl font-bold first:rounded-xl last:rounded-xl xs:h-16"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
