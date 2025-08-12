
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import type { UserRole } from '@/lib/types';
import { useI18n } from '@/hooks/use-i18n';
import { LayoutDashboard, Users, Trash2, BarChart3 } from 'lucide-react';

interface MainNavProps {
    userRole: UserRole | undefined;
}

export function MainNav({ userRole }: MainNavProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const menuItems = [
    {
      href: '/dashboard',
      labelKey: 'dashboard_title',
      icon: LayoutDashboard,
      roles: ['Admin', 'Sales', 'Purchasing'],
    },
    {
      href: '/dashboard/sales-stats',
      labelKey: 'sales_statistics_title',
      icon: BarChart3,
      roles: ['Sales'],
    },
    {
      href: '/dashboard/users',
      labelKey: 'user_management_title',
      icon: Users,
      roles: ['Admin'],
    },
    {
      href: '/dashboard/recycle-bin',
      labelKey: 'recycle_bin_title',
      icon: Trash2,
      roles: ['Admin'],
    }
  ];

  return (
    <nav className="flex flex-col p-2">
        <SidebarMenu>
            {menuItems.map((item) => (
                item.roles.includes(userRole!) && (
                <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                        href={item.href}
                        as={Link}
                        isActive={pathname === item.href}
                        tooltip={{ children: t(item.labelKey) }}
                    >
                        <item.icon />
                        <span>{t(item.labelKey)}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                )
            ))}
      </SidebarMenu>
    </nav>
  );
}
