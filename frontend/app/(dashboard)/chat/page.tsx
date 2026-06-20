import { Suspense } from "react";
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  return (
    <Suspense>
      <ChatWindow />
    </Suspense>
  );
}
