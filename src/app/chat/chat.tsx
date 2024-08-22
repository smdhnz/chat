"use client";

import { useRef, useEffect, useState, type KeyboardEvent } from "react";
import { SettingsIcon, CircleUserIcon, SparklesIcon } from "lucide-react";
import OpenAI from "openai";
import cuid from "cuid";

import { useLocalStorage } from "@/lib/use-local-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Markdown } from "./markdown";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function Chat() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [apiKey, setApiKey] = useLocalStorage<string>("apiKey", "");
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openai, setOpenai] = useState<OpenAI | null>(null);

  async function handleSend() {
    if (isLoading || input.trim() === "" || !openai) return;

    setIsLoading(true);

    const newMessages: Message[] = [
      ...messages,
      {
        id: cuid(),
        role: "user",
        content: input,
      },
      {
        id: cuid(),
        role: "assistant",
        content: "",
      },
    ];

    setInput("");
    setMessages(newMessages);

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: newMessages.slice(0, -1),
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";

      setMessages((prev) => {
        return [
          ...prev.slice(0, -1),
          {
            ...prev[prev.length - 1],
            content: prev[prev.length - 1].content + content,
          },
        ];
      });
    }

    setIsLoading(false);
  }

  async function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  }

  function handleClickTextarea() {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [messages]);

  useEffect(() => {
    setOpenai(new OpenAI({ apiKey, dangerouslyAllowBrowser: true }));
  }, [apiKey]);

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
              <Label>API key</Label>
              <Input
                className="bg-[#212121] border border-zinc-600"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.currentTarget.value)}
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

        <div className="w-full flex flex-col items-center mb-8 px-4">
          <div
            className="flex items-center rounded-xl border border-zinc-600 cursor-text max-w-[700px] w-full px-5 py-4"
            onClick={handleClickTextarea}
          >
            <div className="flex items-center max-h-[50vh] overflow-y-auto w-full">
              <textarea
                ref={textareaRef}
                placeholder="メッセージを入力"
                rows={1}
                className="resize-none bg-[#212121] focus:outline-none"
                /* @ts-ignore */
                style={{ fieldSizing: "content" }}
                onKeyDown={handleKeyDown}
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                autoFocus
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
