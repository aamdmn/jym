"use client";

import {
  IconActivity,
  IconHome,
  IconHomeFilled,
  IconSettings,
  IconSettingsFilled,
} from "@tabler/icons-react";
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
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      return "home";
    }
    if (pathname.startsWith("/dashboard/workouts")) {
      return "workouts";
    }
    if (pathname.startsWith("/dashboard/progress")) {
      return "progress";
    }
    if (pathname.startsWith("/dashboard/settings")) {
      return "settings";
    }

    return "home";
  };

  const activeTab = getActiveTab();

  // Handle tab changes with navigation
  const handleTabChange = (value: string) => {
    switch (value) {
      case "home":
        router.push("/dashboard");
        break;
      case "workouts":
        router.push("/dashboard/workouts");
        break;
      case "progress":
        router.push("/dashboard/progress");
        break;
      case "settings":
        router.push("/dashboard/settings");
        break;
      default:
        router.push("/dashboard");
    }
  };

  return (
    <Tabs className="w-full" onValueChange={handleTabChange} value={activeTab}>
      <TabsList className="flex w-full items-center justify-center gap-1 bg-background p-1 shadow-lg">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-full py-3 transition-all",
                  activeTab === "home"
                    ? "bg-primary/10 px-4 text-primary"
                    : "px-3 hover:bg-muted"
                )}
                value="home"
              >
                {activeTab === "home" ? (
                  <IconHomeFilled className="size-6 shrink-0 stroke-none" />
                ) : (
                  <IconHome className="size-6 shrink-0" />
                )}
                {activeTab === "home" && (
                  <span className="font-medium text-sm">Home</span>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            {activeTab !== "home" && (
              <TooltipContent>
                <p>Home</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-full py-3 transition-all",
                  activeTab === "workouts"
                    ? "bg-primary/10 px-4 text-primary"
                    : "px-3 hover:bg-muted"
                )}
                value="workouts"
              >
                <IconActivity className="size-6 shrink-0" />
                {activeTab === "workouts" && (
                  <span className="font-medium text-sm">Workouts</span>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            {activeTab !== "workouts" && (
              <TooltipContent>
                <p>Workouts</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-full py-3 transition-all",
                  activeTab === "settings"
                    ? "bg-primary/10 px-4 text-primary"
                    : "px-3 hover:bg-muted"
                )}
                value="settings"
              >
                {activeTab === "settings" ? (
                  <IconSettingsFilled className="size-6 shrink-0" />
                ) : (
                  <IconSettings className="size-6 shrink-0" />
                )}
                {activeTab === "settings" && (
                  <span className="font-medium text-sm">Settings</span>
                )}
              </TabsTrigger>
            </TooltipTrigger>
            {activeTab !== "settings" && (
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </TabsList>
    </Tabs>
  );
}
