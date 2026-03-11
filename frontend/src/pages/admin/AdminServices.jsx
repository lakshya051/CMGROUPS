import React, { useState, useEffect, useCallback } from 'react';
import {
    Wrench, Search, CheckCircle, Clock, X, Calendar, MapPin, Phone, User,
    IndianRupee, Settings, Key, ChevronDown, ChevronUp, AlertCircle, Gift,
    UserPlus, Users, ShieldCheck, RefreshCw, FileText, Star, BadgeCheck,
    LayoutList, Trash2, Edit3, ArrowRight, Info, ToggleLeft, ToggleRight
} from 'lucide-react';
import { servicesAPI, techniciansAPI } from '../../lib/api';
import Button from '../../components/ui/Button';

// ── Constants ──────────────────────────────────────────────────────────────
const STATUS_PIPELINE = ['Pending', 'Confirmed', 'Picked Up', 'In Progress', 'Completed', 'Delivered'];
const PAGE_LIMIT = 20;

const STATUS_BADGE = {
    Pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    Confirmed: 'text-blue-700 bg-blue-50 border-blue-200',
    'Picked Up': 'text-purple-700 bg-purple-50 border-purple-200',
    'In Progress': 'text-orange-700 bg-orange-50 border-orange-200',
    Completed: 'text-green-700 bg-green-50 border-green-200',
    Delivered: 'text-green-700 bg-green-50 border-green-200',
    Cancelled: 'text-red-700 bg-red-50 border-red-200',
};

