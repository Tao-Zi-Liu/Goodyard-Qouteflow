
"use client";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { useI18n } from "@/hooks/use-i18n";
import { useRouter } from "next/navigation";
import { Badge } from "./ui/badge";

export function NotificationBell() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { t } = useI18n();
  const router = useRouter();

  const handleNotificationClick = (notificationId: string, href?: string) => {
    markAsRead(notificationId);
    if (href) {
      router.push(href);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>{t("notifications")}</span>
          {unreadCount > 0 && (
            <Button variant="link" className="p-0 h-auto" onClick={() => markAllAsRead()}>
              <Check className="mr-1 h-3 w-3" />
              {t("mark_all_as_read")}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-center text-muted-foreground">{t("no_new_notifications")}</p>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => handleNotificationClick(n.id, n.href)}
                className={`flex flex-col items-start gap-1 p-3 ${!n.read ? "bg-accent/50" : ""}`}
              >
                <p className="font-semibold">{t(n.titleKey)}</p>
                <p className="text-xs text-muted-foreground">{t(n.bodyKey, n.bodyParams)}</p>
                <p className="text-xs text-muted-foreground/70">{new Date(n.createdAt).toLocaleString()}</p>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
