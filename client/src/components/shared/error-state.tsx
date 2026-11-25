import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function ErrorState({ message = "Não foi possível carregar os dados.", onRetry, isRetrying = false }: ErrorStateProps) {
  return (
    <div role="alert" className="min-w-0 rounded-lg border border-destructive/30 bg-card p-4 sm:p-6 space-y-3">
      <p className="font-semibold text-destructive">{message}</p>
      <p className="text-sm text-muted-foreground">Verifique a conexão e tente novamente.</p>
      <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
        <i aria-hidden="true" className={isRetrying ? "fas fa-spinner fa-spin" : "fas fa-arrow-rotate-right"} />
        {isRetrying ? "Tentando novamente…" : "Tentar novamente"}
      </Button>
    </div>
  );
}
