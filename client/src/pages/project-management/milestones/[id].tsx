import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const MilestoneDetailPage: React.FC = () => {
  const params = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const milestoneId = params.id;

  // Fetch milestone details
  const { data: milestone, isLoading, isError } = useQuery({
    queryKey: ['/api/project-management/milestones', milestoneId],
    queryFn: async () => {
      const res = await fetch(`/api/project-management/milestones/${milestoneId}`);
      if (!res.ok) throw new Error('Failed to fetch milestone');
      return res.json();
    },
    enabled: !!milestoneId
  });

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});

  React.useEffect(() => {
    if (milestone) setForm(milestone);
  }, [milestone]);

  // Update milestone mutation
  const updateMilestone = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/project-management/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update milestone');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-management/milestones', milestoneId] });
      setEditMode(false);
    }
  });

  // Calculate completion percentage
  const calculateCompletionPercentage = (milestone: any) => {
    if (!milestone?.tasks || milestone.tasks.length === 0) return 0;
    const completedTasks = milestone.tasks.filter((task: any) => task.status === 'done').length;
    return Math.round((completedTasks / milestone.tasks.length) * 100);
  };

  if (isLoading) return <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading...</div>;
  if (isError || !milestone) return <div className="text-center py-12 text-red-500">Error loading milestone.</div>;

  const completionPercentage = calculateCompletionPercentage(milestone);

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Button variant="outline" size="sm" className="mb-4" onClick={() => setLocation('/project-management/milestones')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Milestones
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Milestone Details</CardTitle>
          <CardDescription>View and edit milestone information</CardDescription>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <form onSubmit={e => { e.preventDefault(); updateMilestone.mutate(form); }} className="space-y-4">
              <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" required />
              <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" />
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="border rounded px-2 py-1">
                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <Input type="date" value={form.dueDate ? form.dueDate.slice(0,10) : ''} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              <div className="flex space-x-2">
                <Button type="submit" disabled={updateMilestone.isLoading}>Save</Button>
                <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{milestone.name}</h2>
                <Button size="sm" onClick={() => setEditMode(true)}>Edit</Button>
              </div>
              <div className="text-gray-600">{milestone.description}</div>
              <div className="flex space-x-2 mt-2">
                <Badge>{milestone.status}</Badge>
                {milestone.dueDate && <Badge>{milestone.dueDate.slice(0,10)}</Badge>}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>
              <div className="mt-4">
                <h3 className="font-medium mb-2">Tasks</h3>
                <div className="space-y-2">
                  {milestone.tasks?.length ? milestone.tasks.map((task: any) => (
                    <div key={task.id} className="p-2 border rounded flex justify-between items-center">
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-gray-500">{task.status}</div>
                      </div>
                      <Badge>{task.status}</Badge>
                    </div>
                  )) : <div className="text-gray-500">No tasks for this milestone.</div>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MilestoneDetailPage; 