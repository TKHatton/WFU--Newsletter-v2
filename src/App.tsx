import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Plus, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Eye, 
  ChevronRight,
  Settings,
  Bell,
  ShoppingBag,
  Mail,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Issue, Section, Contributor } from './types';
import { auditSectionContent } from './services/gemini';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'editor' | 'preview' | 'contributors'>('dashboard');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [notificationDraft, setNotificationDraft] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
    fetchContributors();
  }, []);

  const fetchIssues = async () => {
    const res = await fetch('/api/issues');
    const data = await res.json();
    setIssues(data);
  };

  const fetchContributors = async () => {
    const res = await fetch('/api/contributors');
    const data = await res.json();
    setContributors(data);
  };

  const sendReminder = async (section: Section) => {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'reminder',
        recipient: section.author_name || 'Contributor',
        context: `The section "${section.type}" for the Moral Imagination newsletter is pending submission.`
      })
    });
    const data = await res.json();
    setNotificationDraft(data.draft);
  };

  const createIssue = async () => {
    const title = `Issue ${new Date().toLocaleDateString()}`;
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    const data = await res.json();
    fetchIssues();
  };

  const selectIssue = async (issue: Issue) => {
    setSelectedIssue(issue);
    const res = await fetch(`/api/issues/${issue.id}/sections`);
    const data = await res.json();
    setSections(data);
    setView('editor');
  };

  const handleAudit = async (section: Section, content: string) => {
    setIsAuditing(true);
    try {
      const result = await auditSectionContent(section.type, content, section.word_limit);
      
      const updatedSection: Section = {
        ...section,
        content,
        status: result.status === 'approved' ? 'approved' : 'needs_revision',
        ai_feedback: result.feedback
      };

      await fetch(`/api/sections/${section.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSection)
      });

      setSections(sections.map(s => s.id === section.id ? updatedSection : s));
      setActiveSection(updatedSection);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-wfu-black text-white px-8 py-4 flex justify-between items-center border-b-4 border-wfu-gold">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-wfu-gold rounded-full flex items-center justify-center font-serif text-2xl font-bold">W</div>
          <div>
            <h1 className="font-serif text-2xl tracking-tight">Moral Imagination</h1>
            <p className="text-xs text-wfu-gold uppercase tracking-widest font-bold">Wake Forest University</p>
          </div>
        </div>
        <nav className="flex items-center gap-6">
          <button onClick={() => setView('dashboard')} className="hover:text-wfu-gold transition-colors flex items-center gap-2">
            <Layout size={18} /> Dashboard
          </button>
          <button onClick={() => setView('contributors')} className="hover:text-wfu-gold transition-colors flex items-center gap-2">
            <Users size={18} /> Contributors
          </button>
          <a href="https://shop.wfu.edu" target="_blank" rel="noopener noreferrer" className="bg-wfu-gold text-wfu-black px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-white transition-all">
            <ShoppingBag size={16} /> University Shop
          </a>
        </nav>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-serif font-bold text-wfu-black">Editorial Hub</h2>
                  <p className="text-gray-500 mt-2">Manage issues, assign writers, and track AI audits.</p>
                </div>
                <button 
                  onClick={createIssue}
                  className="bg-wfu-black text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-wfu-gold hover:text-wfu-black transition-all font-bold"
                >
                  <Plus size={20} /> New Issue
                </button>
              </div>

              {issues.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm overflow-hidden relative group">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 text-wfu-gold font-bold text-xs uppercase tracking-widest">
                        <Eye size={14} /> Featured Latest Issue
                      </div>
                      <h3 className="text-3xl font-serif font-bold">{issues[0].title}</h3>
                      <p className="text-gray-600 leading-relaxed">
                        The latest edition of Moral Imagination is currently in {issues[0].status} phase. 
                        Review the Dean's letter and the Moral Dialog of the week to ensure alignment with this month's theme.
                      </p>
                      <button 
                        onClick={() => selectIssue(issues[0])}
                        className="bg-wfu-gold text-wfu-black px-6 py-2 rounded-full font-bold text-sm hover:bg-wfu-black hover:text-white transition-all"
                      >
                        Continue Editing
                      </button>
                    </div>
                    <div className="w-full md:w-64 h-80 bg-gray-50 rounded-xl border border-gray-100 shadow-inner p-4 overflow-hidden relative">
                      {/* Mini Preview Mockup */}
                      <div className="text-[4px] font-serif text-center border-b border-wfu-gold pb-1 mb-2">
                        <p className="font-bold text-[6px]">MORAL IMAGINATION</p>
                        <p className="opacity-50">WAKE FOREST UNIVERSITY</p>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-full bg-gray-200 rounded-full" />
                        <div className="grid grid-cols-2 gap-1">
                          <div className="h-10 bg-gray-100 rounded" />
                          <div className="h-10 bg-gray-100 rounded" />
                        </div>
                        <div className="h-2 w-3/4 bg-gray-200 rounded-full" />
                        <div className="h-2 w-full bg-gray-200 rounded-full" />
                        <div className="h-2 w-1/2 bg-gray-200 rounded-full" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent flex items-end justify-center pb-4">
                        <span className="text-[10px] font-bold text-wfu-gold uppercase tracking-tighter">Quick View</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {issues.map(issue => (
                  <div 
                    key={issue.id}
                    onClick={() => selectIssue(issue)}
                    className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${issue.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-wfu-gold/20 text-wfu-gold-dark'}`}>
                        {issue.status}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            selectIssue(issue).then(() => setView('preview'));
                          }}
                          className="p-2 text-gray-400 hover:text-wfu-gold hover:bg-gray-50 rounded-lg transition-all"
                          title="Quick Preview"
                        >
                          <Eye size={18} />
                        </button>
                        <FileText className="text-gray-300 group-hover:text-wfu-gold transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-xl font-serif font-bold mb-2">{issue.title}</h3>
                    <p className="text-sm text-gray-500">Created on {new Date(issue.created_at).toLocaleDateString()}</p>
                    <div className="mt-6 flex items-center text-wfu-gold font-bold text-sm">
                      Open Editor <ChevronRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'editor' && selectedIssue && (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-12 gap-8"
            >
              {/* Sidebar: Sections */}
              <div className="col-span-4 space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-serif font-bold">{selectedIssue.title}</h2>
                  <button onClick={() => setView('preview')} className="text-wfu-gold hover:underline font-bold text-sm flex items-center gap-1">
                    <Eye size={16} /> Preview
                  </button>
                </div>
                <div className="space-y-2">
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${activeSection?.id === section.id ? 'bg-wfu-gold text-white border-wfu-gold' : 'bg-white border-gray-200 hover:border-wfu-gold'}`}
                    >
                      <div>
                        <p className="text-xs uppercase tracking-widest font-bold opacity-70">{section.type}</p>
                        <p className="font-medium">{section.author_name || 'Unassigned'}</p>
                      </div>
                      {section.status === 'approved' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} className="opacity-50" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main: Content Area */}
              <div className="col-span-8 bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                {activeSection ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-3xl font-serif font-bold">{activeSection.type}</h3>
                        <p className="text-gray-500">Limit: {activeSection.word_limit} words</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => sendReminder(activeSection)}
                          className="p-2 text-gray-400 hover:text-wfu-gold hover:bg-gray-50 rounded-lg transition-all" 
                          title="Send Reminder"
                        >
                          <Bell size={20} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-wfu-gold hover:bg-gray-50 rounded-lg transition-all" title="Reassign">
                          <RefreshCw size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Content Submission</label>
                      <textarea 
                        className="w-full h-64 p-6 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-wfu-gold focus:border-transparent outline-none transition-all font-serif leading-relaxed"
                        placeholder="Enter section content here..."
                        defaultValue={activeSection.content || ''}
                        onBlur={(e) => setActiveSection({ ...activeSection, content: e.target.value })}
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-400 uppercase">Status</span>
                          <span className={`text-sm font-bold ${activeSection.status === 'approved' ? 'text-green-600' : 'text-wfu-gold'}`}>
                            {activeSection.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAudit(activeSection, activeSection.content || '')}
                        disabled={isAuditing}
                        className="bg-wfu-black text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-wfu-gold hover:text-wfu-black transition-all disabled:opacity-50"
                      >
                        {isAuditing ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                        {isAuditing ? 'AI Auditing...' : 'Run AI Audit'}
                      </button>
                    </div>

                    {activeSection.ai_feedback && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-6 rounded-2xl border ${activeSection.status === 'approved' ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Settings size={16} className="text-wfu-gold" />
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">AI Editor Feedback</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{activeSection.ai_feedback}</p>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                    <BookOpen size={48} />
                    <p className="font-serif italic">Select a section to begin editing or review.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'contributors' && (
            <motion.div 
              key="contributors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-serif font-bold text-wfu-black">Contributor Directory</h2>
                  <p className="text-gray-500 mt-2">Manage writers and editors for the Moral Imagination newsletter.</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Email</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Role</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contributors.length > 0 ? contributors.map(c => (
                      <tr key={c.email} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium">{c.name}</td>
                        <td className="px-6 py-4 text-gray-500">{c.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-wfu-gold/10 text-wfu-gold-dark rounded text-xs font-bold uppercase">
                            {c.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-wfu-gold hover:text-wfu-gold-dark font-bold text-sm">Edit</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No contributors found. Add your first writer to get started.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {view === 'preview' && selectedIssue && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-5xl mx-auto space-y-12 pb-24"
            >
              {/* Page 1: Cover & Editorial */}
              <div className="bg-white shadow-2xl p-16 border border-gray-100 min-h-[1100px] relative flex flex-col">
                <div className="text-center border-b-8 border-double border-wfu-gold pb-8 mb-12">
                  <h1 className="text-8xl font-serif font-bold tracking-tighter mb-2">Moral Imagination</h1>
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
                    <span>Wake Forest University</span>
                    <span>{selectedIssue.title}</span>
                    <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-12 flex-1">
                  {/* Featured: Letter from the Dean */}
                  <div className="col-span-12 lg:col-span-8 space-y-6">
                    {sections.filter(s => s.type === 'Letter from the Dean').map(section => (
                      <div key={section.id} className="space-y-6">
                        <h2 className="font-serif text-4xl font-bold text-wfu-black italic">A Message from the Dean</h2>
                        <div className="font-serif text-lg text-gray-800 leading-relaxed first-letter:text-7xl first-letter:font-bold first-letter:text-wfu-gold first-letter:mr-3 first-letter:float-left whitespace-pre-wrap">
                          {section.content || <span className="text-gray-300 italic">The Dean is currently drafting this message...</span>}
                        </div>
                        {section.author_name && (
                          <p className="text-sm font-bold text-wfu-gold uppercase tracking-widest pt-4 border-t border-wfu-gold/20">— {section.author_name}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Sidebar: Quick Highlights */}
                  <div className="col-span-12 lg:col-span-4 bg-gray-50 p-8 rounded-2xl border border-gray-100 space-y-8">
                    <h3 className="font-serif text-xl font-bold border-b-2 border-wfu-gold pb-2">Inside This Issue</h3>
                    <ul className="space-y-4">
                      {sections.filter(s => s.type !== 'Letter from the Dean').map(s => (
                        <li key={s.id} className="flex gap-3 items-start">
                          <span className="text-wfu-gold font-bold">/</span>
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{s.type}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-8">
                      <div className="aspect-square bg-wfu-gold/10 rounded-xl flex items-center justify-center border-2 border-dashed border-wfu-gold/30">
                        <p className="text-[10px] font-bold text-wfu-gold uppercase tracking-widest text-center px-4">Featured Image Placeholder</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span>Page 01</span>
                  <span>Moral Imagination</span>
                </div>
              </div>

              {/* Page 2: Dialog & Events */}
              <div className="bg-white shadow-2xl p-16 border border-gray-100 min-h-[1100px] relative flex flex-col">
                <div className="grid grid-cols-2 gap-16 flex-1">
                  <div className="space-y-12">
                    {sections.filter(s => s.type === 'Moral Dialog of the Week').map(section => (
                      <div key={section.id} className="space-y-6">
                        <h2 className="font-serif text-3xl font-bold bg-wfu-black text-white px-4 py-2 inline-block">The Weekly Dialog</h2>
                        <div className="font-serif text-gray-800 leading-relaxed text-sm whitespace-pre-wrap columns-1">
                          {section.content || <span className="text-gray-300 italic">Dialog pending...</span>}
                        </div>
                      </div>
                    ))}
                    {sections.filter(s => s.type === 'Community Events').map(section => (
                      <div key={section.id} className="space-y-4 bg-wfu-gold/5 p-6 rounded-xl border-l-4 border-wfu-gold">
                        <h3 className="font-serif text-xl font-bold">Community Calendar</h3>
                        <div className="font-serif text-gray-700 text-sm whitespace-pre-wrap">
                          {section.content || <span className="text-gray-300 italic">No events scheduled...</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-12">
                    {sections.filter(s => s.type === 'Art/Poetry/Crafts').map(section => (
                      <div key={section.id} className="space-y-6">
                        <h2 className="font-serif text-3xl font-bold italic text-wfu-gold-dark">Creative Corner</h2>
                        <div className="font-serif text-gray-800 leading-relaxed text-sm whitespace-pre-wrap italic border-l-2 border-gray-100 pl-6">
                          {section.content || <span className="text-gray-300 italic">Awaiting artistic contribution...</span>}
                        </div>
                      </div>
                    ))}
                    {sections.filter(s => s.type === 'Health Note').map(section => (
                      <div key={section.id} className="space-y-4 border-2 border-wfu-black p-6">
                        <h3 className="font-serif text-lg font-bold uppercase tracking-tighter">Wellness Note</h3>
                        <div className="font-serif text-gray-700 text-xs leading-loose whitespace-pre-wrap">
                          {section.content || <span className="text-gray-300 italic">Health insights pending...</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span>Page 02</span>
                  <span>Moral Imagination</span>
                </div>
              </div>

              {/* Page 3: Spiritual & Biblical */}
              <div className="bg-white shadow-2xl p-16 border border-gray-100 min-h-[1100px] relative flex flex-col">
                <div className="flex-1 space-y-16">
                   <div className="grid grid-cols-12 gap-12">
                      <div className="col-span-12 lg:col-span-7">
                        {sections.filter(s => s.type === 'Spiritual Formation Connection').map(section => (
                          <div key={section.id} className="space-y-6">
                            <h2 className="font-serif text-3xl font-bold">Spiritual Formation</h2>
                            <div className="font-serif text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">
                              {section.content || <span className="text-gray-300 italic">Pending...</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="col-span-12 lg:col-span-5">
                        {sections.filter(s => s.type === 'Biblical Interpretation').map(section => (
                          <div key={section.id} className="space-y-6 bg-gray-900 text-white p-8 rounded-3xl">
                            <h2 className="font-serif text-2xl font-bold text-wfu-gold">Scriptural Insight</h2>
                            <div className="font-serif text-gray-300 leading-relaxed text-xs whitespace-pre-wrap">
                              {section.content || <span className="text-gray-500 italic">Interpretation pending...</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   {sections.filter(s => s.type === 'Impact/Service Highlight').map(section => (
                      <div key={section.id} className="space-y-8 border-t-4 border-wfu-gold pt-12">
                        <div className="text-center max-w-2xl mx-auto">
                          <h2 className="font-serif text-4xl font-bold mb-4">Impact & Service</h2>
                          <p className="text-wfu-gold font-bold uppercase tracking-[0.2em] text-xs mb-8">Highlighting our community in action</p>
                        </div>
                        <div className="font-serif text-gray-800 leading-relaxed text-base whitespace-pre-wrap columns-2 gap-12">
                          {section.content || <span className="text-gray-300 italic">Service highlight pending...</span>}
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span>Page 03</span>
                  <span>Moral Imagination</span>
                </div>
              </div>

              {/* Page 4: Book Club & Store */}
              <div className="bg-white shadow-2xl p-16 border border-gray-100 min-h-[1100px] relative flex flex-col">
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-12">
                  {sections.filter(s => s.type === 'Book Club').map(section => (
                    <div key={section.id} className="max-w-xl space-y-6">
                      <div className="w-20 h-1 bg-wfu-gold mx-auto" />
                      <h2 className="font-serif text-3xl font-bold">The Book Club Selection</h2>
                      <div className="font-serif text-gray-800 leading-relaxed text-lg italic whitespace-pre-wrap">
                        {section.content || <span className="text-gray-300 italic">Next selection pending...</span>}
                      </div>
                    </div>
                  ))}

                  <div className="bg-wfu-black text-white p-12 rounded-[3rem] w-full max-w-2xl space-y-6">
                    <ShoppingBag size={48} className="mx-auto text-wfu-gold" />
                    <h3 className="text-3xl font-serif font-bold">Support Our Mission</h3>
                    <p className="text-gray-400 font-serif italic">
                      Visit the University Shop to purchase Moral Imagination merchandise. 
                      All proceeds support our community outreach programs.
                    </p>
                    <a 
                      href="https://shop.wfu.edu" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block bg-wfu-gold text-wfu-black px-10 py-4 rounded-full font-bold hover:bg-white transition-all"
                    >
                      Shop the Collection
                    </a>
                  </div>
                </div>

                <div className="mt-auto pt-20 text-center space-y-6">
                  <div className="flex justify-center gap-8">
                    <a href="#" className="text-wfu-gold font-bold text-xs hover:underline uppercase tracking-widest">Unsubscribe</a>
                    <a href="#" className="text-wfu-gold font-bold text-xs hover:underline uppercase tracking-widest">Privacy Policy</a>
                    <a href="#" className="text-wfu-gold font-bold text-xs hover:underline uppercase tracking-widest">Contact Editor</a>
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                    © {new Date().getFullYear()} Wake Forest University. All Rights Reserved.
                  </p>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span>Page 04</span>
                  <span>Moral Imagination</span>
                </div>
              </div>

              <button 
                onClick={() => setView('editor')}
                className="fixed bottom-8 right-8 bg-wfu-black text-white p-4 rounded-full shadow-xl hover:bg-wfu-gold hover:text-wfu-black transition-all"
              >
                <Layout size={24} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Notification Modal */}
      <AnimatePresence>
        {notificationDraft && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-serif font-bold">AI-Generated Notification</h3>
                <button onClick={() => setNotificationDraft(null)} className="text-gray-400 hover:text-black">
                  <Plus className="rotate-45" />
                </button>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 font-serif text-gray-700 whitespace-pre-wrap mb-6">
                {notificationDraft}
              </div>
              <div className="flex justify-end gap-4">
                <button onClick={() => setNotificationDraft(null)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all">
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    alert('Notification sent successfully!');
                    setNotificationDraft(null);
                  }}
                  className="bg-wfu-black text-white px-8 py-3 rounded-xl font-bold hover:bg-wfu-gold hover:text-wfu-black transition-all flex items-center gap-2"
                >
                  <Send size={18} /> Send Notification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer / Status Bar */}
      <footer className="bg-white border-t border-gray-200 px-8 py-3 flex justify-between items-center text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-green-500" /> System Online</span>
          <span className="flex items-center gap-1"><Users size={14} /> 12 Active Contributors</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="hover:text-wfu-gold transition-colors">Help & Docs</button>
          <button className="hover:text-wfu-gold transition-colors">API Status</button>
        </div>
      </footer>
    </div>
  );
}
