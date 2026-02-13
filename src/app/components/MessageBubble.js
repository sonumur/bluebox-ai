import ReactMarkdown from 'react-markdown';
import { memo } from 'react';

function MessageBubble({ role, content, isTyping }) {
  const isUser = role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl transition-all 
        ${isUser
            ? "bg-[#f4f4f4] text-gray-800 px-4 py-2.5 rounded-br-none shadow-sm"
            : "bg-transparent text-gray-800 px-0 py-2"
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

        <div className="prose prose-sm max-w-none text-[15px] leading-relaxed">
          {typeof content === 'string' ? (
            <ReactMarkdown
              components={{
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                pre: ({ node, ...props }) => <pre className="bg-gray-50 border border-gray-100 p-3 rounded-xl overflow-x-auto mb-3 text-sm" {...props} />,
                code: ({ node, inline, ...props }) => (
                  inline
                    ? <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-medium" {...props} />
                    : <code className="block text-xs font-mono" {...props} />
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
                      p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                      pre: ({ node, ...props }) => <pre className="bg-gray-50 border border-gray-100 p-3 rounded-xl overflow-x-auto mb-3 text-sm" {...props} />,
                      code: ({ node, inline, ...props }) => (
                        inline
                          ? <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-medium" {...props} />
                          : <code className="block text-xs font-mono" {...props} />
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
              <div className="w-1.5 h-1.5 bg-[#4d6bfe] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-[#4d6bfe] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-[#4d6bfe] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(MessageBubble);
