import React, { useEffect, useState } from 'react';
import { Filter, Phone, RefreshCw } from 'lucide-react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const STATUS_STYLES = {
    new: 'bg-primary/10 text-primary border border-primary/20',
    contacted: 'bg-warning/10 text-warning border border-warning/20',
    converted: 'bg-success/10 text-success border border-success/20'
};
const STATUS_OPTIONS = ['new', 'contacted', 'converted'];
const FILTER_OPTIONS = ['All', 'new', 'contacted', 'converted'];

const AdminCCTVEnquiries = () => {
    const [enquiries, setEnquiries] = useState([]);
    const [notesDrafts, setNotesDrafts] = useState({});
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [updating, setUpdating] = useState(null);
    const { getToken } = useClerkAuth();

    const load = async (status) => {
        setLoading(true);
        try {
            const url = status && status !== 'All' ? `${API_BASE}/cctv/admin/enquiries?status=${status}` : `${API_BASE}/cctv/admin/enquiries`;
            const token = await getToken();
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load enquiries');
            if (data.success) {
                setEnquiries(data.enquiries);
                setTotal(data.total);
                setNotesDrafts(data.enquiries.reduce((acc, enquiry) => ({ ...acc, [enquiry.id]: enquiry.adminNotes || '' }), {}));
            }
        } catch (err) {
            console.error('Failed to load CCTV enquiries:', err);
            toast.error(err.message || 'Failed to load CCTV enquiries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(filter); }, [filter]);

    const updateEnquiry = async (id, payload, successMessage) => {
        setUpdating(id);
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/cctv/admin/enquiries/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update enquiry');
            setEnquiries(prev => prev.map(enquiry => enquiry.id === id ? data.enquiry : enquiry));
            setNotesDrafts(prev => ({ ...prev, [id]: data.enquiry.adminNotes || '' }));
            toast.success(successMessage);
        } catch (err) {
            console.error('Failed to update CCTV enquiry:', err);
            toast.error(err.message || 'Failed to update enquiry');
        } finally {
            setUpdating(null);
        }
    };

    const stats = {
        total,
        new: enquiries.filter(enquiry => enquiry.status === 'new').length,
        contacted: enquiries.filter(enquiry => enquiry.status === 'contacted').length,
        converted: enquiries.filter(enquiry => enquiry.status === 'converted').length
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-black">CCTV Enquiries</h1>
                    <p className="text-text-muted">Manage leads from the CCTV Security landing page.</p>
                </div>
                <button type="button" onClick={() => load(filter)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold border border-border-default rounded-lg hover:bg-surface-hover transition-colors">
                    <RefreshCw size={15} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: total, color: 'bg-primary/5 text-primary' },
                    { label: 'New', value: stats.new, color: 'bg-primary/10 text-primary' },
                    { label: 'Contacted', value: stats.contacted, color: 'bg-warning/10 text-warning' },
                    { label: 'Converted', value: stats.converted, color: 'bg-success/10 text-success' }
                ].map(stat => <div key={stat.label} className={`rounded-lg p-5 ${stat.color}`}><div className="text-3xl font-black">{stat.value}</div><div className="text-sm font-bold mt-1">{stat.label}</div></div>)}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <Filter size={16} className="text-text-muted" />
                {FILTER_OPTIONS.map(option => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setFilter(option)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black transition-all capitalize ${filter === option ? 'bg-primary text-white shadow-sm' : 'bg-surface border border-border-default text-text-muted hover:border-primary hover:text-primary'}`}
                    >
                        {option}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="p-12 text-center text-text-muted">Loading enquiries...</div>
            ) : enquiries.length === 0 ? (
                <div className="p-12 text-center bg-surface rounded-lg border border-dashed border-border-default text-text-muted">No enquiries found for this filter.</div>
            ) : (
                <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border-default bg-surface text-xs text-text-muted font-black uppercase tracking-wider">
                                    <th className="px-5 py-4">Name</th>
                                    <th className="px-5 py-4">Phone</th>
                                    <th className="px-5 py-4">City / Area</th>
                                    <th className="px-5 py-4">Property</th>
                                    <th className="px-5 py-4">Cameras</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4">Date</th>
                                    <th className="px-5 py-4">Message</th>
                                    <th className="px-5 py-4">Admin Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-default">
                                {enquiries.map(enquiry => (
                                    <tr key={enquiry.id} className="hover:bg-surface-hover transition-colors align-top">
                                        <td className="px-5 py-4"><div className="font-bold text-sm text-text-primary">{enquiry.name}</div></td>
                                        <td className="px-5 py-4">
                                            <a href={`tel:+91${enquiry.phone}`} className="text-primary font-bold text-sm hover:underline flex items-center gap-1">
                                                <Phone size={13} />
                                                +91 {enquiry.phone}
                                            </a>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-text-muted whitespace-nowrap">{enquiry.city}</td>
                                        <td className="px-5 py-4 text-sm font-medium text-text-primary whitespace-nowrap">{enquiry.propertyType}</td>
                                        <td className="px-5 py-4 text-sm text-text-muted whitespace-nowrap">{enquiry.camerasNeeded}</td>
                                        <td className="px-5 py-4">
                                            <select
                                                value={enquiry.status}
                                                disabled={updating === enquiry.id}
                                                onChange={(e) => updateEnquiry(enquiry.id, { status: e.target.value }, 'Status updated')}
                                                className={`text-xs font-black px-3 py-1.5 rounded-full border cursor-pointer ${STATUS_STYLES[enquiry.status]} bg-transparent focus:outline-none`}
                                            >
                                                {STATUS_OPTIONS.map(status => <option key={status} value={status} className="bg-surface text-text-primary capitalize">{status}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-5 py-4 text-xs text-text-muted whitespace-nowrap">
                                            {new Date(enquiry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            <br />
                                            {new Date(enquiry.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-5 py-4 text-xs text-text-muted max-w-56">{enquiry.message || <span className="italic opacity-50">No message</span>}</td>
                                        <td className="px-5 py-4 min-w-64">
                                            <div className="space-y-2">
                                                <textarea
                                                    rows={3}
                                                    value={notesDrafts[enquiry.id] || ''}
                                                    onChange={(e) => setNotesDrafts(prev => ({ ...prev, [enquiry.id]: e.target.value }))}
                                                    className="input-field h-20 py-2"
                                                    placeholder="Internal notes..."
                                                />
                                                <Button type="button" size="sm" variant="outline" disabled={updating === enquiry.id} onClick={() => updateEnquiry(enquiry.id, { adminNotes: notesDrafts[enquiry.id] || '' }, 'Notes saved')}>
                                                    {updating === enquiry.id ? 'Saving...' : 'Save Notes'}
                                                </Button>
                                            </div>
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

export default AdminCCTVEnquiries;
