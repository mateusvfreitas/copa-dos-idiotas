import { flagUrl } from "@/lib/flags";

export function TeamFlag({
  code,
  emoji,
  size = 24,
  className = "",
}: {
  code?: string | null;
  emoji?: string | null;
  size?: number;
  className?: string;
}) {
  const url = flagUrl(code, size <= 20 ? 20 : size <= 40 ? 40 : size <= 80 ? 80 : 160);
  if (!url) {
    return (
      <span className={`inline-block leading-none ${className}`} style={{ fontSize: size }}>
        {emoji ?? "🏳️"}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={code ?? "flag"}
      width={size}
      height={Math.round((size * 3) / 4)}
      loading="lazy"
      className={`inline-block rounded-sm shadow-sm ring-1 ring-black/10 object-cover ${className}`}
      style={{ width: size, height: Math.round((size * 3) / 4) }}
    />
  );
}