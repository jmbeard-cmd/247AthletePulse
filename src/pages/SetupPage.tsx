import { Activity, Database, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const steps = [
  {
    step: 1,
    title: 'Create a Supabase project',
    description: 'Go to supabase.com and create a free project.',
    action: (
      <a
        href="https://supabase.com/dashboard/new"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-inter text-sm font-medium transition-colors"
      >
        Open Supabase <ExternalLink className="w-3.5 h-3.5" />
      </a>
    ),
  },
  {
    step: 2,
    title: 'Run the database migration',
    description: 'In your Supabase dashboard, go to SQL Editor and paste the contents of supabase/migrations.sql, then run it.',
    code: 'supabase/migrations.sql',
  },
  {
    step: 3,
    title: 'Set your environment variables',
    description: 'Find your Project URL and anon public key in Settings > API, then update your .env file:',
    code: `VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGci...`,
  },
  {
    step: 4,
    title: 'Restart the development server',
    description: 'After updating .env, restart the app to connect to your Supabase project.',
  },
];

export function SetupPage() {
  const [copied, setCopied] = useState<number | null>(null);

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-700 shadow-lg mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-outfit text-3xl font-bold text-gray-900">247 Athlete Pulse</h1>
          <p className="text-gray-500 mt-1 font-inter">Weekly Mindset Check-In Platform</p>
        </div>

        {/* Setup card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-outfit text-xl font-bold text-gray-900">Supabase Setup Required</h2>
              <p className="font-inter text-sm text-gray-500">Connect your database to get started</p>
            </div>
          </div>

          <div className="space-y-6">
            {steps.map((s, idx) => (
              <div key={s.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-700 text-white rounded-full flex items-center justify-center font-outfit font-bold text-sm mt-0.5">
                  {s.step}
                </div>
                <div className="flex-1">
                  <h3 className="font-outfit font-bold text-gray-900 mb-1">{s.title}</h3>
                  <p className="font-inter text-sm text-gray-500 mb-2">{s.description}</p>
                  {s.action}
                  {s.code && (
                    <div className="relative mt-2">
                      <pre className="bg-gray-900 text-green-400 rounded-xl p-3 text-xs font-mono overflow-x-auto">
                        {s.code}
                      </pre>
                      <button
                        onClick={() => copy(s.code!, idx)}
                        className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                      >
                        {copied === idx ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="font-inter text-sm text-blue-700">
              <strong className="font-semibold">First user tip:</strong> The first admin account needs to be created manually.
              After running the migration, register with any invite code (create one via SQL), then update your role to 'admin' in the profiles table.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 font-inter">
          <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">
            Vibed with Shakespeare
          </a>
        </p>
      </div>
    </div>
  );
}
