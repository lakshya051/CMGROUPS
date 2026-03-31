import React, { useState, useEffect, useMemo } from 'react';
import { Wrench, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { servicesAPI } from '../../../lib/api';

const DEFAULT_SLOTS = [
    { time: '10:00 AM - 12:00 PM', available: true },
    { time: '12:00 PM - 02:00 PM', available: true },
    { time: '02:00 PM - 04:00 PM', available: true },
    { time: '04:00 PM - 06:00 PM', available: true },
];

const BundleServiceScheduler = ({ checkoutItems, serviceSchedules, onScheduleChange }) => {
    const bundleServices = useMemo(() => {
        const seen = new Set();
        const result = [];
        for (const item of checkoutItems) {
            const bi = item.bundleInfo;
            if (!bi?.hasService || !bi.serviceNames?.length) continue;
            const key = bi.bundleInstanceId;
            if (seen.has(key)) continue;
            seen.add(key);
            result.push({
                bundleInstanceId: key,
                bundleId: bi.bundleId,
                bundleName: bi.bundleName,
                serviceNames: bi.serviceNames,
            });
        }
        return result;
    }, [checkoutItems]);

    if (bundleServices.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-trust/10 flex items-center justify-center">
                    <Wrench size={16} className="text-trust" />
                </div>
                <div>
                    <h3 className="font-bold text-text-primary">Schedule Your Services</h3>
                    <p className="text-xs text-text-muted">Your bundle includes services. Pick a preferred date and time.</p>
                </div>
            </div>

            {bundleServices.map(bs => (
                <ServiceScheduleCard
                    key={bs.bundleInstanceId}
                    bundleService={bs}
                    schedule={serviceSchedules[bs.bundleInstanceId]}
                    onChange={(schedule) => onScheduleChange(bs.bundleInstanceId, schedule)}
                />
            ))}
        </div>
    );
};

const ServiceScheduleCard = ({ bundleService, schedule, onChange }) => {
    const [slots, setSlots] = useState(DEFAULT_SLOTS);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 1);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    const formatDate = (d) => d.toISOString().split('T')[0];

    const selectedDate = schedule?.date || '';
    const selectedSlot = schedule?.timeSlot || '';

    useEffect(() => {
        if (!selectedDate) return;
        setLoadingSlots(true);
        servicesAPI.getAvailableSlots(selectedDate)
            .then(data => setSlots(Array.isArray(data) ? data : DEFAULT_SLOTS))
            .catch(() => setSlots(DEFAULT_SLOTS))
            .finally(() => setLoadingSlots(false));
    }, [selectedDate]);

    const handleDateChange = (date) => {
        onChange({ date, timeSlot: '' });
    };

    const handleSlotChange = (slot) => {
        onChange({ ...schedule, date: selectedDate, timeSlot: slot });
    };

    const isComplete = selectedDate && selectedSlot;

    return (
        <div className={`border rounded-lg p-4 transition-colors ${isComplete ? 'border-success/40 bg-success/5' : 'border-border-default bg-surface'}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                    <p className="text-sm font-semibold text-text-primary">{bundleService.bundleName}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {bundleService.serviceNames.map((name, i) => (
                            <span key={i} className="text-[10px] bg-trust/10 text-trust px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                <Wrench size={8} /> {name}
                            </span>
                        ))}
                    </div>
                </div>
                {isComplete && <CheckCircle size={18} className="text-success shrink-0 mt-0.5" />}
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
                        <Calendar size={12} /> Preferred Date
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        min={formatDate(minDate)}
                        max={formatDate(maxDate)}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full px-3 py-2 bg-page-bg border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:border-trust transition-colors"
                    />
                </div>

                {selectedDate && (
                    <div>
                        <label className="text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1">
                            <Clock size={12} /> Time Slot
                        </label>
                        {loadingSlots ? (
                            <div className="grid grid-cols-2 gap-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-10 bg-page-bg rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {slots.map(slot => {
                                    const isSelected = selectedSlot === slot.time;
                                    return (
                                        <button
                                            key={slot.time}
                                            type="button"
                                            disabled={!slot.available}
                                            onClick={() => handleSlotChange(slot.time)}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                                isSelected
                                                    ? 'bg-trust text-white border-trust'
                                                    : slot.available
                                                        ? 'bg-page-bg border-border-default text-text-primary hover:border-trust/40'
                                                        : 'bg-page-bg border-border-default text-text-muted/50 cursor-not-allowed line-through'
                                            }`}
                                        >
                                            {slot.time}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {!isComplete && selectedDate && (
                    <p className="text-[11px] text-text-muted flex items-center gap-1">
                        <AlertCircle size={10} /> Please select a time slot to continue
                    </p>
                )}
            </div>
        </div>
    );
};

export default BundleServiceScheduler;
