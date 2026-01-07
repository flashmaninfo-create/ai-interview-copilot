/**
 * Credits Page
 *
 * Shows credit balance, transaction history, and purchase options.
 */

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { creditService, type CreditTransaction } from '../../lib/services/creditService';

export function CreditsPage() {
    const { user } = useAuth();

    const [balance, setBalance] = useState<number>(0);
    const [history, setHistory] = useState<CreditTransaction[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const limit = 10;

    // Fetch balance and history
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const [balanceResult, historyResult] = await Promise.all([
            creditService.getBalance(),
            creditService.getHistory({ limit, offset: page * limit }),
        ]);

        if (!balanceResult.success) {
            setError(balanceResult.error?.message || 'Failed to load balance');
        } else {
            setBalance(balanceResult.data!.balance);
        }

        if (!historyResult.success) {
            setError((e) => e || historyResult.error?.message || 'Failed to load history');
        } else {
            setHistory(historyResult.data!.history);
            setTotal(historyResult.data!.total);
        }

        setLoading(false);
    }, [page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Subscribe to realtime changes
    useEffect(() => {
        if (!user) return;

        const channel = creditService.subscribeToChanges(user.id, (transaction) => {
            setBalance(transaction.balance_after);
            setHistory((prev) => [transaction, ...prev].slice(0, limit));
            setTotal((t) => t + 1);
        });

        return () => {
            channel.unsubscribe();
        };
    }, [user]);

    const getTransactionIcon = (_type: CreditTransaction['reference_type'], amount: number) => {
        if (amount > 0) {
            return (
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                    </svg>
                </div>
            );
        }
        return (
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
            </div>
        );
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">Credits</h1>
                <p className="text-muted-foreground">Manage your interview credits</p>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-primary to-green-800 text-white rounded-2xl p-8 mb-8 shadow-lg border border-primary/20">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/80 text-sm font-medium mb-1">Available Credits</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold">{loading ? '—' : balance}</span>
                            <span className="text-white/60">credits</span>
                        </div>
                        {balance === 0 && !loading && (
                            <p className="mt-2 text-amber-200 text-sm">
                                You need credits to start interviews
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <Link
                            to="/pricing"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-all shadow"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                            </svg>
                            Buy Credits
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Per Interview</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">1 credit</p>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">When Charged</span>
                    </div>
                    <p className="text-sm text-foreground">Only on completed interviews</p>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">No Charge</span>
                    </div>
                    <p className="text-sm text-foreground">Failed or cancelled sessions</p>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6 border border-destructive/20">
                    {error}
                </div>
            )}

            {/* Transaction History */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="border-b border-border px-6 py-4">
                    <h2 className="font-semibold text-foreground">Transaction History</h2>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading history...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <p className="text-muted-foreground font-medium">No transactions yet</p>
                        <p className="text-muted-foreground text-sm">Complete your first interview to see activity here</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-border">
                            {history.map((tx) => (
                                <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors">
                                    {getTransactionIcon(tx.reference_type, tx.amount)}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">
                                            {tx.description}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDate(tx.created_at)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-destructive'}`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Balance: {tx.balance_after}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {total > limit && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                                <p className="text-sm text-muted-foreground">
                                    Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="px-3 py-1.5 border border-border rounded text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={(page + 1) * limit >= total}
                                        className="px-3 py-1.5 border border-border rounded text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default CreditsPage;
