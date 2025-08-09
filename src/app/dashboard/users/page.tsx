
"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from '@/hooks/use-i18n';
import { MOCK_USERS } from '@/lib/data';
import type { User, UserRole } from '@/lib/types';


export default function UsersPage() {
    const { t } = useI18n();
    const [users] = useState<User[]>(MOCK_USERS);

    const getRoleVariant = (role: UserRole) => {
        switch (role) {
            case 'Admin': return 'destructive';
            case 'Sales': return 'default';
            case 'Purchasing': return 'secondary';
            default: return 'outline';
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('user_management_title')}</h1>
                    <p className="text-muted-foreground">Manage all user accounts in the system.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('button_add_user')}
                </Button>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('user_field_name')}</TableHead>
                                <TableHead>{t('user_field_email')}</TableHead>
                                <TableHead>{t('user_field_role')}</TableHead>
                                <TableHead>{t('user_field_status')}</TableHead>
                                <TableHead>{t('user_field_last_login')}</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={getRoleVariant(user.role)}>{t(`user_role_${user.role.toLowerCase()}`)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.status === 'Active' ? 'default' : 'destructive'} className={user.status === 'Active' ? 'bg-green-500' : ''}>
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(user.lastLoginTime).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem>{t('button_reset_password')}</DropdownMenuItem>
                                                <DropdownMenuItem>Edit User</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
