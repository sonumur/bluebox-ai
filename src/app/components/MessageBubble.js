import ReactMarkdown from 'react-markdown';
import { memo } from 'react';
import { motion } from 'framer-motion';

function MessageBubble({ role, content, isTyping }) {
  const isUser = role === "user";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[92%] md:max-w-[85%] transition-all 
        ${isUser
            ? "bg-white/80 backdrop-blur-xl text-slate-800 px-4 py-3 md:px-5 md:py-3.5 rounded-[1.5rem] rounded-br-sm shadow-md border border-white/60"
            : "bg-transparent text-slate-800 px-0 md:px-2 py-2"
          }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-[#4d6bfe]/10 rounded-md flex items-center justify-center p-1">
              <img src="/logo.svg" alt="Bluebox" className="w-full h-full" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Bluebox-V1</span>
          </div>
        )}

        <div className="prose prose-sm max-w-none text-[14px] md:text-[15px] leading-relaxed">
          {typeof content === 'string' ? (
            <ReactMarkdown
              components={{
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                p: ({ node, ...props }) => <p className="mb-3 last:mb-0 font-medium" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                pre: ({ node, ...props }) => <pre className="bg-slate-50 border border-slate-200 p-4 rounded-2xl overflow-x-auto mb-3 text-[13px] shadow-sm" {...props} />,
                code: ({ node, inline, ...props }) => (
                  inline
                    ? <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md text-xs font-semibold border border-indigo-100" {...props} />
                    : <code className="block text-xs font-mono text-slate-800" {...props} />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <>
              {content.image && (
                <div className="relative group mb-2">
                  <img
                    src={content.image}
                    alt="User Upload"
                    className="rounded-2xl max-w-[200px] shadow-md border border-gray-100 object-cover"
                  />
                </div>
              )}
              {content.text && (
                <div className="mt-2">
                  <ReactMarkdown
                    components={{
                      ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3" {...props} />,
                      li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                      p: ({ node, ...props }) => <p className="mb-3 last:mb-0 font-medium" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                      pre: ({ node, ...props }) => <pre className="bg-slate-50 border border-slate-200 p-4 rounded-2xl overflow-x-auto mb-3 text-[13px] shadow-sm" {...props} />,
                      code: ({ node, inline, ...props }) => (
                        inline
                          ? <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md text-xs font-semibold border border-indigo-100" {...props} />
                          : <code className="block text-xs font-mono text-slate-800" {...props} />
                      ),
                    }}
                  >
                    {content.text}
                  </ReactMarkdown>
                </div>
              )}
              {/* Fallback for legacy objects */}
              {!content.image && !content.text && typeof content === 'object' && (
                <div className="relative group">
                  <img
                    src={content}
                    alt="Attachment"
                    className="rounded-2xl max-w-[200px] shadow-md border border-gray-100 object-cover"
                  />
                </div>
              )}
            </>
          )}
          {isTyping && (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(MessageBubble);
