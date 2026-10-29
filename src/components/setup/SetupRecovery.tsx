import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

type SetupRecoveryProps = {
  onImport: (json: string) => Promise<boolean>;
};

export function SetupRecovery({ onImport }: SetupRecoveryProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "failed">("idle");

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const ok = await onImport(text);
      if (!ok) setStatus("failed");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="mb-2 text-center text-xl font-bold text-card-foreground sm:text-2xl">
          {t.recovery.heading}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {t.recovery.subtitle}
        </p>
        <Button type="button" className="h-11 w-full" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {t.recovery.chooseFileButton}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          aria-label={t.recovery.inputAriaLabel}
          className="sr-only"
          onChange={(event) => void onFile(event)}
        />
        {status === "failed" ? (
          <p role="alert" className="mt-4 text-center text-sm text-destructive">
            {t.recovery.failedMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
