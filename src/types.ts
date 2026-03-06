export interface Issue {
  id: number;
  title: string;
  status: 'draft' | 'published';
  created_at: string;
}

export interface Section {
  id: number;
  issue_id: number;
  type: string;
  content: string | null;
  author_name: string | null;
  author_email: string | null;
  status: 'pending' | 'reviewing' | 'approved' | 'needs_revision';
  ai_feedback: string | null;
  word_limit: number;
  updated_at: string;
}

export interface Contributor {
  email: string;
  name: string;
  role: 'writer' | 'editor';
}
