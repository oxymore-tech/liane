import type { MDXComponents } from "mdx/types";

// mdx-components.tsx is required to use MDX with App Router
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: props => (
      <div className="pb-2">
        <span className="text-xl font-bold" {...props}></span>
      </div>
    ),
    h2: props => <div className="text-lg font-bold pt-4" {...props}></div>,
    h3: props => <strong {...props}></strong>,
    code: props => <span className="font-mono text-blue-300 font-bold" {...props}></span>,
    ul: props => <ul style={{ listStyle: "initial" }} className="p-4" {...props}></ul>,
    ...components
  };
}
