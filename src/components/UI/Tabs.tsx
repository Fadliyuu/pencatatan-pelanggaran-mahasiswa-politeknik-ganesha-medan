"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  defaultValue?: string;
  className?: string;
  children: React.ReactNode;
}

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  activeTab?: string;
}

export function Tabs({ defaultValue, className, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div className={cn("w-full", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TabsList) {
          return React.cloneElement(child as any, {
            activeTab,
            setActiveTab,
          });
        }
        return child;
      })}
    </div>
  );
}

export function TabsList(props: TabsListProps & { activeTab?: string; setActiveTab?: (value: string) => void }) {
  const { className, children, activeTab, setActiveTab } = props;
  return (
    <div className={cn("flex space-x-1 rounded-lg bg-gray-100 p-1", className)}>
      {React.Children.map(children, (child) => {
        if (
          React.isValidElement(child) &&
          (child.type === TabsTrigger || child.type === TabsContent)
        ) {
          return React.cloneElement(child as any, {
            activeTab,
            setActiveTab,
          });
        }
        return child;
      })}
    </div>
  );
}

export function TabsTrigger({ value, className, children, activeTab, setActiveTab, onClick }: TabsTriggerProps & { activeTab?: string; setActiveTab?: (value: string) => void }) {
  const isActive = activeTab === value;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-900",
        className
      )}
      onClick={() => {
        setActiveTab?.(value);
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children, activeTab }: TabsContentProps & { activeTab?: string }) {
  if (value !== activeTab) return null;

  return (
    <div
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </div>
  );
} 