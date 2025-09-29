"use client";

import { ActivityIcon, SettingsIcon, TrendingUpIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function TabsNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab based on current pathname
  const getActiveTab = () => {
    if (pathname === "/app" || pathname === "/app/") {
      return "home";
    }
    if (pathname.startsWith("/app/workouts")) {
      return "workouts";
    }
    if (pathname.startsWith("/app/progress")) {
      return "progress";
    }
    if (pathname.startsWith("/app/settings")) {
      return "settings";
    }
    return "home";
  };

  const activeTab = getActiveTab();

  // Handle tab changes with navigation
  const handleTabChange = (value: string) => {
    switch (value) {
      case "home":
        router.push("/app");
        break;
      case "workouts":
        router.push("/app/workouts");
        break;
      case "progress":
        router.push("/app/progress");
        break;
      case "settings":
        router.push("/app/settings");
        break;
      default:
        router.push("/app");
    }
  };

  const getTabClass = (
    tabValue: string,
    position: "first" | "middle" | "last"
  ) => {
    return cn(
      "flex items-center justify-center py-3 transition-colors",
      position === "first" && "rounded-s-full",
      position === "last" && "rounded-e-full",
      activeTab === tabValue ? "bg-primary/10 text-primary" : "hover:bg-muted"
    );
  };

  return (
    <Tabs className="w-full" onValueChange={handleTabChange} value={activeTab}>
      <TabsList className="grid w-full grid-cols-4 border-2 border-gray-400 border-dashed bg-background p-1 shadow-lg">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger
                className={getTabClass("home", "first")}
                value="home"
              >
                <TrendingUpIcon size={20} />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Home</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger
                className={getTabClass("workouts", "middle")}
                value="workouts"
              >
                <ActivityIcon size={20} />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Workouts</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger
                className={getTabClass("progress", "middle")}
                value="progress"
              >
                <TrendingUpIcon size={20} />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Progress</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger
                className={getTabClass("settings", "last")}
                value="settings"
              >
                <SettingsIcon size={20} />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TabsList>
    </Tabs>
  );
}
