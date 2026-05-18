type Props = {
  role: "ADMIN" | "EDITOR" | "VIEWER";
};

export default function RoleBadge({ role }: Props) {
  return <span className="role-badge">{role}</span>;
}
