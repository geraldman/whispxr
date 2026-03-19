import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface MessageProps {
  messageText: string;
  from: "send" | "receive";
}

function renderBoldMarkdown(text: string) {
  const nodes: ReactNode[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null = boldPattern.exec(text);
  let key = 0;

  while (match) {
    const fullMatch = match[0];
    const boldText = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    if (startIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, startIndex));
    }

    nodes.push(
      <strong key={`bold-${key}`} className="font-semibold">
        {boldText}
      </strong>
    );

    lastIndex = endIndex;
    key += 1;
    match = boldPattern.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export default function MessageComponent({
  messageText,
  from,
}: MessageProps) {
  return (
    <div
      className={`flex ${
        from === "send" ? "justify-end" : "justify-start"
      }`}
    >
      <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`
          px-3 md:px-4 py-2 md:py-2.5 rounded-2xl 
          max-w-[85%] sm:max-w-[75%] md:max-w-[70%]
          text-sm leading-relaxed
          shadow-sm
          break-words
          ${
            from === "send"
              ? "bg-[#7A573A] text-white rounded-br-md"
              : "bg-[#FFFCF6] text-[#2B1B12] border border-black/5 rounded-bl-md"
          }
        `}
      >
        {renderBoldMarkdown(messageText)}
      </motion.div>
    </AnimatePresence>
    </div>
  );
}
