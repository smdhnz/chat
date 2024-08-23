import * as React from "react";
import Markdown_ from "markdown-to-jsx";
import hljs from "highlight.js";
import "highlight.js/styles/tokyo-night-dark.css";

type Props = {
  children: string;
};

export const Markdown = ({ children }: Props) => {
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (rootRef.current) {
      rootRef.current.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightBlock(block as HTMLElement);
      });
    }
  }, [children]);

  return (
    <div ref={rootRef}>
      <Markdown_
        options={{
          overrides: {
            h1: {
              component: "h1",
              props: {
                className:
                  "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
              },
            },
            h2: {
              component: "h2",
              props: {
                className:
                  "mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0",
              },
            },
            h3: {
              component: "h3",
              props: {
                className:
                  "mt-8 scroll-m-20 text-2xl font-semibold tracking-tight",
              },
            },
            p: {
              component: "p",
              props: {
                className: "leading-7 [&:not(:first-child)]:mt-6",
              },
            },
            blockquote: {
              component: "blockquote",
              props: {
                className: "mt-6 border-l-2 pl-6 italic",
              },
            },
            ul: {
              component: "ul",
              props: {
                className: "my-6 ml-8 list-disc [&>li]:mt-2",
              },
            },
            li: {
              component: "li",
              props: {
                className: "mt-2",
              },
            },
            table: {
              component: "table",
              props: {
                className: "w-full my-6 rounded-xl",
              },
            },
            th: {
              component: "th",
              props: {
                className:
                  "border px-2 py-1 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right",
              },
            },
            td: {
              component: "td",
              props: {
                className:
                  "border px-2 py-1 text-left text-sm [&[align=center]]:text-center [&[align=right]]:text-right",
              },
            },
            pre: {
              component: ({ children, ...props }) => (
                <pre
                  {...props}
                  className="overflow-x-auto my-5 p-2 bg-[#1A1B26] text-white rounded-xl"
                >
                  {React.Children.map(children, (child) =>
                    React.cloneElement(child, {
                      className: "bg-[#1A1B26] text-white",
                    }),
                  )}
                </pre>
              ),
            },
            code: {
              component: "code",
              props: {
                className: "bg-[#1A1B26] text-white rounded p-2",
              },
            },
          },
        }}
      >
        {children}
      </Markdown_>
    </div>
  );
};
