import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Download, ExternalLink, CheckCircle, AlertCircle, Loader2, Table2 } from 'lucide-react';
import { sheetsAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const SHEET_ICONS = {
    Products: '📦',
    Orders: '🛒',
    ServiceBookings: '🔧',
    Customers: '👤',
    Courses: '🎓',
    CourseApplications: '📝',
    WalletTransactions: '💰',
    TallyEnquiries: '📋',
    CCTVEnquiries: '📹',
};

const AdminSheetsSync = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(null);
    const [importing, setImporting] = useState(false);

    const sheetsUrl = import.meta.env.VITE_SHEETS_URL;

    const fetchStatus = useCallback(async () => {
        try {
            const data = await sheetsAPI.getStatus();
            setStatus(data);
            localStorage.setItem('sheets_last_sync_check', new Date().toISOString());
        } catch (err) {
            setStatus((prev) => (prev == null ? { sheets: [], rowCounts: {} } : prev));
            console.error('Sheets status error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleSyncAll = async () => {
        setSyncing('all');
        try {
            await sheetsAPI.syncAll();
            toast.success('All sheets synced successfully');
            await fetchStatus();
        } catch (err) {
            toast.error(err.message || 'Sync failed');
        } finally {
            setSyncing(null);
        }
    };

    const handleSyncSheet = async (sheetName) => {
        setSyncing(sheetName);
        try {
            await sheetsAPI.syncSheet(sheetName);
            toast.success(`${sheetName} synced`);
            await fetchStatus();
        } catch (err) {
            toast.error(err.message || `Failed to sync ${sheetName}`);
        } finally {
            setSyncing(null);
        }
    };

    const handleImportProducts = async () => {
        const confirmed = window.confirm(
            'This will update product prices and stock from your Google Sheet. Existing product data will be overwritten.\n\nContinue?'
        );
        if (!confirmed) return;

        setImporting(true);
        try {
            const result = await sheetsAPI.importProducts();
            if (result.errors?.length > 0) {
                toast.success(`Updated ${result.updated} products. ${result.errors.length} errors.`, { duration: 5000 });
            } else {
                toast.success(`Updated ${result.updated} products from sheet`);
            }
        } catch (err) {
            toast.error(err.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const lastCheck = localStorage.getItem('sheets_last_sync_check');
    const lastCheckFormatted = lastCheck
        ? new Date(lastCheck).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : 'Never';

    const knownSheets = ['Products', 'Orders', 'ServiceBookings', 'Customers', 'Courses', 'CourseApplications', 'WalletTransactions', 'TallyEnquiries', 'CCTVEnquiries'];
    const displaySheets = status?.sheets?.length > 0 ? status.sheets : knownSheets;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-text-primary mb-1">Google Sheets Sync</h1>
                <p className="text-sm text-text-secondary">
                    Bidirectional sync between your database and Google Sheets. Changes sync automatically.
                </p>
            </div>

            {/* Status Cards */}
            <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Table2 size={24} className="text-primary" />
                        <div>
                            <h2 className="text-lg font-semibold text-text-primary">Sheet Status</h2>
                            <p className="text-xs text-text-muted">Last checked: {lastCheckFormatted}</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchStatus}
                        disabled={loading}
                        className="p-2 rounded-lg bg-page-bg hover:bg-border-default transition-colors"
                        title="Refresh status"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-primary" />
                        <span className="ml-3 text-text-muted">Loading sheet status...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displaySheets.map((name) => (
                            <div
                                key={name}
                                className="flex items-center justify-between p-4 bg-page-bg rounded-xl border border-border-default"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{SHEET_ICONS[name] || '📄'}</span>
                                    <div>
                                        <p className="font-medium text-text-primary text-sm">{name}</p>
                                        <p className="text-xs text-text-muted">
                                            {status?.rowCounts?.[name] !== undefined
                                                ? `${status.rowCounts[name]} rows`
                                                : 'Not synced yet'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSyncSheet(name)}
                                    disabled={syncing !== null}
                                    className="p-1.5 rounded-lg hover:bg-border-default transition-colors text-text-muted hover:text-primary disabled:opacity-50"
                                    title={`Sync ${name}`}
                                >
                                    {syncing === name ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <RefreshCw size={14} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sync All */}
                <div className="glass-panel p-6">
                    <h3 className="font-semibold text-text-primary mb-2">Database → Sheets</h3>
                    <p className="text-sm text-text-secondary mb-4">
                        Push all database records to Google Sheets. This overwrites sheet data with current DB state.
                    </p>
                    <button
                        onClick={handleSyncAll}
                        disabled={syncing !== null}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {syncing === 'all' ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Syncing all sheets...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={18} />
                                Sync All Now
                            </>
                        )}
                    </button>
                </div>

                {/* Import Products + Variants */}
                <div className="glass-panel p-6">
                    <h3 className="font-semibold text-text-primary mb-2">Sheets → Database</h3>
                    <p className="text-sm text-text-secondary mb-4">
                        Import product and variant price, stock, and active status changes from the Products sheet back into the database.
                    </p>
                    <button
                        onClick={handleImportProducts}
                        disabled={importing || syncing !== null}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        {importing ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Import Product & Variant Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Open Sheet Link */}
            {sheetsUrl && (
                <div className="glass-panel p-6 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-text-primary">View Google Sheet</h3>
                        <p className="text-sm text-text-secondary">Open the synced spreadsheet in a new tab</p>
                    </div>
                    <a
                        href={sheetsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 bg-page-bg border border-border-default rounded-xl font-medium text-text-primary hover:border-primary/40 transition-colors"
                    >
                        <ExternalLink size={16} />
                        Open Google Sheet
                    </a>
                </div>
            )}

            {/* Info */}
            <div className="glass-panel p-6 border-l-4 border-l-blue-500">
                <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                    <CheckCircle size={18} className="text-blue-500" />
                    How sync works
                </h3>
                <ul className="text-sm text-text-secondary space-y-1.5 ml-6 list-disc">
                    <li>New orders, bookings, and enquiries automatically appear in the sheet within seconds</li>
                    <li>Product and order updates in admin panel sync to sheets in real time</li>
                    <li>A full backup runs automatically every night at midnight</li>
                    <li>Products and their variants appear together in a single "Products" sheet — PRODUCT rows and VARIANT rows</li>
                    <li>Use "Import Product & Variant Changes" to pull price/stock/active edits from the sheet back to the database</li>
                    <li>Customer passwords and sensitive tokens are never synced to sheets</li>
                </ul>
            </div>
        </div>
    );
};

export default AdminSheetsSync;
