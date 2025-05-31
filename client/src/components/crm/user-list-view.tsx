import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient'; // Assuming this helper exists
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'wouter'; // Or your app's Link component

// Define User type (subset for list view)
interface CrmUser {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  observerId: string | null;
  role: string | null;
  verificationStatus: string | null;
  trainingStatus: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
}

interface UsersApiResponse {
  users: CrmUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const UserListView: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10); // Default items per page
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [verificationStatusFilter, setVerificationStatusFilter] = useState('');
  const [trainingStatusFilter, setTrainingStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [trnFilter, setTrnFilter] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const { data, isLoading, error, refetch } = useQuery<UsersApiResponse, Error>(
    ['crmUserList', page, limit, debouncedSearchTerm, roleFilter, verificationStatusFilter, trainingStatusFilter, cityFilter, stateFilter, trnFilter],
    async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (roleFilter) params.append('role', roleFilter);
      if (verificationStatusFilter) params.append('verificationStatus', verificationStatusFilter);
      if (trainingStatusFilter) params.append('trainingStatus', trainingStatusFilter);
      if (cityFilter) params.append('city', cityFilter);
      if (stateFilter) params.append('state', stateFilter);
      if (trnFilter) params.append('trn', trnFilter);

      // Assuming apiRequest is a wrapper around fetch that handles base URL, headers, etc.
      // and returns a promise that resolves to the Response object.
      const response = await apiRequest('GET', `/api/users?${params.toString()}`);
      if (!response.ok) {
        // Try to parse error response if possible, otherwise throw generic error
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore if error response is not JSON
        }
        throw new Error(errorData?.error || `Request failed with status ${response.status}`);
      }
      return response.json();
    },
    {
      keepPreviousData: true,
      // onSuccess: (data) => {
      //   console.log("Fetched users:", data);
      // },
      // onError: (err) => {
      //   console.error("Error fetching users:", err);
      // }
    }
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setVerificationStatusFilter('');
    setTrainingStatusFilter('');
    setCityFilter('');
    setStateFilter('');
    setTrnFilter('');
    setPage(1); // Reset to page 1
  };

  // Define options for select filters (can be dynamic later)
  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'director', label: 'Director' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'observer', label: 'Observer' },
    { value: 'roving_observer', label: 'Roving Observer' },
  ];

  const verificationStatusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const trainingStatusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];


  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-semibold">User List</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-card">
        <Input
          placeholder="Search by name, email, username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="col-span-full"
        />

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger><SelectValue placeholder="Filter by Role" /></SelectTrigger>
          <SelectContent>
            {roleOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={verificationStatusFilter} onValueChange={setVerificationStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Filter by Verification Status" /></SelectTrigger>
          <SelectContent>
            {verificationStatusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={trainingStatusFilter} onValueChange={setTrainingStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Filter by Training Status" /></SelectTrigger>
          <SelectContent>
            {trainingStatusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter by City"
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1);}}
        />
        <Input
          placeholder="Filter by State/Parish"
          value={stateFilter}
          onChange={(e) => { setStateFilter(e.target.value); setPage(1);}}
        />
        <Input
          placeholder="Filter by TRN"
          value={trnFilter}
          onChange={(e) => { setTrnFilter(e.target.value); setPage(1);}}
        />

        <Button onClick={handleClearFilters} variant="outline" className="col-span-full md:col-span-1">
          Clear Filters
        </Button>
      </div>

      {/* User Table will go here */}
      {/* User Table */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
          <p className="ml-2 text-muted-foreground">Loading users...</p>
        </div>
      )}
      {error && (
        <div className="text-center py-10">
          <p className="text-red-500">Error fetching users: {error.message}</p>
          <Button onClick={() => refetch()} className="mt-4">Try Again</Button>
        </div>
      )}
      {data && !isLoading && !error && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email/Username</TableHead>
                <TableHead>Observer ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Training</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State/Parish</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No users found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
              {data.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <Link href={`/crm/user/${user.id}`} className="hover:underline text-primary">
                      {user.firstName || ''} {user.lastName || ''}
                      {(!user.firstName && !user.lastName) && 'N/A'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{user.email}</div>
                    <div className="text-xs text-muted-foreground">{user.username}</div>
                  </TableCell>
                  <TableCell>{user.observerId || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{user.role || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{user.verificationStatus || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{user.trainingStatus || 'N/A'}</TableCell>
                  <TableCell>{user.city || 'N/A'}</TableCell>
                  <TableCell>{user.state || 'N/A'}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/crm/user/${user.id}`}>
                        <User className="h-4 w-4 mr-1" /> View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.users.length > 0 && (
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} (Total: {data.pagination.total} users)
            </p>
          </div>
          <div className="flex space-x-2">
            <Select
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setPage(1); // Reset to page 1 when limit changes
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder={`${limit} / page`} />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(val => (
                  <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={!data.pagination.hasPrev}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={!data.pagination.hasNext}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListView;
