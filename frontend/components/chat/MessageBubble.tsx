import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  historyUsed?: boolean;
  historyCount?: number;
};

export default function MessageBubble({ role, text, streaming, historyUsed, historyCount }: Props) {
  return (
    <div className={`message-row ${role}`}>
      <div className={`message-bubble ${role}`}>
        {role === "assistant" ? (
          <div className="message-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || "\u200b"}</ReactMarkdown>
            {streaming && <span className="streaming-cursor" aria-hidden="true" />}
          </div>
        ) : (
          <p className="message-text">{text}</p>
        )}

        {role === "assistant" && historyUsed ? (
          <span
            className="history-context-badge"
            title={`Informed by ${historyCount ?? ""} similar answer${historyCount !== 1 ? "s" : ""} from your past sessions`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 8v4l2.5 2.5M20.49 9A9 9 0 1 0 21 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Informed by your chat history
          </span>
        ) : null}
      </div>
    </div>
  );
}
