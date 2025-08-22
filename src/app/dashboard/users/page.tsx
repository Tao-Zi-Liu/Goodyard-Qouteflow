"use client";
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Shield, PlusCircle, UserX, UserCheck, Key, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { User, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UsersPage() {
    const { t } = useI18n();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        role: 'Sales' as UserRole,
        language: 'en' as 'en' | 'de' | 'zh',
        password: ''
    });

    // Only admins can access this page
    if (currentUser?.role !== 'Admin') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="text-center">
                    <Shield className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access user management.</p>
                </div>
            </div>
        );
    }

    // Fetch users from Firestore
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const usersQuery = query(
                collection(db, 'users'), 
                orderBy('createdAt', 'desc')
            );
            const userSnapshot = await getDocs(usersQuery);
            const userList = userSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    registrationDate: data.registrationDate?.toDate?.()?.toISOString() || data.registrationDate,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                } as User;
            });
            setUsers(userList);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load users."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUserStatusToggle = async (userId: string, currentStatus: string, userName: string) => {
        try {
            const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
            
            // Update user status in Firestore
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser?.id
            });
    
            // Update local state
            setUsers(prevUsers => 
                prevUsers.map(user => 
                    user.id === userId 
                        ? { ...user, status: newStatus as 'Active' | 'Inactive' }
                        : user
                )
            );
    
            toast({
                title: `User ${newStatus === 'Active' ? 'Activated' : 'Deactivated'}`,
                description: `${userName} has been ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully.`
            });
    
        } catch (error) {
            console.error('Error updating user status:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update user status. Please try again."
            });
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Generate random password
    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    // Create user function
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            const createUserFunction = httpsCallable(functions, 'createUser');
            const password = formData.password || generatePassword();
            
            await createUserFunction({
                email: formData.email,
                password: password,
                name: formData.name,
                role: formData.role,
                language: formData.language
            });

            toast({
                title: "User Created Successfully",
                description: `User ${formData.name} has been created. Temporary password: ${password}`,
            });

            // Reset form and close dialog
            setFormData({
                email: '',
                name: '',
                role: 'Sales',
                language: 'en',
                password: ''
            });
            setIsCreateUserOpen(false);
            
            // Refresh user list
            fetchUsers();

        } catch (error: any) {
            console.error('Error creating user:', error);
            toast({
                variant: "destructive",
                title: "Error Creating User",
                description: error.message || "Failed to create user account.",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const getRoleVariant = (role: UserRole) => {
        switch (role) {
            case 'Admin': return 'destructive';
            case 'Sales': return 'default';
            case 'Purchasing': return 'secondary';
            default: return 'outline';
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('user_management_title')}</h1>
                    <p className="text-muted-foreground">Manage employee accounts and permissions.</p>
                </div>
                
                <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('button_add_user')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Create New Employee Account</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email Address *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="employee@company.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="name">Full Name *</Label>
                                <Input
                                    id="name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <Label htmlFor="role">Role *</Label>
                                <Select 
                                    value={formData.role} 
                                    onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Admin">Administrator</SelectItem>
                                        <SelectItem value="Sales">Sales</SelectItem>
                                        <SelectItem value="Purchasing">Purchasing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="language">Preferred Language</Label>
                                <Select 
                                    value={formData.language} 
                                    onValueChange={(value: 'en' | 'de' | 'zh') => setFormData(prev => ({ ...prev, language: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="de">Deutsch</SelectItem>
                                        <SelectItem value="zh">中文</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="password">Temporary Password</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="password"
                                        type="text"
                                        value={formData.password}
                                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="Auto-generated if empty"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setFormData(prev => ({ 
                                            ...prev, 
                                            password: generatePassword() 
                                        }))}
                                    >
                                        Generate
                                    </Button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isCreating}>
                                    {isCreating ? "Creating..." : "Create Account"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('user_field_name')}</TableHead>
                                <TableHead>{t('user_field_email')}</TableHead>
                                <TableHead>{t('user_field_role')}</TableHead>
                                <TableHead>Language</TableHead>
                                <TableHead>{t('user_field_status')}</TableHead>
                                <TableHead>{t('user_field_last_login')}</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-sm font-medium">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="font-medium">{user.name}</div>
                                                {user.mustChangePassword && (
                                                    <div className="text-xs text-amber-600">Must change password</div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={getRoleVariant(user.role)}>
                                            {t(`user_role_${user.role.toLowerCase()}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{user.language}</TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={user.status === 'Active' ? 'default' : 'destructive'} 
                                            className={user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}
                                        >
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.lastLoginTime ? 
                                            new Date(user.lastLoginTime).toLocaleString() : 
                                            'Never'
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => handleUserStatusToggle(user.id, user.status, user.name)}
                                            className={user.status === 'Active' ? 'text-orange-600' : 'text-green-600'}
                                        >
                                            {user.status === 'Active' ? (
                                                <>
                                                    <UserX className="mr-2 h-4 w-4" />
                                                    Deactivate User
                                                </>
                                            ) : (
                                                <>
                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                    Activate User
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Key className="mr-2 h-4 w-4" />
                                            {t('button_reset_password')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Details
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}