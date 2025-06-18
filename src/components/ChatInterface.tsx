import React, { useState, useRef, useEffect } from 'react';
import { DocumentTextIcon, PresentationChartLineIcon, BookOpenIcon, SunIcon, MoonIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useWebSocket } from '../services/WebSocketService';
import ConnectionStatusToast from './ConnectionStatusToast';
import { useTheme } from '../context/ThemeContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  file?: {
    name: string;
    type: string;
    size: number;
    url?: string;
  };
}

interface FilePreview {
  name: string;
  type: string;
  size: number;
  preview: ArrayBuffer;
}

type Mode = 'PPT更新' | '教案编写' | '教材拷问';

const modeOptions: { label: Mode; icon: React.ReactNode; description: string }[] = [
  { 
    label: 'PPT更新', 
    icon: <PresentationChartLineIcon className="w-5 h-5" />,
    description: '智能更新PPT内容，保持格式统一'
  },
  { 
    label: '教案编写', 
    icon: <DocumentTextIcon className="w-5 h-5" />,
    description: '辅助编写教学教案，提供专业建议'
  },
  { 
    label: '教材拷问', 
    icon: <BookOpenIcon className="w-5 h-5" />,
    description: '深入解析教材内容，解答教学疑问'
  },
];

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<Mode>('PPT更新');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FilePreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { wsService, status } = useWebSocket(mode);
  const { theme, toggleTheme } = useTheme();

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理模式切换
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
  };

  // 处理回车发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理WebSocket消息
  useEffect(() => {
    const handleMessage = (data: any) => {
      console.log('收到后端响应:', data);
      
      if (data.type === 'welcome') {
        setIsLoading(false);
        const welcomeMessage: Message = {
          id: Date.now(),
          text: data.content,
          isUser: false,
        };
        setMessages(prev => [...prev, welcomeMessage]);
      } else if (data.status === 'error') {
        setIsLoading(false);
        const newMessage: Message = {
          id: Date.now(),
          text: `错误: ${data.message}`,
          isUser: false,
        };
        setMessages(prev => [...prev, newMessage]);
      } else if (data.status === 'success') {
        setIsLoading(false);
        let responseText = '';
        if (data.type === 'file') {
          responseText = `文件上传成功: ${data.filename}`;
        } else {
          responseText = data.message;
        }
        const newMessage: Message = {
          id: Date.now(),
          text: responseText,
          isUser: false,
        };
        setMessages(prev => [...prev, newMessage]);
      } else if (data.message) {
        setIsLoading(false);
        const newMessage: Message = {
          id: Date.now(),
          text: data.message,
          isUser: false,
        };
        setMessages(prev => [...prev, newMessage]);
      } else {
        setIsLoading(false);
        const newMessage: Message = {
          id: Date.now(),
          text: JSON.stringify(data),
          isUser: false,
        };
        setMessages(prev => [...prev, newMessage]);
      }
    };

    const removeHandler = wsService.addMessageHandler(handleMessage);
    return () => {
      removeHandler();
    };
  }, []);

  // 发送消息
  const handleSend = async () => {
    if (!inputText.trim() && !selectedFile) return;

    setIsLoading(true);
    
    // 添加用户消息到本地
    const userMessage: Message = {
      id: Date.now(),
      text: inputText,
      isUser: true,
      file: selectedFile ? {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      } : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    const messageData = {
      text: inputText,
      file: selectedFile ? {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        data: selectedFile.preview
      } : null
    };

    try {
      await wsService.sendMessage(mode, messageData);
      // 注意：这里不设置 setIsLoading(false)，因为我们需要等待后端响应
      // 后端响应会在 handleMessage 中处理并关闭加载状态
    } catch (error) {
      console.error('发送消息失败:', error);
      setIsLoading(false);
      const errorMessage: Message = {
        id: Date.now(),
        text: '发送消息失败，请重试',
        isUser: false
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setInputText('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'image/png', // .png
      'text/plain', // .txt
      'application/msword', // .doc
      'application/pdf', // .pdf
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ];
    if (!allowedTypes.includes(file.type)) {
      alert('不支持的文件类型！请上传 PNG、DOC、DOCX、PDF、PPT、PPTX 或 TXT 文件。');
      return;
    }

    // 检查文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB！');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result instanceof ArrayBuffer) {
        setSelectedFile({
          name: file.name,
          type: file.type,
          size: file.size,
          preview: result
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 移除选中的文件
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-[1100px] bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-lg relative transition-colors duration-200 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        {/* 渐变背景 */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1)_0%,_transparent_50%)]"></div>
        
        {/* 装饰性书本图案 */}
        <div className="absolute top-10 right-10 w-32 h-40 transform rotate-12 opacity-10">
          <div className="w-full h-full bg-blue-400 rounded-lg shadow-lg"></div>
          <div className="absolute top-2 left-2 w-4 h-4 bg-white/20 rounded"></div>
          <div className="absolute top-2 left-8 w-4 h-4 bg-white/20 rounded"></div>
          <div className="absolute top-8 left-2 w-24 h-0.5 bg-white/20"></div>
          <div className="absolute top-12 left-2 w-24 h-0.5 bg-white/20"></div>
          <div className="absolute top-16 left-2 w-24 h-0.5 bg-white/20"></div>
        </div>
        
        <div className="absolute bottom-20 left-10 w-24 h-32 transform -rotate-12 opacity-10">
          <div className="w-full h-full bg-purple-400 rounded-lg shadow-lg"></div>
          <div className="absolute top-2 left-2 w-4 h-4 bg-white/20 rounded"></div>
          <div className="absolute top-2 left-8 w-4 h-4 bg-white/20 rounded"></div>
          <div className="absolute top-8 left-2 w-16 h-0.5 bg-white/20"></div>
          <div className="absolute top-12 left-2 w-16 h-0.5 bg-white/20"></div>
        </div>
        
        <div className="absolute top-1/3 left-1/4 w-28 h-36 transform rotate-6 opacity-10">
          <div className="w-full h-full bg-pink-400 rounded-lg shadow-lg"></div>
          <div className="absolute top-2 left-2 w-4 h-4 bg-white/20 rounded"></div>
          <div className="absolute top-2 left-8 w-4 h-4 bg-white/20 rounded"></div>
          <div className="absolute top-8 left-2 w-20 h-0.5 bg-white/20"></div>
          <div className="absolute top-12 left-2 w-20 h-0.5 bg-white/20"></div>
          <div className="absolute top-16 left-2 w-20 h-0.5 bg-white/20"></div>
        </div>

        {/* 动态模糊效果 */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* 顶部工具栏 */}
      <div className="px-4 pt-4 pb-2 flex justify-end items-center border-b border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm relative z-10">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors backdrop-blur-sm"
        >
          {theme === 'light' ? (
            <MoonIcon className="w-5 h-5" />
          ) : (
            <SunIcon className="w-5 h-5" />
          )}
        </button>
      </div>

     {/* 聊天内容区 */}
     <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 relative z-10
        scrollbar-thin 
        scrollbar-track-transparent
        scrollbar-thumb-blue-200/50 
        dark:scrollbar-thumb-blue-800/50
        hover:scrollbar-thumb-blue-300/50 
        dark:hover:scrollbar-thumb-blue-700/50
        scrollbar-thumb-rounded-full
        scrollbar-track-rounded-full
        scrollbar-w-1.5
        hover:scrollbar-w-2
        transition-all
        duration-300
        ease-in-out"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 select-none">
            开始对话吧...
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-md text-base break-words whitespace-pre-line backdrop-blur-sm ${
                  message.isUser
                    ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-md'
                    : 'bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 rounded-bl-md border border-gray-200/50 dark:border-gray-600/50'
                }`}
              >
                {message.isUser ? (
                  message.text
                ) : (
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // 自定义代码块样式
                        code({ node, inline, className, children, ...props }) {
                          return (
                            <code
                              className={`${className} ${
                                inline
                                  ? 'bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm'
                                  : 'block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg my-2 overflow-x-auto'
                              }`}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        // 自定义表格样式
                        table({ children }) {
                          return (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                {children}
                              </table>
                            </div>
                          );
                        },
                        // 自定义链接样式
                        a({ href, children }) {
                          return (
                            <a
                              href={href}
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          );
                        },
                        // 自定义图片样式
                        img({ src, alt }) {
                          return (
                            <img
                              src={src}
                              alt={alt}
                              className="max-w-full h-auto rounded-lg my-2"
                            />
                          );
                        },
                        // 自定义引用块样式
                        blockquote({ children }) {
                          return (
                            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic">
                              {children}
                            </blockquote>
                          );
                        },
                        // 自定义列表样式
                        ul({ children }) {
                          return (
                            <ul className="list-disc list-inside my-4 space-y-2">
                              {children}
                            </ul>
                          );
                        },
                        ol({ children }) {
                          return (
                            <ol className="list-decimal list-inside my-4 space-y-2">
                              {children}
                            </ol>
                          );
                        },
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                )}
                {message.file && (
                  <div className="mt-2 p-2 bg-white/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <PaperClipIcon className="w-4 h-4" />
                      <span className="text-sm truncate">{message.file.name}</span>
                      <span className="text-xs opacity-75">
                        ({(message.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    {message.file.type.startsWith('image/') && (
                      <img
                        src={message.file.url}
                        alt={message.file.name}
                        className="mt-2 max-w-full rounded-lg"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] px-4 py-3 rounded-2xl shadow-md text-base bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 rounded-bl-md border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区和按钮区 */}
      <div className="w-full bg-white/50 dark:bg-gray-900/50 border-t border-gray-200/50 dark:border-gray-700/50 px-4 pt-4 pb-2 sticky bottom-0 z-10 transition-colors duration-200 backdrop-blur-sm">
        {/* 文件预览区 */}
        {selectedFile && (
          <div className="mb-2 p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <PaperClipIcon className="w-5 h-5 text-gray-500" />
              <span className="text-sm truncate">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <div className="flex-1 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 transition-colors backdrop-blur-sm"
            >
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border border-gray-300/50 dark:border-gray-600/50 rounded-xl p-3 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm transition-colors min-h-[80px] backdrop-blur-sm"
              placeholder="输入您的问题..."
              rows={2}
              style={{ maxHeight: 120 }}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSend}
            className={`h-[80px] px-6 rounded-xl shadow-md font-semibold transition-colors backdrop-blur-sm ${
              isLoading
                ? 'bg-gray-300/50 dark:bg-gray-600/50 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white'
            }`}
            disabled={isLoading}
          >
            发送
          </button>
        </div>
        {/* 功能描述区 */}
        <div className="flex gap-4 mt-3 justify-center">
          {modeOptions.map((opt) => (
            <div
              key={opt.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/50 dark:bg-gray-800/50 text-blue-600 dark:text-blue-400 text-sm backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50"
            >
              {opt.icon}
              <span>{opt.description}</span>
            </div>
          ))}
        </div>
      </div>
      {/* 右下角连接状态弹窗 */}
      <ConnectionStatusToast show={status !== 'connected'} text="未连接后端服务" />
    </div>
  );
};

export default ChatInterface;