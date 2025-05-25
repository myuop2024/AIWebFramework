// Add route for advanced features page
app.get("/advanced-features", (req, res, next) => {
  // This will be handled by the client-side router
  next();
});

// --- MOCK DASHBOARD API ENDPOINTS ---

// Upcoming Events
app.get('/api/events/upcoming', (req, res) => {
  res.json([
    { id: 1, title: 'Observer Training', date: '2024-07-01', location: 'Kingston' },
    { id: 2, title: 'Team Meeting', date: '2024-07-03', location: 'Montego Bay' },
    { id: 3, title: 'Election Briefing', date: '2024-07-05', location: 'Portmore' }
  ]);
});

// User Profile
app.get('/api/users/profile', (req, res) => {
  res.json({
    id: 1,
    username: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'observer',
    assignments: 3,
    completedReports: 12,
    pendingReports: 2
  });
});

// Reports
app.get('/api/reports', (req, res) => {
  res.json([
    { id: 1, title: 'Station 12 Report', status: 'pending', date: '2024-06-28' },
    { id: 2, title: 'Station 15 Report', status: 'approved', date: '2024-06-27' },
    { id: 3, title: 'Station 24 Report', status: 'in_review', date: '2024-06-26' }
  ]);
});

// Assignments
app.get('/api/users/assignments', (req, res) => {
  res.json([
    { id: 1, station: 'Kingston Central #24', status: 'active' },
    { id: 2, station: 'Montego Bay #12', status: 'completed' }
  ]);
});

// Latest News
app.get('/api/news/latest', (req, res) => {
  res.json([
    { id: 1, headline: 'Election Day Announced', date: '2024-06-25' },
    { id: 2, headline: 'New Training Portal Launched', date: '2024-06-24' }
  ]);
}); 