"use client";

import type { KeyboardEvent, ChangeEvent } from "react";
import { useRef, useEffect } from "react";
import { useChat } from "ai/react";
import {
  SettingsIcon,
  PaperclipIcon,
  ArrowUpIcon,
  LoaderIcon,
  CircleUserIcon,
  SparklesIcon,
} from "lucide-react";

import { useLocalStorage } from "@/lib/use-local-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { checkAuth } from "./server-actions";
import { Markdown } from "./markdown";

export function Chat() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [accessKey, setAccessKey] = useLocalStorage<string>("access_key", "");

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();

  async function handleSend() {
    if (await checkAuth(accessKey)) {
      handleSubmit();
    }
  }

  async function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.ctrlKey &&
      event.key === "Enter" &&
      !isLoading &&
      !(input.trim() === "")
    ) {
      event.preventDefault();
      await handleSend();
    }
  }

  function handleClickTextarea() {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  function handleAccessKeyChange(event: ChangeEvent<HTMLInputElement>) {
    setAccessKey(event.target.value);
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [messages]);

  return (
    <div className="min-h-screen flex bg-[#212121] relative">
      <div className="absolute top-4 left-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <SettingsIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="bg-[#212121] border-zinc-600">
            <div className="flex flex-col gap-4">
              <Label>Access Key</Label>
              <Input
                className="bg-[#212121] border border-zinc-600"
                type="password"
                value={accessKey}
                onChange={handleAccessKeyChange}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="grow flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto py-4">
          {messages.map((m) => (
            <div key={m.id} className="px-4 py-4">
              <div className="flex flex-1 gap-3 mx-auto max-w-[800px] px-5">
                <div className="relative">
                  {m.role === "user" ? <CircleUserIcon /> : <SparklesIcon />}
                </div>
                <div className="relative flex flex-col w-11/12">
                  <p className="font-bold">
                    {m.role === "user" ? "User" : "LLM"}
                  </p>
                  {m.role === "user" ? (
                    <Markdown markdown={m.content} />
                  ) : (
                    <Markdown markdown={m.content} />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="mx-auto max-w-[800px] w-full mb-8 bg-[#212121] px-3">
          <div
            className="w-full flex border border-zinc-600 rounded-xl items-end p-3 gap-3 h-full cursor-text"
            onClick={handleClickTextarea}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isLoading}
            >
              <PaperclipIcon />
            </Button>

            <div className="h-full flex items-center grow max-h-80 overflow-y-auto">
              <textarea
                ref={textareaRef}
                placeholder="メッセージを入力"
                rows={1}
                className="resize-none bg-[#212121] w-full focus:outline-none"
                /* @ts-ignore */
                style={{ fieldSizing: "content" }}
                onKeyDown={handleKeyDown}
                value={input}
                onChange={handleInputChange}
              />
            </div>

            <Button
              variant="default"
              size="icon"
              className="h-8 w-8"
              disabled={input.trim().length === 0 || isLoading}
              onClick={handleSubmit}
            >
              {isLoading ? <LoaderIcon /> : <ArrowUpIcon />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
