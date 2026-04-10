"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ReactNode } from "react";

const tabs = ["Overview", "Personal", "Business"] as const;
export type DashboardTab = (typeof tabs)[number];

interface TabBarProps {
  readonly defaultTab?: DashboardTab;
  readonly children?: Partial<Record<DashboardTab, ReactNode>>;
}

export function TabBar({ defaultTab = "Overview", children }: TabBarProps) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList
        variant="default"
        className="w-full justify-center gap-0"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab}
            value={tab}
            className="flex-1 font-mono text-[11px] font-semibold uppercase tracking-wider"
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
