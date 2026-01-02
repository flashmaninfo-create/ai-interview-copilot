
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { planService } from '../../lib/services/planService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Database } from '../../types/database.types';

type Plan = Database['public']['Tables']['plans']['Row'];

export function AdminPlansPage() {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPlans();
    }, []);

    async function loadPlans() {
        setLoading(true);
        const { data, error } = await planService.getAllPlans();
        if (error) {
            setError(error.message);
        } else {
            setPlans(data);
        }
        setLoading(false);
    }

    async function togglePlanStatus(plan: Plan) {
        const { error } = await planService.updatePlan(plan.id, { is_active: !plan.is_active });
        if (error) {
            alert('Failed to update plan status');
        } else {
            loadPlans();
        }
    }

    async function handleDelete(planId: string) {
        if (!confirm('Are you sure you want to delete this plan?')) return;

        const { error } = await planService.deletePlan(planId);
        if (error) {
            alert('Failed to delete plan: ' + error.message);
        } else {
            loadPlans();
        }
    }

    if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-900">Manage Plans</h1>
                <button
                    onClick={() => navigate('/admin/plans/new')}
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors"
                >
                    Create New Plan
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Price/Mo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Credits</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {plans.map((plan) => (
                            <tr key={plan.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-slate-900">{plan.name}</div>
                                    <div className="text-xs text-slate-500">{plan.slug}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                    ${(plan.price_monthly / 100).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                    {plan.credits_monthly}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                                        }`}>
                                        {plan.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => navigate(`/admin/plans/${plan.id}`)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => togglePlanStatus(plan)}
                                        className="text-slate-600 hover:text-slate-900 mr-4"
                                    >
                                        {plan.is_active ? 'Disable' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(plan.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {plans.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    No plans found. Create one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
