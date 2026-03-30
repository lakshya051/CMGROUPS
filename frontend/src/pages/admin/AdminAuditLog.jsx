import React, { useState, useEffect, useCallback } from 'react';
import { ScrollText, Search, Filter, ChevronLeft, ChevronRight, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import SectionLoader from '../../components/ui/SectionLoader';

const ACTION_COLORS = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    STATUS_CHANGE: 'bg-amber-100 text-amber-800',
    ROLE_CHANGE: 'bg-purple-100 text-purple-800',
    PAYMENT_VERIFY: 'bg-emerald-100 text-emerald-800',
    REFUND_APPROVE: 'bg-teal-100 text-teal-800',
    REFUND_REJECT: 'bg-orange-100 text-orange-800',
};

const ENTITY_OPTIONS = [
    'Product', 'Order', 'Category', 'ServiceType',
    'ServiceBooking', 'User', 'TallyEnquiry', 'CCTVEnquiry',
];

const ACTION_OPTIONS = [
    'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE',
    'ROLE_CHANGE', 'PAYMENT_VERIFY', 'REFUND_APPROVE', 'REFUND_REJECT',
];

const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const DetailValue = ({ label, value }) => {
    if (value === null || value === undefined) return null;
    const display = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    return (
        <div className="text-xs">
            <span className="text-text-muted">{label}: </span>
            {typeof value === 'object' ? (
                <pre className="mt-1 bg-page-bg rounded p-2 overflow-x-auto text-[11px] leading-tight whitespace-pre-wrap break-all">{display}</pre>
            ) : (
                <span className="font-medium">{display}</span>
            )}
        </div>
    );
};

const LogRow = ({ log }) => {
    const [expanded, setExpanded] = useState(false);
    const details = log.details;
    const hasDetails = details && Object.keys(details).length > 0;

    return (
        <div className="border border-border-default rounded-lg bg-surface overflow-hidden">
            <button
                onClick={() => hasDetails && setExpanded(!expanded)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 ${hasDetails ? 'cursor-pointer hover:bg-surface-hover' : 'cursor-default'} transition-colors`}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                            {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-medium text-text-primary">{log.entity}</span>
                        <span className="text-xs text-text-muted">#{log.entityId}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                            <User size={12} />
                            {log.user?.name || log.user?.email || `User #${log.userId}`}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(log.createdAt)}
                        </span>
                        {log.ipAddress && (
                            <span className="hidden sm:inline">{log.ipAddress}</span>
                        )}
                    </div>
                </div>
                {hasDetails && (
                    expanded ? <ChevronUp size={16} className="text-text-muted mt-1 shrink-0" /> : <ChevronDown size={16} className="text-text-muted mt-1 shrink-0" />
                )}
            </button>
            {expanded && hasDetails && (
                <div className="px-4 pb-3 pt-0 border-t border-border-default space-y-2">
                    {details.before && <DetailValue label="Before" value={details.before} />}
                    {details.after && <DetailValue label="After" value={details.after} />}
                    {details.changedFields && (
                        <div className="text-xs">
                            <span className="text-text-muted">Changed fields: </span>
                            <span className="font-medium">{details.changedFields.join(', ')}</span>
                        </div>
                    )}
                    {details.targetUser && (
                        <div className="text-xs"><span className="text-text-muted">Target user: </span><span className="font-medium">{details.targetUser}</span></div>
                    )}
                    {details.refundAmount !== undefined && (
                        <div className="text-xs"><span className="text-text-muted">Refund amount: </span><span className="font-medium">₹{details.refundAmount}</span></div>
                    )}
                    {details.meta && <DetailValue label="Note" value={details.meta} />}
                </div>
            )}
        </div>
    );
};

const AdminAuditLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(1); }, [debouncedSearch, entityFilter, actionFilter]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminAPI.getAuditLogs({
                page,
                limit: 30,
                entity: entityFilter || undefined,
                action: actionFilter || undefined,
                search: debouncedSearch || undefined,
            });
            setLogs(res.data || []);
            setTotalPages(res.pagination?.totalPages || 1);
            setTotal(res.pagination?.total || 0);
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoading(false);
        }
    }, [page, entityFilter, actionFilter, debouncedSearch]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
                    <ScrollText size={24} className="text-primary" />
                    Audit Log
                </h1>
                <p className="text-text-muted text-sm mt-1">
                    Track all admin actions — who did what and when.
                </p>
            </div>

            {/* Search & Filters */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Search by admin name, email, or entity ID…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-border-default rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-border-default bg-surface text-text-muted hover:bg-surface-hover'}`}
                    >
                        <Filter size={16} />
                        Filters
                        {(entityFilter || actionFilter) && (
                            <span className="ml-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                                {(entityFilter ? 1 : 0) + (actionFilter ? 1 : 0)}
                            </span>
                        )}
                    </button>
                </div>

                {showFilters && (
                    <div className="flex flex-wrap gap-3 p-4 border border-border-default rounded-lg bg-surface">
                        <div>
                            <label className="block text-xs text-text-muted mb-1 font-medium">Entity</label>
                            <select
                                value={entityFilter}
                                onChange={(e) => setEntityFilter(e.target.value)}
                                className="px-3 py-2 border border-border-default rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="">All Entities</option>
                                {ENTITY_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-text-muted mb-1 font-medium">Action</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="px-3 py-2 border border-border-default rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="">All Actions</option>
                                {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                            </select>
                        </div>
                        {(entityFilter || actionFilter) && (
                            <button
                                onClick={() => { setEntityFilter(''); setActionFilter(''); }}
                                className="self-end px-3 py-2 text-sm text-error hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Summary */}
            <p className="text-xs text-text-muted">
                {total.toLocaleString()} log{total !== 1 ? 's' : ''} found
                {entityFilter && <> &middot; Entity: <strong>{entityFilter}</strong></>}
                {actionFilter && <> &middot; Action: <strong>{actionFilter.replace(/_/g, ' ')}</strong></>}
            </p>

            {/* Log List */}
            {loading ? (
                <SectionLoader />
            ) : logs.length === 0 ? (
                <div className="text-center py-16 text-text-muted">
                    <ScrollText size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No audit logs found</p>
                    <p className="text-sm mt-1">Admin actions will appear here once recorded.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {logs.map(log => <LogRow key={log.id} log={log} />)}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-text-muted">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="flex items-center gap-1 px-3 py-1.5 border border-border-default rounded-lg text-sm disabled:opacity-40 hover:bg-surface-hover transition-colors"
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 border border-border-default rounded-lg text-sm disabled:opacity-40 hover:bg-surface-hover transition-colors"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAuditLog;
