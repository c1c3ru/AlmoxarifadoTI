export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return "Há menos de 1 hora";
  if (diffInHours === 1) return "Há 1 hora";
  return `Há ${diffInHours} horas`;
}

export function getMovementTypeColor(type: string): string {
  return type === "entrada"
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : "bg-red-100 text-red-800 border-red-200";
}

export function getMovementTypeLabel(type: string): string {
  return type === "entrada" ? "Entrada" : "Saída";
}

export function getMovementIcon(type: string): string {
  return type === "entrada" ? "fa-solid fa-arrow-down" : "fa-solid fa-arrow-up";
}
