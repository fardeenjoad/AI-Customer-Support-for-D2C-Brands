"use client";

import React, { useRef, useState } from "react";
import { Paperclip, Send, X, FileCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void>;
  onUploadFile?: (file: File) => Promise<void>;
  isSending?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  onUploadFile,
  isSending = false,
  placeholder = "Reply to customer...",
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    try {
      if (file && onUploadFile) {
        setIsUploading(true);
        await onUploadFile(file);
        setFile(null);
        setIsUploading(false);
      }
      if (content.trim()) {
        await onSendMessage(content);
        setContent("");
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Failed to send message/file", error);
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-border bg-surface/80 backdrop-blur-md rounded-xl p-3 shadow-lg flex flex-col space-y-2.5">
      {file && (
        <div className="flex items-center justify-between bg-surface/50 border border-border/80 rounded-lg p-2.5 max-w-sm animate-fadeIn">
          <div className="flex items-center space-x-2 text-xs text-text-primary">
            <FileCheck className="h-4 w-4 text-accent animate-pulse" />
            <span className="font-semibold truncate max-w-[200px]">{file.name}</span>
            <span className="text-[10px] text-text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end space-x-3">
        {onUploadFile && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSending || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 p-0 text-text-muted hover:text-text-primary hover:bg-surface/50"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              ) : (
                <Paperclip className="h-4.5 w-4.5" />
              )}
            </Button>
          </>
        )}

        <div className="flex-grow flex items-center border border-gray-200 rounded-xl bg-white dark:bg-[#1d1f2d] p-1.5 focus-within:ring-1 focus-within:ring-indigo-500 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent border-0 resize-none text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-0 max-h-[120px] py-2.5 px-3 outline-none"
          />

          <Button
            type="submit"
            disabled={(!content.trim() && !file) || isSending || isUploading}
            isLoading={isSending}
            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center space-x-1.5 transition-colors duration-150 border-0 shrink-0 shadow-sm"
          >
            <span>Send</span>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </form>
  );
}