// ──────────────────────────────────────────────────────────────────────────
// Booking Detail Modal
// ──────────────────────────────────────────────────────────────────────────
const BookingModal = ({ booking, technicians, onClose, onUpdate }) => {
    const [localBooking, setLocalBooking] = useState(booking);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Fields
    const [estimatedPrice, setEstimatedPrice] = useState(booking.estimatedPrice || '');
    const [finalPrice, setFinalPrice] = useState(booking.finalPrice || '');
    const [adminNotes, setAdminNotes] = useState(booking.adminNotes || '');
    const [selectedTechId, setSelectedTechId] = useState(booking.technicianId || '');
    const [cancellationReason, setCancellationReason] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [regenLoading, setRegenLoading] = useState(false);

    // Confirm-with-price modal
    const [showPricePrompt, setShowPricePrompt] = useState(false);
    const [confirmPrice, setConfirmPrice] = useState('');

    // Cancel sub-modal
    const [showCancelPrompt, setShowCancelPrompt] = useState(false);
    const [showCompletePrompt, setShowCompletePrompt] = useState(false);
    const [completeFinalPrice, setCompleteFinalPrice] = useState(booking.finalPrice || '');

    const update = async (data) => {
        setSaving(true); setError('');
        try {
            const updated = await servicesAPI.updateStatus(localBooking.id, data);
            setLocalBooking(prev => ({ ...prev, ...updated }));
            onUpdate(updated);
        } catch (err) {
            setError(err.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFields = () => {
        const data = {};
        if (estimatedPrice !== '') data.estimatedPrice = Number(estimatedPrice);
        if (finalPrice !== '') data.finalPrice = Number(finalPrice);
        if (adminNotes !== booking.adminNotes) data.adminNotes = adminNotes;
        if (Object.keys(data).length) update(data);
    };

    const handleAssignTechnician = async () => {
        if (!selectedTechId) return;
        setSaving(true); setError('');
        try {
            const updated = await servicesAPI.assignTechnician(localBooking.id, selectedTechId);
            setLocalBooking(prev => ({ ...prev, ...updated }));
            onUpdate(updated);
        } catch (err) { setError(err.message || 'Assign failed'); }
        finally { setSaving(false); }
    };

    const handleConfirmWithPrice = async () => {
        if (!confirmPrice || isNaN(Number(confirmPrice))) {
            setError('Please enter a valid estimated price'); return;
        }
        await update({ status: 'Confirmed', estimatedPrice: Number(confirmPrice) });
        setShowPricePrompt(false);
    };

    const handleNextStatus = async () => {
        const idx = STATUS_PIPELINE.indexOf(localBooking.status);
        const next = STATUS_PIPELINE[idx + 1];
        if (!next) return;
        if (next === 'Confirmed') { setShowPricePrompt(true); return; }
        if (next === 'Completed') { setShowCompletePrompt(true); return; }
        await update({ status: next });
    };

    const handleCancelBooking = async () => {
        await update({ status: 'Cancelled', cancellationReason });
        setShowCancelPrompt(false);
    };

    const handleCompleteBooking = async () => {
        if (!completeFinalPrice || isNaN(Number(completeFinalPrice))) {
            setError('Please enter a valid final price.'); return;
        }
        await update({ status: 'Completed', finalPrice: Number(completeFinalPrice) });
        setShowCompletePrompt(false);
    };

    const handleVerifyOtp = async () => {
        if (!otpInput.trim()) return;
        setOtpLoading(true); setOtpError('');
        try {
            const res = await servicesAPI.verifyOtp(localBooking.id, otpInput.trim());
            const upd = res.booking || {};
            setLocalBooking(prev => ({ ...prev, ...upd, status: 'In Progress', otpVerified: true }));
            onUpdate({ ...localBooking, ...upd, status: 'In Progress', otpVerified: true });
        } catch (err) { setOtpError(err.message || 'Invalid OTP'); }
        finally { setOtpLoading(false); }
    };

    const handleRegenOtp = async () => {
        setRegenLoading(true);
        try {
            await servicesAPI.regenerateOtp(localBooking.id);
            alert('New OTP generated and sent to customer email.');
        } catch (err) { setError(err.message || 'Regenerate failed'); }
        finally { setRegenLoading(false); }
    };

    const nextStatus = (() => {
        const idx = STATUS_PIPELINE.indexOf(localBooking.status);
        return idx >= 0 && idx < STATUS_PIPELINE.length - 1 ? STATUS_PIPELINE[idx + 1] : null;
    })();

    const isCompleted = localBooking.status === 'Completed' || localBooking.status === 'Delivered';
    const isCancelled = localBooking.status === 'Cancelled';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border-default rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto relative">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-border-default sticky top-0 bg-surface z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-trust/10 text-trust flex items-center justify-center">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-text-primary">{localBooking.serviceType}</h2>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[localBooking.status] || ''}`}>
                                    {localBooking.status}
                                </span>
                                {localBooking.referralCodeUsed && isCompleted && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">
                                        <Gift size={10} />Referral Bonus Triggered
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-text-muted font-mono">SRV-{localBooking.id} · {new Date(localBooking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {localBooking.timeSlot}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg p-1.5 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {error && (
                        <div className="bg-error/10 border border-error/20 text-error text-sm p-3 rounded-xl flex items-center gap-2">
                            <AlertCircle size={14} />{error}
                        </div>
                    )}

                    {/* Customer Info */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Customer Details</p>
                        <div className="bg-page-bg rounded-xl border border-border-default p-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <User size={14} className="text-text-muted" />
                                <span className="font-semibold text-text-primary">{localBooking.customerName || localBooking.user?.name}</span>
                                <span className="text-text-secondary">{localBooking.user?.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Phone size={14} className="text-text-muted" />
                                <span>{localBooking.customerPhone || localBooking.user?.phone}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <MapPin size={14} className="text-text-muted mt-0.5" />
                                <span>{localBooking.address}, {localBooking.city} – {localBooking.pincode}{localBooking.landmark ? ` (Near: ${localBooking.landmark})` : ''}</span>
                            </div>
                            {localBooking.deviceType && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Settings size={14} className="text-text-muted" />
                                    <span>{localBooking.deviceType}{localBooking.deviceBrand ? ` — ${localBooking.deviceBrand}` : ''}</span>
                                </div>
                            )}
                            {localBooking.description && (
                                <div className="border-t border-border-default pt-2 text-sm text-text-secondary">
                                    <span className="font-semibold text-text-primary">Issue: </span>{localBooking.description}
                                </div>
                            )}
                            {localBooking.referralCodeUsed && (
                                <div className="border-t border-border-default pt-2 flex items-center gap-2 text-sm">
                                    <Gift size={12} className="text-primary" />
                                    <span className="text-text-muted">Referral Code:</span>
                                    <span className="font-mono font-bold text-primary">{localBooking.referralCodeUsed}</span>
                                    {isCompleted && <span className="text-xs text-green-600 font-semibold">✓ Bonus Triggered</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Admin Controls */}
                    {!isCancelled && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Admin Controls</p>
                            <div className="bg-page-bg rounded-xl border border-border-default p-4 space-y-4">
                                {/* Pricing */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Estimated Price (₹)</label>
                                        <input type="number" className="input-field bg-surface" placeholder="0" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Final Price (₹)</label>
                                        <input type="number" className="input-field bg-surface" placeholder="0" value={finalPrice} onChange={e => setFinalPrice(e.target.value)} />
                                    </div>
                                </div>

                                {/* Assign Technician Dropdown */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Assign Technician</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="input-field bg-surface flex-1"
                                            value={selectedTechId}
                                            onChange={e => setSelectedTechId(e.target.value)}
                                        >
                                            <option value="">— Select Technician —</option>
                                            {technicians.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name} · {t.skills?.join(', ') || 'General'}
                                                </option>
                                            ))}
                                        </select>
                                        <Button size="sm" variant="outline" disabled={!selectedTechId || saving} onClick={handleAssignTechnician}>
                                            Assign
                                        </Button>
                                    </div>
                                    {localBooking.technician && (
                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle size={11} />Currently: {localBooking.technician.name}
                                        </p>
                                    )}
                                </div>

                                {/* Admin Notes */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Admin Notes (Internal)</label>
                                    <textarea className="input-field bg-surface h-16 pt-2 text-sm" placeholder="Internal notes..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
                                </div>

                                <Button size="sm" variant="outline" disabled={saving} onClick={handleSaveFields}>
                                    {saving ? <RefreshCw size={13} className="animate-spin" /> : '💾 Save Fields'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* OTP Section (Confirmed only) */}
                    {localBooking.status === 'Confirmed' && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">OTP Verification</p>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                                {!localBooking.otpVerified ? (
                                    <>
                                        <p className="text-sm text-blue-700">An OTP was sent to the customer email. Verify it here to start service.</p>
                                        <div className="flex gap-2">
                                            <input type="text" maxLength={6} className="input-field font-mono tracking-widest text-center text-lg flex-1" placeholder="Enter 6-digit OTP" value={otpInput} onChange={e => setOtpInput(e.target.value)} />
                                            <Button size="sm" disabled={otpLoading} onClick={handleVerifyOtp}>
                                                {otpLoading ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                                            </Button>
                                        </div>
                                        {otpError && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={11} />{otpError}</p>}
                                        <button onClick={handleRegenOtp} disabled={regenLoading}
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-60">
                                            {regenLoading ? <RefreshCw size={11} className="animate-spin" /> : <Key size={11} />}
                                            Regenerate OTP (resends to customer)
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                                        <CheckCircle size={16} />OTP Verified — Device handed over to technician
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Invoice */}
                    {isCompleted && localBooking.invoiceUrl && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Invoice</p>
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-700">
                                    <FileText size={16} />
                                    <span className="text-sm font-semibold">Service Invoice Generated</span>
                                </div>
                                <a href={localBooking.invoiceUrl} download={`SRV-${localBooking.id}-Invoice.pdf`}
                                    className="text-xs font-bold text-green-700 hover:underline">
                                    Download PDF ↓
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Status Action Buttons */}
                    {!isCancelled && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-border-default">
                            {/* "Confirm" (Pending) opens price prompt */}
                            {localBooking.status === 'Pending' && (
                                <Button size="sm" onClick={() => setShowPricePrompt(true)} className="flex items-center gap-1.5">
                                    <CheckCircle size={14} />Confirm Booking
                                </Button>
                            )}

                            {/* Generic Next → (not Pending→Confirmed, not In Progress→Completed) */}
                            {nextStatus && localBooking.status !== 'Pending' && nextStatus !== 'Completed' && (
                                <Button size="sm" variant="outline" disabled={saving} onClick={handleNextStatus} className="flex items-center gap-1.5">
                                    ➡ Move to {nextStatus}
                                </Button>
                            )}

                            {/* In Progress → Complete (needs final price) */}
                            {localBooking.status === 'In Progress' && (
                                <Button size="sm" onClick={() => setShowCompletePrompt(true)} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700">
                                    <CheckCircle size={14} />Mark Completed
                                </Button>
                            )}

                            {/* Cancel */}
                            {!isCompleted && (
                                <button onClick={() => setShowCancelPrompt(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10 rounded-lg border border-error/20 transition-colors">
                                    <X size={13} />Cancel Booking
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Price Prompt (Confirm) ─────────────────────────── */}
                {showPricePrompt && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center p-6">
                        <div className="bg-surface border border-border-default rounded-2xl p-5 w-full max-w-sm shadow-2xl">
                            <h3 className="font-bold text-text-primary mb-1">Confirm Booking</h3>
                            <p className="text-sm text-text-secondary mb-4">Set the estimated price to confirm this booking. The customer will be notified via email.</p>
                            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Estimated Price (₹) *</label>
                            <input type="number" min="0" autoFocus className="input-field mb-4 text-lg font-bold" placeholder="e.g. 999" value={confirmPrice} onChange={e => setConfirmPrice(e.target.value)} />
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setShowPricePrompt(false)}>Cancel</Button>
                                <Button className="flex-1" disabled={saving} onClick={handleConfirmWithPrice}>
                                    {saving ? 'Confirming...' : 'Confirm & Notify'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Final Price Prompt (Complete) ──────────────────── */}
                {showCompletePrompt && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center p-6">
                        <div className="bg-surface border border-border-default rounded-2xl p-5 w-full max-w-sm shadow-2xl">
                            <h3 className="font-bold text-text-primary mb-1">Mark as Completed</h3>
                            <p className="text-sm text-text-secondary mb-4">Enter the final billable amount. An invoice PDF will be generated automatically.</p>
                            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Final Price (₹) *</label>
                            <input type="number" min="0" autoFocus className="input-field mb-4 text-lg font-bold" placeholder="e.g. 1180" value={completeFinalPrice} onChange={e => setCompleteFinalPrice(e.target.value)} />
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setShowCompletePrompt(false)}>Cancel</Button>
                                <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={saving} onClick={handleCompleteBooking}>
                                    {saving ? 'Processing...' : 'Complete & Invoice'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Cancel Prompt ──────────────────────────────────── */}
                {showCancelPrompt && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center p-6">
                        <div className="bg-surface border border-border-default rounded-2xl p-5 w-full max-w-sm shadow-2xl">
                            <h3 className="font-bold text-text-primary mb-1">Cancel Booking</h3>
                            <p className="text-sm text-text-secondary mb-3">The customer will be notified with this reason.</p>
                            <textarea className="input-field h-20 pt-2 mb-4 text-sm" placeholder="Reason for cancellation..." value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} />
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setShowCancelPrompt(false)}>Go Back</Button>
                                <button disabled={saving} onClick={handleCancelBooking}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60">
                                    {saving ? 'Cancelling...' : 'Confirm Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────
// Technician Card
// ──────────────────────────────────────────────────────────────────────────
const TechnicianCard = ({ tech, onToggle, onUpdate }) => {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(tech.name);
    const [phone, setPhone] = useState(tech.phone);
    const [email, setEmail] = useState(tech.email || '');
    const [skillsStr, setSkillsStr] = useState(tech.skills?.join(', ') || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await techniciansAPI.update(tech.id, {
                name, phone, email: email || null,
                skills: skillsStr.split(',').map(s => s.trim()).filter(Boolean)
            });
            onUpdate(updated);
            setEditing(false);
        } catch (err) {
            console.error(err);
        } finally { setSaving(false); }
    };

    return (
        <div className={`bg-surface border rounded-xl p-4 transition-all ${tech.isActive ? 'border-border-default' : 'border-border-default opacity-60'}`}>
            {!editing ? (
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-trust/10 text-trust flex items-center justify-center flex-shrink-0 font-bold text-sm">
                            {tech.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-text-primary">{tech.name}</p>
                                {!tech.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                            </div>
                            <p className="text-xs text-text-secondary">{tech.phone}{tech.email ? ` · ${tech.email}` : ''}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {(tech.skills || []).map(s => (
                                    <span key={s} className="text-xs bg-trust/10 text-trust border border-trust/20 px-2 py-0.5 rounded-full">{s}</span>
                                ))}
                            </div>
                            <p className="text-xs text-text-muted mt-1">{tech._count?.bookings || 0} bookings</p>
                        </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
                            <Edit3 size={14} />
                        </button>
                        <button onClick={() => onToggle(tech)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors" title={tech.isActive ? 'Deactivate' : 'Activate'}>
                            {tech.isActive ? <ToggleRight size={16} className="text-trust" /> : <ToggleLeft size={16} />}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary mb-1">Name</label>
                            <input className="input-field text-sm" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary mb-1">Phone</label>
                            <input className="input-field text-sm" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary mb-1">Email</label>
                            <input className="input-field text-sm" value={email} onChange={e => setEmail(e.target.value)} placeholder="optional" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary mb-1">Skills (comma-separated)</label>
                            <input className="input-field text-sm" value={skillsStr} onChange={e => setSkillsStr(e.target.value)} placeholder="Laptop Repair, CCTV" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────
const AdminServices = () => {
    const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'technicians'

    // Bookings state
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalBookings, setTotalBookings] = useState(0);
    const [statusCounts, setStatusCounts] = useState({});

    // Technicians state
    const [technicians, setTechnicians] = useState([]);
    const [techLoading, setTechLoading] = useState(false);
    const [showAllTech, setShowAllTech] = useState(false);
    const [newTech, setNewTech] = useState({ name: '', phone: '', email: '', skills: '' });
    const [addingTech, setAddingTech] = useState(false);
    const [techError, setTechError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => { setPage(1); }, [filterStatus]);

    const fetchBookings = useCallback(() => {
        setLoading(true);
        servicesAPI.getAll({ page, limit: PAGE_LIMIT, status: filterStatus !== 'All' ? filterStatus : undefined })
            .then(res => {
                if (res.data) {
                    setBookings(res.data);
                    setTotalPages(res.pagination?.totalPages || 1);
                    setTotalBookings(res.pagination?.total || res.data.length);
                    setStatusCounts(res.statusCounts || {});
                } else {
                    setBookings(Array.isArray(res) ? res : []);
                    setTotalPages(1); setTotalBookings(0); setStatusCounts({});
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [page, filterStatus]);

    const fetchTechnicians = useCallback(() => {
        setTechLoading(true);
        techniciansAPI.getAll(showAllTech)
            .then(data => setTechnicians(Array.isArray(data) ? data : []))
            .catch(err => console.error(err))
            .finally(() => setTechLoading(false));
    }, [showAllTech]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);
    useEffect(() => { if (activeTab === 'technicians') fetchTechnicians(); }, [activeTab, fetchTechnicians]);

    const handleBookingUpdate = (updated) => {
        setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
        if (selectedBooking?.id === updated.id) {
            setSelectedBooking(prev => ({ ...prev, ...updated }));
        }
    };

    const handleAddTechnician = async () => {
        setTechError('');
        if (!newTech.name.trim() || !newTech.phone.trim()) {
            setTechError('Name and phone are required.'); return;
        }
        setAddingTech(true);
        try {
            const created = await techniciansAPI.create({
                name: newTech.name.trim(),
                phone: newTech.phone.trim(),
                email: newTech.email.trim() || null,
                skills: newTech.skills.split(',').map(s => s.trim()).filter(Boolean)
            });
            setTechnicians(prev => [created, ...prev]);
            setNewTech({ name: '', phone: '', email: '', skills: '' });
            setShowAddForm(false);
        } catch (err) {
            setTechError(err.message || 'Failed to create technician');
        } finally { setAddingTech(false); }
    };

    const handleToggleTech = async (tech) => {
        try {
            const updated = await techniciansAPI.update(tech.id, { isActive: !tech.isActive });
            setTechnicians(prev => prev.map(t => t.id === tech.id ? updated : t));
        } catch (err) { console.error(err); }
    };

    const handleUpdateTech = (updated) => {
        setTechnicians(prev => prev.map(t => t.id === updated.id ? updated : t));
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-1">Service Operations</h1>
                    <p className="text-sm text-text-secondary">Manage bookings, technicians, and OTP flows.</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1.5 rounded-full font-bold">{statusCounts['Pending'] || 0} Pending</span>
                    <span className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-full font-bold">{statusCounts['In Progress'] || 0} In Progress</span>
                    <span className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full font-bold">{statusCounts['Completed'] || 0} Completed</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-page-bg border border-border-default p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('bookings')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'bookings' ? 'bg-surface border border-border-default shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    <LayoutList size={15} />Bookings
                </button>
                <button
                    onClick={() => setActiveTab('technicians')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'technicians' ? 'bg-surface border border-border-default shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    <Users size={15} />Technicians
                </button>
            </div>

            {/* ── BOOKINGS TAB ─────────────────────────────────────── */}
            {activeTab === 'bookings' && (
                <>
                    {/* Filter Tabs */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                        {['All', ...STATUS_PIPELINE, 'Cancelled'].map(status => (
                            <button key={status} onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${filterStatus === status
                                    ? 'bg-buy-primary text-text-primary border-border-default shadow-sm'
                                    : 'bg-page-bg text-text-secondary border-transparent hover:bg-surface-hover hover:border-border-default'
                                    }`}>
                                {status}{status !== 'All' && statusCounts[status] ? ` (${statusCounts[status]})` : ''}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-surface border border-border-default rounded-xl p-4 animate-pulse flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-surface-hover flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-surface-hover rounded w-1/4" />
                                        <div className="h-3 bg-surface-hover rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : bookings.length > 0 ? (
                        <div className="space-y-2">
                            {bookings.map(booking => (
                                <div key={booking.id}
                                    className="bg-surface border border-border-default rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-trust/30 hover:bg-surface-hover transition-all"
                                    onClick={() => setSelectedBooking(booking)}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-trust/10 text-trust flex items-center justify-center flex-shrink-0">
                                            <Wrench size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-bold text-text-primary">{booking.serviceType}</p>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[booking.status] || ''}`}>
                                                    {booking.status}
                                                </span>
                                                {booking.referralCodeUsed && (booking.status === 'Completed' || booking.status === 'Delivered') && (
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 flex items-center gap-1">
                                                        <Gift size={10} />Referral Bonus
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-3 text-xs text-text-secondary mt-0.5">
                                                <span className="flex items-center gap-1"><Calendar size={11} />{new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                <span className="flex items-center gap-1"><User size={11} />{booking.customerName || booking.user?.name || 'Unknown'}</span>
                                                <span className="flex items-center gap-1"><Phone size={11} />{booking.customerPhone || booking.user?.phone || 'N/A'}</span>
                                                {booking.technician && <span className="flex items-center gap-1 text-trust"><BadgeCheck size={11} />{booking.technician.name}</span>}
                                                <span className="font-mono opacity-40">SRV-{booking.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {booking.finalPrice ? (
                                            <span className="font-bold text-green-700">₹{booking.finalPrice}</span>
                                        ) : booking.estimatedPrice ? (
                                            <span className="text-sm font-semibold text-text-secondary">~₹{booking.estimatedPrice}</span>
                                        ) : null}
                                        <ArrowRight size={16} className="text-text-muted" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-surface border border-border-default rounded-xl p-10 text-center">
                            <Clock size={32} className="text-text-muted mx-auto mb-3" />
                            <h3 className="font-bold text-text-primary mb-1">
                                {filterStatus === 'All' ? 'No Requests Yet' : `No ${filterStatus} Requests`}
                            </h3>
                            <p className="text-text-secondary text-sm">
                                {filterStatus === 'All' ? 'All service requests will appear here.' : 'Try a different filter.'}
                            </p>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 bg-surface p-3 rounded-xl border border-border-default">
                            <button disabled={page === 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-4 py-1.5 rounded-lg text-sm font-semibold border border-border-default bg-page-bg text-text-primary disabled:opacity-40 hover:bg-surface-hover transition-colors">
                                ← Prev
                            </button>
                            <span className="text-sm font-bold text-text-primary">Page {page} / {totalPages} ({totalBookings} total)</span>
                            <button disabled={page === totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-buy-primary border border-border-default text-text-primary disabled:opacity-40 hover:bg-buy-primary-hover transition-colors">
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ── TECHNICIANS TAB ──────────────────────────────────── */}
            {activeTab === 'technicians' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-text-secondary">{technicians.length} technician{technicians.length !== 1 ? 's' : ''} {showAllTech ? '(all)' : '(active)'}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowAllTech(p => !p)} className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 border border-border-default rounded-lg px-3 py-1.5 hover:bg-surface-hover transition-colors">
                                {showAllTech ? <ToggleRight size={14} className="text-trust" /> : <ToggleLeft size={14} />}
                                {showAllTech ? 'All' : 'Active only'}
                            </button>
                            <Button size="sm" onClick={() => setShowAddForm(p => !p)} className="flex items-center gap-1.5">
                                <UserPlus size={14} />{showAddForm ? 'Cancel' : 'Add Technician'}
                            </Button>
                        </div>
                    </div>

                    {/* Add Technician Form */}
                    {showAddForm && (
                        <div className="bg-page-bg border border-trust/30 rounded-xl p-4 space-y-3">
                            <p className="text-sm font-bold text-trust">New Technician Profile</p>
                            {techError && <p className="text-xs text-error flex items-center gap-1"><AlertCircle size={12} />{techError}</p>}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary mb-1">Full Name *</label>
                                    <input className="input-field text-sm" placeholder="Ravi Kumar" value={newTech.name} onChange={e => setNewTech(p => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary mb-1">Phone *</label>
                                    <input className="input-field text-sm" placeholder="9999999999" value={newTech.phone} onChange={e => setNewTech(p => ({ ...p, phone: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary mb-1">Email</label>
                                    <input className="input-field text-sm" placeholder="ravi@example.com" value={newTech.email} onChange={e => setNewTech(p => ({ ...p, email: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary mb-1">Skills (comma-separated)</label>
                                    <input className="input-field text-sm" placeholder="Laptop Repair, CCTV" value={newTech.skills} onChange={e => setNewTech(p => ({ ...p, skills: e.target.value }))} />
                                </div>
                            </div>
                            <Button size="sm" disabled={addingTech} onClick={handleAddTechnician} className="flex items-center gap-1.5">
                                <UserPlus size={14} />{addingTech ? 'Adding...' : 'Create Profile'}
                            </Button>
                        </div>
                    )}

                    {techLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[1, 2, 3].map(i => <div key={i} className="bg-surface border border-border-default rounded-xl p-4 animate-pulse h-24" />)}
                        </div>
                    ) : technicians.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {technicians.map(tech => (
                                <TechnicianCard key={tech.id} tech={tech} onToggle={handleToggleTech} onUpdate={handleUpdateTech} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-surface border border-border-default rounded-xl p-10 text-center">
                            <Users size={32} className="text-text-muted mx-auto mb-3" />
                            <h3 className="font-bold text-text-primary mb-1">No Technicians Yet</h3>
                            <p className="text-text-secondary text-sm">Add your first technician using the button above.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Booking Detail Modal ──────────────────────────────── */}
            {selectedBooking && (
                <BookingModal
                    booking={selectedBooking}
                    technicians={technicians.filter(t => t.isActive)}
                    onClose={() => setSelectedBooking(null)}
                    onUpdate={handleBookingUpdate}
                />
            )}
        </div>
    );
};

export default AdminServices;
