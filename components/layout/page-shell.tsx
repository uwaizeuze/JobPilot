"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { FoundationNotice } from "@/components/layout/foundation-notice";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="space-y-6"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      <FoundationNotice />
      {children}
    </motion.div>
  );
}
