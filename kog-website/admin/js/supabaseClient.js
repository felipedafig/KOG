// Public anon key — safe to expose client-side, RLS restricts anon to insert-only
// on quote_requests/quote_photos; everything else requires an authenticated (staff) session.
export const supabase = window.supabase.createClient(
  'https://zhiifaeqwrowmjqemgnl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaWlmYWVxd3Jvd21qcWVtZ25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTM4MzMsImV4cCI6MjA5ODg2OTgzM30.Fc34SeXpKu225su2j8ZFKO8VoNGeWcNv8oiXhh6Q0hI'
);
