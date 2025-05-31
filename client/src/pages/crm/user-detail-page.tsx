import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter'; // Link for wouter
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/queryClient';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, ExternalLink, Edit3, Save, XCircle } from 'lucide-react'; // Added icons
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Will be used later
import { useForm, Controller } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod'; // Optional
// import { updateUserProfileSchema } from '@shared/schema'; // Backend schema

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Helper component for displaying details
const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
    return (
        <div className="mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-md text-gray-900 dark:text-gray-100 italic">N/A</p>
        </div>
    );
  }
  return (
    <div className="mb-2">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-md text-gray-900 dark:text-gray-100 break-words">
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
      </p>
    </div>
  );
};

// Define a comprehensive UserDetail type
interface UserDetail {
  id: number;
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  observerId: string | null;
  phoneNumber: string | null;
  role: string | null;
  verificationStatus: string | null;
  trainingStatus: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postOfficeRegion: string | null;
  country: string | null;
  trn: string | null;
  idType: string | null;
  idNumber: string | null;
  bankName: string | null;
  bankBranchLocation: string | null;
  bankAccount: string | null;
  accountType: string | null;
  accountCurrency: string | null;
  profilePhotoUrl: string | null;
  verifiedAt: string | null;
  idPhotoUrl: string | null;
  profileVerificationStatus: string | null;
  verificationId: string | null;
  notifications: any;
  language: string | null;
  region: string | null;
}

// Form data type - subset of UserDetail that matches updateUserProfileSchema
type UserProfileFormData = Partial<Pick<UserDetail,
  'address' | 'city' | 'state' | 'postOfficeRegion' | 'country' |
  'trn' | 'idType' | 'idNumber' |
  'bankName' | 'bankBranchLocation' | 'bankAccount' | 'accountType' | 'accountCurrency' |
  'profilePhotoUrl' | 'idPhotoUrl' |
  'notifications' | 'language' | 'region'
>>;


