// src/app/dashboard/users/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, KeyRound, Edit2, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useI18n } from '@/hooks/use-i18n';
import { MOCK_USERS } from '@/lib/data';
import type { User, UserRole } from '@/lib/types';
import { UserCreationDialog } from '@/components/user-creation-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UsersPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        // Load users from localStorage or use mock data
        const storedUsers = localStorage.getItem('all-users');
        if (storedUsers) {
            setUsers(JSON.parse(storedUsers));
        } else {
            setUsers(MOCK_USERS);
            localStorage.setItem('all-users', JSON.stringify(MOCK_USERS));
        }
    }, []);

    const getRoleVariant = (role: UserRole) => {
        switch (role) {
            case 'Admin': return 'destructive';
            case 'Sales': return 'default';
            case 'Purchasing': return 'secondary';
            default: return 'outline';
        }
    };

    const handleUserCreated = (newUser: User) => {
        setUsers(prev => [...prev, newUser]);
    };

    const handleResetPassword = (user: User) => {
        // Generate a temporary password
        const tempPassword = `Temp${Math.random().toString(36).slice(-8)}`;
        
        toast({
            title: 'Password Reset',
            description: `Password for ${user.name} has been reset to: ${tempPassword}`,
        });

        // In a real app, you would:
        // 1. Update the password in Firebase Auth
        // 2. Send an email to the user with the temporary password
        // 3. Force password change on next login
    };

    const handleToggleStatus = (user: User) => {
        const updatedUsers = users.map(u => 
            u.id === user.id 
                ? { ...u, status: u.status === 'Active' ? 'Inactive' as const : 'Active' as const }
                : u
        );
        setUsers(updatedUsers);
        localStorage.setItem('all-users', JSON.stringify(updatedUsers));
        
        toast({
            title: 'Status Updated',
            description: `${user.name}'s account is now ${user.status === 'Active' ? 'Inactive' : 'Active'}.`,
        });
    };

    const handleDeleteUser = () => {
        if (!userToDelete) return;

        const updatedUsers = users.filter(u => u.id !== userToDelete.id);
        setUsers(updatedUsers);
        localStorage.setItem('all-users', JSON.stringify(updatedUsers));
        
        toast({
            title: 'User Deleted',
            description: `${userToDelete.name} has been permanently deleted.`,
        });
        
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('user_management_title')}</h1>
                    <p className="text-muted-foreground">Manage all user accounts in the system.</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
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
                                        <Badge variant={getRoleVariant(user.role)}>
                                            {t(`user_role_${user.role.toLowerCase()}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={user.status === 'Active' ? 'default' : 'destructive'} 
                                            className={user.status === 'Active' ? 'bg-green-500' : ''}
                                        >
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
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                                    <KeyRound className="mr-2 h-4 w-4" />
                                                    {t('button_reset_password')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                                    <Edit2 className="mr-2 h-4 w-4" />
                                                    {user.status === 'Active' ? 'Deactivate' : 'Activate'} User
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    className="text-destructive"
                                                    onClick={() => {
                                                        setUserToDelete(user);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <UserCreationDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onUserCreated={handleUserCreated}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete{' '}
                            <span className="font-semibold">{userToDelete?.name}</span>'s account
                            and remove all of their data from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={handleDeleteUser}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}