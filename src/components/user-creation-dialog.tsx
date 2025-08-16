// src/components/user-creation-dialog.tsx
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Eye, EyeOff } from 'lucide-react';
import type { User, UserRole, Language } from '@/lib/types';

const userFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Admin', 'Sales', 'Purchasing']),
  language: z.enum(['en', 'de', 'zh']),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: (user: User) => void;
}

// Helper function to generate secure password
function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export function UserCreationDialog({
  open,
  onOpenChange,
  onUserCreated,
}: UserCreationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      role: 'Sales',
      language: 'en',
    },
  });

  const generatePassword = () => {
    const newPassword = generateSecurePassword();
    form.setValue('password', newPassword);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard"
    });
  };

  const onSubmit = async (data: UserFormValues) => {
     console.log('🚀 USER CREATION STARTED!'); // Add this line first
  console.log('📧 Form data:', data); // Add this line too
    // Only admin users can create accounts
    if (currentUser?.role !== 'Admin') {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only administrators can create user accounts.',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🚀 Starting user creation process...');
      console.log('📧 Email:', data.email);
      console.log('👤 Name:', data.name);
      console.log('🎭 Role:', data.role);

      // Step 1: Create user in Firebase Authentication
      console.log('📝 Creating user in Firebase Authentication...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const newUser = userCredential.user;
      console.log('✅ User created in Authentication with UID:', newUser.uid);

      // Step 2: Update the user's display name
      console.log('🏷️ Updating user display name...');
      await updateProfile(newUser, {
        displayName: data.name
      });
      console.log('✅ Display name updated');

      // Step 3: Create user profile document in Firestore
      console.log('💾 Creating user profile in Firestore...');
      const userDocRef = doc(db, 'users', newUser.uid);
      const userProfile = {
        id: newUser.uid,
        email: data.email,
        name: data.name,
        role: data.role,
        status: 'Active',
        language: data.language,
        registrationDate: serverTimestamp(),
        lastLoginTime: serverTimestamp(),
        avatar: 'https://placehold.co/100x100',
        createdBy: currentUser.id,
        createdAt: serverTimestamp()
      };

      await setDoc(userDocRef, userProfile);
      console.log('✅ User profile created in Firestore');

      // Step 4: Sign out the newly created user to prevent admin logout
      console.log('🚪 Signing out new user...');
      await signOut(auth);
      console.log('✅ New user signed out');

      // Step 5: Show success with credentials
      setCreatedCredentials({
        email: data.email,
        password: data.password
      });

      // Create User object for callback
      const createdUser: User = {
        id: newUser.uid,
        email: data.email,
        name: data.name,
        role: data.role as UserRole,
        registrationDate: new Date().toISOString(),
        lastLoginTime: new Date().toISOString(),
        status: 'Active',
        language: data.language as Language,
        avatar: 'https://placehold.co/100x100',
      };

      toast({
        title: 'User Created Successfully! 🎉',
        description: `Account created for ${data.name}`,
      });

      onUserCreated(createdUser);
      form.reset();

    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to create user';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email address is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password must be at least 6 characters long';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password authentication is not enabled';
          break;
        case 'permission-denied':
          errorMessage = 'Permission denied - check Firestore security rules';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error - please check your connection';
          break;
        default:
          errorMessage = error.message || 'Unknown error occurred';
      }

      toast({
        variant: 'destructive',
        title: 'Failed to Create User',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedCredentials(null);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {createdCredentials ? 'User Created Successfully!' : 'Create New User'}
          </DialogTitle>
          <DialogDescription>
            {createdCredentials 
              ? 'Please share these credentials securely with the new user:'
              : 'Add a new user to the system. All fields are required.'
            }
          </DialogDescription>
        </DialogHeader>

        {createdCredentials ? (
          // Success state - show credentials
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                🎉 User account created successfully! Please share these credentials securely:
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <div className="flex gap-2 mt-1">
                  <Input value={createdCredentials.email} readOnly />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(createdCredentials.email)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Temporary Password</label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={createdCredentials.password} 
                    readOnly 
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(createdCredentials.password)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setCreatedCredentials(null)}>
                Create Another User
              </Button>
            </div>
          </div>
        ) : (
          // Form state
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporary Password</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input 
                          type="text" 
                          placeholder="Enter password or generate one" 
                          {...field} 
                        />
                        <Button type="button" variant="outline" onClick={generatePassword}>
                          Generate
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Purchasing">Purchasing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating User...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}