import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';

const statusOptions = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'to_do', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];
const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const TaskDetailPage: React.FC = () => {
  const params = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const taskId = params.id;

  // Fetch task details
  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['/api/project-management/tasks', taskId],
    queryFn: async () => {
      const res = await fetch(`/api/project-management/tasks/${taskId}`);
      if (!res.ok) throw new Error('Failed to fetch task');
      return res.json();
    },
    enabled: !!taskId
  });

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});

  React.useEffect(() => {
    if (task) setForm(task);
  }, [task]);

  // Update task mutation
  const updateTask = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/project-management/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-management/tasks', taskId] });
      setEditMode(false);
    }
  });

  // Comments
  const [comment, setComment] = useState('');
  const addComment = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/project-management/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: data })
      });
      if (!res.ok) throw new Error('Failed to add comment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-management/tasks', taskId] });
      setComment('');
    }
  });

  if (isLoading) return <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading...</div>;
  if (isError || !task) return <div className="text-center py-12 text-red-500">Error loading task.</div>;

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Button variant="outline" size="sm" className="mb-4" onClick={() => setLocation('/project-management/tasks')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tasks
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
          <CardDescription>View and edit task information</CardDescription>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <form onSubmit={e => { e.preventDefault(); updateTask.mutate(form); }} className="space-y-4">
              <Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" required />
              <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" />
              <div className="flex space-x-2">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="border rounded px-2 py-1">
                  {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="border rounded px-2 py-1">
                  {priorityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <Input type="date" value={form.dueDate ? form.dueDate.slice(0,10) : ''} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              <div className="flex space-x-2">
                <Button type="submit" disabled={updateTask.isLoading}>Save</Button>
                <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{task.title}</h2>
                <Button size="sm" onClick={() => setEditMode(true)}>Edit</Button>
              </div>
              <div className="text-gray-600">{task.description}</div>
              <div className="flex space-x-2 mt-2">
                <Badge>{task.status}</Badge>
                <Badge>{task.priority}</Badge>
                {task.dueDate && <Badge>{task.dueDate.slice(0,10)}</Badge>}
              </div>
            </div>
          )}
          <div className="mt-8">
            <h3 className="font-medium mb-2">Comments</h3>
            <div className="space-y-2 mb-2">
              {task.comments?.length ? task.comments.map((c: any) => (
                <div key={c.id} className="p-2 border rounded">
                  <div className="text-sm font-medium">{c.user?.username || 'User'}</div>
                  <div className="text-xs text-gray-500">{c.createdAt?.slice(0,10)}</div>
                  <div>{c.content}</div>
                </div>
              )) : <div className="text-gray-500">No comments yet.</div>}
            </div>
            <form onSubmit={e => { e.preventDefault(); addComment.mutate(comment); }} className="flex space-x-2">
              <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." />
              <Button type="submit" disabled={addComment.isLoading || !comment}>Post</Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskDetailPage; 