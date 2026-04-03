"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ReactNode } from "react";

const tabs = ["Personal", "Business"] as const;
export type DashboardTab = (typeof tabs)[number];

interface TabBarProps {
  readonly defaultTab?: DashboardTab;
  readonly children?: Record<DashboardTab, ReactNode>;
}

export function TabBar({ defaultTab = "Personal", children }: TabBarProps) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList
        variant="line"
        className="w-full justify-center gap-0 px-8"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab}
            value={tab}
            className="flex-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-tertiary data-active:text-text-primary"
          >
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>

      {children &&
        tabs.map((tab) => (
          <TabsContent key={tab} value={tab} className="pt-4">
            {children[tab]}
          </TabsContent>
        ))}
    </Tabs>
  );
}
