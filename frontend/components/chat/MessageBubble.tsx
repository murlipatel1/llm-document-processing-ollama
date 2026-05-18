type Props = {
  role: "user" | "assistant";
  text: string;
};

export default function MessageBubble({ role, text }: Props) {
  return (
    <div className={`message-row ${role}`}>
      <div className={`message-bubble ${role}`}>{text}</div>
    </div>
  );
}
