import React, { useState, useEffect } from 'react';
import { Phone, RefreshCw, Filter } from 'lucide-react';
import { getAuthHeaders } from '../../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_STYLES = {
    new: 'bg-primary/10 text-primary border border-primary/20',
    contacted: 'bg-warning/10 text-warning border border-warning/20',
    converted: 'bg-success/10 text-success border border-success/20'
};

const STATUS_OPTIONS = ['new', 'contacted', 'converted'];
const FILTER_OPTIONS = ['All', 'new', 'contacted', 'converted'];

const AdminTallyEnquiries = () => {
    const [enquiries, setEnquiries] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [updating, setUpdating] = useState(null);

    const load = async (status) => {
        setLoading(true);
        try {
            const url = status && status !== 'All'
                ? `${API_BASE}/tally/admin/enquiries?status=${status}`
                : `${API_BASE}/tally/admin/enquiries`;
            const headers = await getAuthHeaders();
            const res = await fetch(url, { headers });
            const data = await res.json();
            if (data.success) {
                setEnquiries(data.enquiries);
                setTotal(data.total);
            }
        } catch (err) {
            console.error('Failed to load Tally enquiries:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(filter); }, [filter]);

    const updateStatus = async (id, status) => {
        setUpdating(id);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE}/tally/admin/enquiries/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setUpdating(null);
        }
    };

    const stats = {
        total: enquiries.length === 0 && filter === 'All' ? total : enquiries.length,
        new: enquiries.filter(e => e.status === 'new').length,
        contacted: enquiries.filter(e => e.status === 'contacted').length,
        converted: enquiries.filter(e => e.status === 'converted').length,
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-black">Tally ERP Enquiries</h1>
                    <p className="text-text-muted">Manage leads from the Tally ERP landing page.</p>
                </div>
                <button onClick={() => load(filter)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold border border-border-default rounded-lg hover:bg-surface-hover transition-colors">
                    <RefreshCw size={15} /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: total, color: 'bg-primary/5 text-primary' },
                    { label: 'New', value: stats.new, color: 'bg-primary/10 text-primary' },
                    { label: 'Contacted', value: stats.contacted, color: 'bg-warning/10 text-warning' },
                    { label: 'Converted', value: stats.converted, color: 'bg-success/10 text-success' },
                ].map(s => (
                    <div key={s.label} className={`rounded-lg p-5 ${s.color}`}>
                        <div className="text-3xl font-black">{s.value}</div>
                        <div className="text-sm font-bold mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <Filter size={16} className="text-text-muted" />
                {FILTER_OPTIONS.map(opt => (
                    <button
                        key={opt}
                        onClick={() => setFilter(opt)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black transition-all capitalize ${filter === opt
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-surface border border-border-default text-text-muted hover:border-primary hover:text-primary'
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="p-12 text-center text-text-muted">Loading enquiries...</div>
            ) : enquiries.length === 0 ? (
                <div className="p-12 text-center bg-surface rounded-lg border border-dashed border-border-default text-text-muted">
                    No enquiries found for this filter.
                </div>
            ) : (
                <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border-default bg-surface text-xs text-text-muted font-black uppercase tracking-wider">
                                    <th className="px-5 py-4">Name / Business</th>
                                    <th className="px-5 py-4">Phone</th>
                                    <th className="px-5 py-4">City</th>
                                    <th className="px-5 py-4">License Type</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4">Date</th>
                                    <th className="px-5 py-4">Message</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-default">
                                {enquiries.map(enq => (
                                    <tr key={enq.id} className="hover:bg-surface-hover transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-sm">{enq.name}</div>
                                            <div className="text-xs text-text-muted">{enq.businessName}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <a
                                                href={`tel:+91${enq.phone}`}
                                                className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
                                            >
                                                <Phone size={13} /> +91 {enq.phone}
                                            </a>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-text-muted">{enq.city}</td>
                                        <td className="px-5 py-4 text-sm font-medium max-w-[160px]">{enq.licenseType}</td>
                                        <td className="px-5 py-4">
                                            <select
                                                value={enq.status}
                                                disabled={updating === enq.id}
                                                onChange={e => updateStatus(enq.id, e.target.value)}
                                                className={`text-xs font-black px-3 py-1.5 rounded-full border cursor-pointer ${STATUS_STYLES[enq.status]} bg-transparent focus:outline-none`}
                                            >
                                                {STATUS_OPTIONS.map(s => (
                                                    <option key={s} value={s} className="bg-surface text-text-primary capitalize">{s}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-5 py-4 text-xs text-text-muted whitespace-nowrap">
                                            {new Date(enq.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            <br />
                                            {new Date(enq.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-5 py-4 text-xs text-text-muted max-w-[200px] truncate">
                                            {enq.message || <span className="italic opacity-50">No message</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTallyEnquiries;
