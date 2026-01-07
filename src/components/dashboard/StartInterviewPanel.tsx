import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { interviewService } from '../../lib/services/interviewService';
import type { InterviewType, InterviewDifficulty } from '../../types/interview';

const interviewTypes: { value: InterviewType; label: string }[] = [
    { value: 'technical', label: 'Technical Interview' },
    { value: 'behavioral', label: 'Behavioral Interview' },
];

const difficulties: { value: InterviewDifficulty; label: string }[] = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
];

interface StartInterviewPanelProps {
    credits: number;
    onSessionCreated?: (sessionId: string) => void;
}

export function StartInterviewPanel({ credits, onSessionCreated }: StartInterviewPanelProps) {
    const { user } = useAuth();
    const [type, setType] = useState<InterviewType>('technical');
    const [role, setRole] = useState('Software Engineer');
    const [difficulty, setDifficulty] = useState<InterviewDifficulty>('medium');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleStartInterview = async () => {
        if (credits < 1) {
            setError('Insufficient credits. Please purchase more credits to continue.');
            return;
        }

        if (!user) {
            setError('You must be logged in to start an interview.');
            return;
        }

        setLoading(true);
        setError(null);

        const { data, error: createError } = await interviewService.createSession(user.id, {
            type,
            role,
            difficulty,
        });

        if (createError || !data) {
            setError(createError?.message || 'Failed to create session. Please try again.');
            setLoading(false);
            return;
        }

        if (onSessionCreated) {
            onSessionCreated(data.id);
        }

        navigate(`/dashboard/session/${data.id}`);
    };

    return (
        <div className="bg-surface rounded-2xl shadow-sm border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-6">Start New Interview</h2>

            {error && (
                <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm mb-4 border border-red-500/20">
                    {error}
                </div>
            )}

            {/* Low Credits Warning */}
            {!error && credits < 2 && credits > 0 && (
                <div className="bg-amber-500/10 text-amber-500 p-3 rounded-lg text-sm mb-4 border border-amber-500/20 flex items-center gap-2">
                    <span className="font-bold">⚠️ Low Credits:</span>
                    You have only {credits} credit{credits === 1 ? '' : 's'} remaining.
                </div>
            )}

            <div className="space-y-4">
                {/* Interview Type */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Interview Type</label>
                    <div className="grid grid-cols-2 gap-3">
                        {interviewTypes.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setType(t.value)}
                                className={`p-4 rounded-lg border-2 text-center transition-all ${type === t.value
                                    ? 'border-primary bg-primary/20 text-primary'
                                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-white/5'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Role */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Target Role</label>
                    <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-background text-white focus:outline-primary placeholder-slate-500"
                        placeholder="e.g., Software Engineer, Product Manager"
                    />
                </div>

                {/* Difficulty */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Difficulty</label>
                    <div className="flex gap-3">
                        {difficulties.map((d) => (
                            <button
                                key={d.value}
                                onClick={() => setDifficulty(d.value)}
                                className={`flex-1 py-3 rounded-lg border-2 text-center transition-all ${difficulty === d.value
                                    ? 'border-primary bg-primary/20 text-primary font-semibold'
                                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-white/5'
                                    }`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Start Button */}
                <button
                    onClick={handleStartInterview}
                    disabled={loading || credits < 1}
                    className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                    {loading ? 'Starting...' : `Start Interview (1 Credit)`}
                </button>

                <p className="text-center text-sm text-slate-500">
                    Available Credits: <span className="font-bold text-primary">{credits}</span>
                </p>
            </div>
        </div>
    );
}
