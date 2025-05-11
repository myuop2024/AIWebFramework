import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

// Icons
import { CalendarIcon, ClockIcon, Filter, ListFilter, Loader2, Plus, Search, Tag } from 'lucide-react';
import MainLayout from '@/components/layout/main-layout';
import { formatDistanceToNow, format } from 'date-fns';

// Task priority and status badges
const PriorityBadge = ({ priority }: { priority: string }) => {
  const colorMap: Record<string, string> = {
    'low': 'bg-blue-100 text-blue-800',
    'medium': 'bg-yellow-100 text-yellow-800',
    'high': 'bg-orange-100 text-orange-800',
    'urgent': 'bg-red-100 text-red-800'
  };

  return (
    <Badge className={`${colorMap[priority] || 'bg-gray-100 text-gray-800'} px-2 py-1 rounded-md text-xs font-medium`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    'backlog': 'bg-gray-100 text-gray-800',
    'to_do': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'in_review': 'bg-purple-100 text-purple-800',
    'done': 'bg-green-100 text-green-800'
  };

  const labelMap: Record<string, string> = {
    'backlog': 'Backlog',
    'to_do': 'To Do',
    'in_progress': 'In Progress',
    'in_review': 'In Review',
    'done': 'Done'
  };

  return (
    <Badge className={`${colorMap[status] || 'bg-gray-100 text-gray-800'} px-2 py-1 rounded-md text-xs font-medium`}>
      {labelMap[status] || status}
    </Badge>
  );
};

export default function TasksPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'assigned' | 'all' | 'created'>('assigned');

  // Fetch tasks based on the selected view, filters and pagination
  const { data: tasksData, isLoading, isError } = useQuery({
    queryKey: ['/api/project-management/tasks', { view: viewMode, status: statusFilter, priority: priorityFilter, page: currentPage, search: searchQuery }],
    enabled: true
  });

  const tasks = tasksData?.tasks || [];
  const totalPages = tasksData?.totalPages || 1;

  const handleCreateTask = () => {
    navigate('/project-management/tasks/new');
  };

  const handleTaskClick = (taskId: number) => {
    navigate(`/project-management/tasks/${taskId}`);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM d, yyyy');
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1} 
              className={currentPage === 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          
          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                isActive={currentPage === i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className="cursor-pointer"
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          {totalPages > 5 && (
            <>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  isActive={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="cursor-pointer"
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages} 
              className={currentPage === totalPages ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Tasks</h1>
            <p className="text-gray-500">Manage your tasks across all projects</p>
          </div>
          <Button onClick={handleCreateTask}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Task
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Tasks</CardTitle>
            <CardDescription>
              View and manage your task assignments
            </CardDescription>
            
            <div className="mt-4 flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
              <Tabs 
                value={viewMode} 
                onValueChange={(value) => setViewMode(value as 'assigned' | 'all' | 'created')}
                className="w-full max-w-md"
              >
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
                  <TabsTrigger value="created">Created by Me</TabsTrigger>
                  <TabsTrigger value="all">All Tasks</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex flex-1 space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search tasks..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      <SelectItem value="to_do">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading tasks...</span>
              </div>
            ) : isError ? (
              <div className="text-center py-12 text-red-500">
                Error loading tasks. Please try again.
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="mb-2">No tasks found.</div>
                <Button variant="outline" onClick={handleCreateTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first task
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Project</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Priority</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Due Date</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr 
                        key={task.id} 
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleTaskClick(task.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {task.description.substring(0, 60)}
                              {task.description.length > 60 ? '...' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {task.project?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="px-4 py-3">
                          {task.dueDate ? (
                            <div className="flex items-center text-sm">
                              <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                              {formatDate(task.dueDate)}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          {task.assignee?.username || 'Unassigned'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {renderPagination()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}