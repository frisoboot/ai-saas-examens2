import React from 'react';
import type { Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * Shared ReactMarkdown component overrides for consistent list and text styling.
 * Use these as the `components` prop on <ReactMarkdown>.
 */

/** Remark plugins that convert single newlines to <br> and parse math notation. */
export const examRemarkPlugins = [remarkBreaks, remarkMath];

/** Rehype plugins that render math notation with KaTeX. */
export const examRehypePlugins = [rehypeKatex];

/** Default markdown components for exam content (questions, context, section intros). */
export const examMarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
};

/** Compact markdown components for smaller UI areas (AI feedback, review cards). */
export const compactMarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
};
