type Props = {
  className?: string;
};

export default function Skeleton({ className = "" }: Props) {
  return <span className={`skeleton${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}
