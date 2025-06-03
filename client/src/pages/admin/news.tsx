import React, { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/admin-layout';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { type News } from '@shared/schema';

export default function AdminNewsPage() {
  const queryClient = useQueryClient();
  const { data: news = [], isLoading } = useQuery<News[]>({ queryKey: ['/api/news'] });

  const addMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category: string; isPublished: boolean }) => {
      const res = await apiRequest('POST', '/api/news', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/news/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState({ title: '', content: '', category: '', isPublished: true });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    addMutation.mutate(formState);
    setDialogOpen(false);
    setFormState({ title: '', content: '', category: '', isPublished: true });
  };

  return (
    <AdminLayout title="News Management">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">News Management</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add News</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New News Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Title"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                />
                <Input
                  placeholder="Category"
                  value={formState.category}
                  onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                />
                <Textarea
                  placeholder="Content"
                  value={formState.content}
                  onChange={(e) => setFormState({ ...formState, content: e.target.value })}
                />
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formState.isPublished}
                    onCheckedChange={(v) => setFormState({ ...formState, isPublished: !!v })}
                  />
                  Published
                </label>
                <DialogFooter>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All News</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {news.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>{n.title}</TableCell>
                      <TableCell>{n.category}</TableCell>
                      <TableCell>{new Date(n.createdAt as any).toLocaleDateString()}</TableCell>
                      <TableCell>{n.isPublished ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(n.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
