import { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  loading,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`button-primary ${className}`}
    >
      {loading ? "..." : children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`panel ${className}`}>{children}</div>;
}

export function Notice({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="status-message status-error">{children}</p>;
}
