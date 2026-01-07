/**
 * New Interview Session Dialog/Page
 * 
 * Allows users to create a new interview session with specified parameters.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService, type SessionType, type SessionDifficulty } from '../../lib/services/sessionService';

export function NewSessionPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        role: '',
        type: 'technical' as SessionType,
        difficulty: 'medium' as SessionDifficulty,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.role.trim()) {
            setError('Please enter a role');
            return;
        }

        setLoading(true);
        setError(null);

        const result = await sessionService.create({
            role: formData.role.trim(),
            type: formData.type,
            difficulty: formData.difficulty,
        });

        if (!result.success) {
            setError(result.error?.message || 'Failed to create session');
            setLoading(false);
            return;
        }

        // Navigate to the session
        navigate(`/dashboard/session/${result.data?.id}`);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-xl">
            <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">Start New Interview</h1>
                <p className="text-muted-foreground mb-6">Configure your practice session</p>

                {error && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6 border border-destructive/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Role Input */}
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Target Role
                        </label>
                        <input
                            type="text"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            placeholder="e.g., Software Engineer, Product Manager"
                            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors placeholder-muted-foreground"
                            disabled={loading}
                        />
                    </div>

                    {/* Interview Type */}
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Interview Type
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['technical', 'behavioral', 'mixed'] as SessionType[]).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, type }))}
                                    className={`px-4 py-3 rounded-lg border-2 font-medium capitalize transition-all ${formData.type === type
                                            ? 'border-primary bg-primary/20 text-primary'
                                            : 'border-input text-muted-foreground hover:border-primary/50 hover:bg-muted'
                                        }`}
                                    disabled={loading}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Difficulty
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {([
                                { value: 'easy', label: 'Easy', desc: 'Entry level' },
                                { value: 'medium', label: 'Medium', desc: 'Mid-level' },
                                { value: 'hard', label: 'Hard', desc: 'Senior+' },
                            ] as const).map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, difficulty: option.value }))}
                                    className={`px-4 py-3 rounded-lg border-2 transition-all ${formData.difficulty === option.value
                                            ? 'border-primary bg-primary/20'
                                            : 'border-input hover:border-primary/50 hover:bg-muted'
                                        }`}
                                    disabled={loading}
                                >
                                    <div className={`font-medium ${formData.difficulty === option.value ? 'text-primary' : 'text-foreground'
                                        }`}>
                                        {option.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{option.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !formData.role.trim()}
                        className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                Creating Session...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Start Interview
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                    This will use 1 credit when completed
                </p>
            </div>
        </div>
    );
}

export default NewSessionPage;
