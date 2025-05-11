import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

// Icons
import { CalendarIcon, Loader2, Plus, Search } from 'lucide-react';
import MainLayout from '@/components/layout/main-layout';
import { format } from 'date-fns';

// Status badge for milestones
const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    'pending': 'bg-gray-100 text-gray-800',
    'active': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'delayed': 'bg-red-100 text-red-800',
    'cancelled': 'bg-orange-100 text-orange-800'
  };

  return (
    <Badge className={`${colorMap[status] || 'bg-gray-100 text-gray-800'} px-2 py-1 rounded-md text-xs font-medium`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

// Calculate completion percentage based on associated tasks
const calculateCompletionPercentage = (milestone: any) => {
  if (!milestone.tasks || milestone.tasks.length === 0) return 0;
  
  const completedTasks = milestone.tasks.filter((task: any) => task.status === 'done').length;
  return Math.round((completedTasks / milestone.tasks.length) * 100);
};

export default function MilestonesPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch milestones data
  const { data: milestonesData, isLoading, isError } = useQuery({
    queryKey: ['/api/project-management/milestones', { status: statusFilter, project: projectFilter, page: currentPage, search: searchQuery }],
    enabled: true
  });

  // Fetch projects for the filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['/api/project-management/projects'],
    enabled: true
  });

  const milestones = milestonesData?.milestones || [];
  const totalPages = milestonesData?.totalPages || 1;
  const projects = projectsData || [];

  const handleCreateMilestone = () => {
    navigate('/project-management/milestones/new');
  };

  const handleMilestoneClick = (milestoneId: number) => {
    navigate(`/project-management/milestones/${milestoneId}`);
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
            <h1 className="text-3xl font-bold">Milestones</h1>
            <p className="text-gray-500">Track project milestones and progress</p>
          </div>
          <Button onClick={handleCreateMilestone}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Milestone
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Project Milestones</CardTitle>
            <CardDescription>
              View and manage key project milestones
            </CardDescription>
            
            <div className="mt-4 flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search milestones..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading milestones...</span>
              </div>
            ) : isError ? (
              <div className="text-center py-12 text-red-500">
                Error loading milestones. Please try again.
              </div>
            ) : milestones.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="mb-2">No milestones found.</div>
                <Button variant="outline" onClick={handleCreateMilestone}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first milestone
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {milestones.map((milestone: any) => {
                  const completionPercentage = calculateCompletionPercentage(milestone);
                  
                  return (
                    <Card 
                      key={milestone.id} 
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleMilestoneClick(milestone.id)}
                    >
                      <div className={`h-2 ${
                        completionPercentage === 100 
                          ? 'bg-green-500' 
                          : milestone.status === 'delayed' 
                            ? 'bg-red-500' 
                            : 'bg-blue-500'
                      }`}></div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg line-clamp-1">{milestone.name}</h3>
                          <StatusBadge status={milestone.status} />
                        </div>
                        
                        <div className="text-gray-500 text-sm mb-3 line-clamp-2">
                          {milestone.description || 'No description provided'}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          <span>Due: {formatDate(milestone.dueDate)}</span>
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{completionPercentage}%</span>
                          </div>
                          <Progress value={completionPercentage} className="h-2" />
                        </div>
                        
                        <div className="mt-3 text-xs text-gray-500">
                          Project: {milestone.project?.name || 'N/A'}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            
            {renderPagination()}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}