const UserDetailPage: React.FC = () => {
  const params = useParams();
  const userId = params.id;
  const [isEditing, setIsEditing] = useState(false);
  const { user: currentUser, hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error, refetch } = useQuery<UserDetail, Error>(
    ['crmUserDetail', userId],
    async () => {
      if (!userId) throw new Error('User ID is required');
      const id = typeof userId === 'string' ? userId : String(userId);
      const response = await apiRequest('GET', `/api/users/${id}`);
      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); } catch (e) { /* ignore */ }
        throw new Error(errorData?.message || `Failed to fetch user details: ${response.statusText}`);
      }
      return response.json();
    },
    { enabled: !!userId }
  );

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<UserProfileFormData>({
    defaultValues: {},
    // resolver: zodResolver(updateUserProfileSchema) // Optional: if you adapt schema for frontend
  });

  useEffect(() => {
    if (user && isEditing) {
      reset({
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        postOfficeRegion: user.postOfficeRegion || '',
        country: user.country || '',
        trn: user.trn || '',
        idType: user.idType || '',
        idNumber: user.idNumber || '',
        bankName: user.bankName || '',
        bankBranchLocation: user.bankBranchLocation || '',
        bankAccount: user.bankAccount || '',
        accountType: user.accountType || '',
        accountCurrency: user.accountCurrency || '',
        profilePhotoUrl: user.profilePhotoUrl || '',
        idPhotoUrl: user.idPhotoUrl || '',
        notifications: typeof user.notifications === 'string' ? user.notifications : JSON.stringify(user.notifications, null, 2) || '',
        language: user.language || '',
        region: user.region || '',
      });
    } else if (!isEditing && user) {
        // When exiting edit mode, reset form to actual user data to clear any unsaved changes
        reset({
            address: user.address || '', city: user.city || '', state: user.state || '',
            /* ... all other fields ... */
        });
    }
  }, [user, isEditing, reset]);

  const updateProfileMutation = useMutation(
    async (formData: UserProfileFormData) => {
      if (!userId) throw new Error("User ID is missing.");
      const id = typeof userId === 'string' ? userId : String(userId);

      let dataToSubmit = { ...formData };
      if (typeof formData.notifications === 'string') {
        try {
          dataToSubmit.notifications = JSON.parse(formData.notifications);
        } catch (e) {
          toast({ variant: 'destructive', title: 'Error', description: "Notifications field is not valid JSON." });
          throw new Error("Notifications field is not valid JSON.");
        }
      }

      const response = await apiRequest('PUT', `/api/users/${id}/profile`, dataToSubmit);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      return response.json();
    },
    {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Profile updated successfully.' });
        setIsEditing(false);
        queryClient.invalidateQueries(['crmUserDetail', userId]);
      },
      onError: (error: Error) => {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      },
    }
  );

  const onSubmit = (data: UserProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) return <MainLayout title="Loading..."><div className="container mx-auto py-6 flex justify-center"><Loader2 className="animate-spin h-16 w-16 text-primary" /></div></MainLayout>;
  if (error) return <MainLayout title="Error"><div className="container mx-auto py-6"><Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert></div></MainLayout>;
  if (!user) return <MainLayout title="Not Found"><div className="container mx-auto py-6"><Alert><AlertTitle>User Not Found</AlertTitle></Alert></div></MainLayout>;

  return (
    <MainLayout title={`User: ${user.firstName || ''} ${user.lastName || ''}`}>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <Link href="/crm">
            <Button variant="outline" disabled={isEditing}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to CRM List
            </Button>
          </Link>
          {hasPermission('crm_edit_user_profile_details') && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {isEditing && (
            <div className="flex justify-end space-x-2 mb-6 p-4 bg-muted rounded-lg sticky top-0 z-10">
              <Button type="button" variant="outline" onClick={() => { setIsEditing(false); reset(user); /* Reset with original user data */}} disabled={updateProfileMutation.isLoading}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isLoading || isSubmitting}>
                {updateProfileMutation.isLoading || isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          )}

          <h1 className="text-3xl font-bold mb-2">User Profile: {user.firstName || ''} {user.lastName || user.username}</h1>
          <p className="text-lg text-muted-foreground mb-6">ID: {user.id}</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Main Details Card (Display Only) */}
              <Card>
                <CardHeader><CardTitle className="flex items-center">
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarImage src={user.profileImageUrl || user.profilePhotoUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
                    <AvatarFallback>{((user.firstName?.[0] || '') + (user.lastName?.[0] || user.username?.[0] || 'U')).toUpperCase()}</AvatarFallback>
                  </Avatar>Main Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailItem label="Full Name" value={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'} />
                  <DetailItem label="Username" value={user.username} />
                  <DetailItem label="Role" value={user.role ? <Badge>{user.role}</Badge> : null} />
                  <DetailItem label="Email" value={user.email} />
                  <DetailItem label="Phone Number" value={user.phoneNumber} />
                  <DetailItem label="Observer ID" value={user.observerId} />
                </CardContent>
              </Card>

              {/* Address Information Card */}
              <Card>
                <CardHeader><CardTitle>Address Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <>
                      <div><label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label><Input id="address" {...register('address')} className="mt-1" /></div>
                      <div><label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label><Input id="city" {...register('city')} className="mt-1" /></div>
                      <div><label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300">State/Parish</label><Input id="state" {...register('state')} className="mt-1" /></div>
                      <div><label htmlFor="postOfficeRegion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Post Office Region</label><Input id="postOfficeRegion" {...register('postOfficeRegion')} className="mt-1" /></div>
                      <div><label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label><Input id="country" {...register('country')} className="mt-1" /></div>
                    </>
                  ) : (
                    <>
                      <DetailItem label="Address" value={user.address} />
                      <DetailItem label="City" value={user.city} />
                      <DetailItem label="State/Parish" value={user.state} />
                      <DetailItem label="Post Office Region" value={user.postOfficeRegion} />
                      <DetailItem label="Country" value={user.country} />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Status & Timestamps Card (Display Only) */}
              <Card>
                <CardHeader><CardTitle>Status & Timestamps</CardTitle></CardHeader>
                <CardContent>
                  <DetailItem label="User Verification" value={<Badge variant={user.verificationStatus === 'verified' ? 'success' : user.verificationStatus === 'pending' ? 'warning' : 'destructive'}>{user.verificationStatus || 'N/A'}</Badge>} />
                  <DetailItem label="Profile Verification" value={<Badge variant={user.profileVerificationStatus === 'verified' ? 'success' : user.profileVerificationStatus === 'pending' ? 'warning' : 'destructive'}>{user.profileVerificationStatus || 'N/A'}</Badge>} />
                  <DetailItem label="Training Status" value={<Badge variant={user.trainingStatus === 'completed' ? 'success' : user.trainingStatus === 'in_progress' ? 'info' : 'outline'}>{user.trainingStatus || 'N/A'}</Badge>} />
                  <DetailItem label="Profile Verified At" value={user.verifiedAt ? new Date(user.verifiedAt).toLocaleString() : 'N/A'} />
                  <DetailItem label="User Created At" value={new Date(user.createdAt).toLocaleString()} />
                  <DetailItem label="User Updated At" value={new Date(user.updatedAt).toLocaleString()} />
                </CardContent>
              </Card>

              {/* Identification & Financial Card (Will be made editable later) */}
              <Card>
                <CardHeader><CardTitle>Identification & Financial</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <>
                      <div><label htmlFor="trn" className="block text-sm font-medium text-gray-700 dark:text-gray-300">TRN</label><Input id="trn" {...register('trn')} className="mt-1" /></div>
                      <div><label htmlFor="idType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID Type</label>
                        <Controller
                          name="idType"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <SelectTrigger id="idType" className="mt-1"><SelectValue placeholder="Select ID Type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Select ID Type</SelectItem>
                                <SelectItem value="national_id">National ID</SelectItem>
                                <SelectItem value="passport">Passport</SelectItem>
                                <SelectItem value="drivers_license">Driver's License</SelectItem>
                                <SelectItem value="school_id">School ID</SelectItem>
                                <SelectItem value="work_id">Work ID</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div><label htmlFor="idNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID Number</label><Input id="idNumber" {...register('idNumber')} className="mt-1" /></div>
                      <DetailItem label="Verification ID (System)" value={user.verificationId} /> {/* This is likely not editable by user */}
                      <hr className="my-3"/>
                      <div><label htmlFor="bankName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label><Input id="bankName" {...register('bankName')} className="mt-1" /></div>
                      <div><label htmlFor="bankBranchLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bank Branch Location</label><Input id="bankBranchLocation" {...register('bankBranchLocation')} className="mt-1" /></div>
                      <div><label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bank Account</label><Input id="bankAccount" {...register('bankAccount')} className="mt-1" /></div>
                      <div><label htmlFor="accountType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Type</label>
                        <Controller
                          name="accountType"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <SelectTrigger id="accountType" className="mt-1"><SelectValue placeholder="Select Account Type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Select Account Type</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                                <SelectItem value="checking">Checking</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div><label htmlFor="accountCurrency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Currency</label>
                         <Controller
                          name="accountCurrency"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <SelectTrigger id="accountCurrency" className="mt-1"><SelectValue placeholder="Select Currency" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Select Currency</SelectItem>
                                <SelectItem value="JMD">JMD</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                {/* Add other currencies as needed */}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <DetailItem label="TRN" value={user.trn} />
                      <DetailItem label="ID Type" value={user.idType} />
                      <DetailItem label="ID Number" value={user.idNumber} />
                      <DetailItem label="Verification ID (System)" value={user.verificationId} />
                      <hr className="my-3"/>
                      <DetailItem label="Bank Name" value={user.bankName} />
                      <DetailItem label="Bank Branch" value={user.bankBranchLocation} />
                      <DetailItem label="Bank Account" value={user.bankAccount} />
                      <DetailItem label="Account Type" value={user.accountType} />
                      <DetailItem label="Account Currency" value={user.accountCurrency} />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Preferences & Other Card (Will be made editable later) */}
              <Card>
                <CardHeader><CardTitle>Preferences & Other</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <>
                      <div><label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label><Input id="language" {...register('language')} className="mt-1" /></div>
                      <div><label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Region</label><Input id="region" {...register('region')} className="mt-1" /></div>
                      <div>
                        <label htmlFor="notifications" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notifications Settings (JSON)</label>
                        <Textarea id="notifications" {...register('notifications')} className="mt-1 font-mono text-xs" rows={5} />
                        {errors.notifications && <p className="text-red-500 text-sm mt-1">{errors.notifications.message}</p>}
                      </div>
                       {/* Editable profilePhotoUrl and idPhotoUrl - simple text inputs for now */}
                      <div><label htmlFor="profilePhotoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Photo URL</label><Input id="profilePhotoUrl" {...register('profilePhotoUrl')} className="mt-1" /></div>
                      <div><label htmlFor="idPhotoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID Photo URL</label><Input id="idPhotoUrl" {...register('idPhotoUrl')} className="mt-1" /></div>
                    </>
                  ) : (
                    <>
                      <DetailItem label="Language" value={user.language} />
                      <DetailItem label="Region" value={user.region} />
                      <DetailItem label="Notifications Settings" value={user.notifications ? <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap break-all">{JSON.stringify(user.notifications, null, 2)}</pre> : 'N/A'} />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Associated Photos Card (Display Only when not editing, or if URLs are not empty) */}
              {(user.profilePhotoUrl || user.idPhotoUrl) && !isEditing && (
              <Card>
                <CardHeader><CardTitle>Associated Photos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {user.profilePhotoUrl && ( <div> <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Profile Photo (from Profile)</p> <img src={user.profilePhotoUrl} alt="Profile" className="rounded-lg max-w-xs max-h-48 border" /> <a href={user.profilePhotoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block"> View Full Size <ExternalLink className="inline h-3 w-3 ml-1"/> </a> </div> )}
                  {user.profileImageUrl && user.profileImageUrl !== user.profilePhotoUrl && ( <div> <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Profile Photo (from User Record)</p> <img src={user.profileImageUrl} alt="User Record Profile" className="rounded-lg max-w-xs max-h-48 border" /> <a href={user.profileImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block"> View Full Size <ExternalLink className="inline h-3 w-3 ml-1"/> </a> </div> )}
                  {user.idPhotoUrl && ( <div> <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">ID Photo</p> <img src={user.idPhotoUrl} alt="ID Photo" className="rounded-lg max-w-xs max-h-48 border" /> <a href={user.idPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block"> View Full Size <ExternalLink className="inline h-3 w-3 ml-1"/> </a> </div> )}
                </CardContent>
              </Card>
              )}
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default UserDetailPage;
