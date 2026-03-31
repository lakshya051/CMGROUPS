import React from 'react';
import { Truck, CheckCircle, BookMarked, MapPin, Link2, Locate, AlertCircle, Zap } from 'lucide-react';
import Button from '../../../components/ui/Button';
import AddressCard from './AddressCard';

const ShippingStep = ({
    step,
    formik,
    savedAddresses,
    selectedAddressId,
    onApplyAddress,
    onDeleteAddress,
    onDeliveryFieldChange,
    locationMode,
    setLocationMode,
    locationStatus,
    gps,
    manualLink,
    setManualLink,
    onDetectLocation,
}) => (
    <div className={`bg-surface border rounded-lg shadow-sm p-4 sm:p-lg transition-all duration-300 ${step === 1 ? 'border-trust ring-1 ring-trust/50' : 'border-border-default opacity-70'}`}>
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Truck className={step === 1 ? 'text-trust' : 'text-text-muted'} size={20} />
            <h2 className={`text-lg sm:text-xl font-bold ${step === 1 ? 'text-text-primary' : 'text-text-secondary'}`}>Shipping Information</h2>
            {step > 1 && <span className="text-success font-bold text-sm ml-auto flex items-center gap-1"><CheckCircle size={14} /> Done</span>}
        </div>

        <div className="flex items-center gap-2 bg-trust/5 border border-trust/20 rounded-lg px-3 py-2 mb-3">
            <Zap size={14} className="text-trust flex-shrink-0" />
            <p className="text-xs text-trust font-medium">
                Estimated delivery: <span className="font-bold">Within 24 hours</span> of order confirmation
            </p>
        </div>

        <form onSubmit={formik.handleSubmit} className="space-y-3">

            {savedAddresses.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <BookMarked size={14} className="text-trust" />
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Saved Addresses</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border-default">
                        {savedAddresses.map(addr => (
                            <AddressCard
                                key={addr.id}
                                address={addr}
                                isSelected={selectedAddressId === addr.id}
                                onSelect={onApplyAddress}
                                onDelete={onDeleteAddress}
                            />
                        ))}
                    </div>
                    <div className="mt-2 border-b border-border-default" />
                </div>
            )}

            <div>
                <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name *"
                    aria-label="Full name"
                    autoComplete="name"
                    className={`input-field ${formik.touched.fullName && formik.errors.fullName ? 'border-red-500' : ''}`}
                    value={formik.values.fullName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    readOnly={step !== 1}
                />
                {formik.touched.fullName && formik.errors.fullName && (
                    <p className="text-error text-sm mt-1">{formik.errors.fullName}</p>
                )}
            </div>

            <div>
                <input
                    type="email"
                    name="email"
                    placeholder="Email Address *"
                    aria-label="Email address"
                    autoComplete="email"
                    className={`input-field ${formik.touched.email && formik.errors.email ? 'border-red-500' : ''}`}
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    readOnly={step !== 1}
                />
                {formik.touched.email && formik.errors.email && (
                    <p className="text-error text-sm mt-1">{formik.errors.email}</p>
                )}
            </div>

            <div>
                <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number *"
                    aria-label="Phone number"
                    autoComplete="tel"
                    className={`input-field ${formik.touched.phone && formik.errors.phone ? 'border-red-500' : ''}`}
                    value={formik.values.phone}
                    onChange={onDeliveryFieldChange}
                    onBlur={formik.handleBlur}
                    readOnly={step !== 1}
                />
                {formik.touched.phone && formik.errors.phone && (
                    <p className="text-error text-sm mt-1">{formik.errors.phone}</p>
                )}
            </div>

            <div>
                <input
                    type="text"
                    name="addressLine"
                    placeholder="Address Line *"
                    aria-label="Street address"
                    autoComplete="street-address"
                    className={`input-field ${formik.touched.addressLine && formik.errors.addressLine ? 'border-red-500' : ''}`}
                    value={formik.values.addressLine}
                    onChange={onDeliveryFieldChange}
                    onBlur={formik.handleBlur}
                    readOnly={step !== 1}
                />
                {formik.touched.addressLine && formik.errors.addressLine && (
                    <p className="text-error text-sm mt-1">{formik.errors.addressLine}</p>
                )}
            </div>

            {step === 1 && (
                <div className="bg-page-bg border border-border-default rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                        <MapPin size={12} className="text-trust" /> Smart Location (optional)
                    </p>

                    <div className="flex gap-3">
                        <label className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm
                            ${locationMode === 'gps'
                                ? 'border-trust bg-trust/10 text-trust font-semibold'
                                : 'border-border-default text-text-secondary hover:border-trust/30'}`}>
                            <input
                                type="radio"
                                className="sr-only"
                                checked={locationMode === 'gps'}
                                onChange={() => setLocationMode('gps')}
                            />
                            <MapPin size={14} /> 📍 GPS Location
                        </label>
                        <label className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm
                            ${locationMode === 'link'
                                ? 'border-trust bg-trust/10 text-trust font-semibold'
                                : 'border-border-default text-text-secondary hover:border-trust/30'}`}>
                            <input
                                type="radio"
                                className="sr-only"
                                checked={locationMode === 'link'}
                                onChange={() => setLocationMode('link')}
                            />
                            <Link2 size={14} /> 🔗 Maps Link
                        </label>
                    </div>

                    {locationMode === 'gps' && (
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onDetectLocation}
                                disabled={locationStatus === 'loading'}
                                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-trust text-trust hover:bg-trust/10 transition-colors disabled:opacity-60 disabled:cursor-wait font-medium"
                            >
                                <Locate size={14} className={locationStatus === 'loading' ? 'animate-spin' : ''} />
                                {locationStatus === 'loading' ? 'Detecting…' : 'Detect My Location'}
                            </button>

                            {locationStatus === 'success' && (
                                <span className="flex items-center gap-1.5 text-success text-sm font-semibold">
                                    <CheckCircle size={14} />
                                    Captured ({gps.lat?.toFixed(4)}, {gps.lng?.toFixed(4)})
                                </span>
                            )}
                            {locationStatus === 'error' && (
                                <span className="flex items-center gap-1.5 text-error text-xs">
                                    <AlertCircle size={13} /> Denied – text address is enough
                                </span>
                            )}
                        </div>
                    )}

                    {locationMode === 'link' && (
                        <input
                            type="url"
                            value={manualLink}
                            onChange={(e) => setManualLink(e.target.value)}
                            placeholder="Paste Google Maps link here…"
                            className="input-field text-sm"
                        />
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                    <input
                        type="text"
                        name="city"
                        placeholder="City *"
                        aria-label="City"
                        autoComplete="address-level2"
                        className={`input-field ${formik.touched.city && formik.errors.city ? 'border-red-500' : ''}`}
                        value={formik.values.city}
                        onChange={onDeliveryFieldChange}
                        onBlur={formik.handleBlur}
                        readOnly={step !== 1}
                    />
                    {formik.touched.city && formik.errors.city && (
                        <p className="text-error text-sm mt-1">{formik.errors.city}</p>
                    )}
                </div>
                <input
                    type="text"
                    name="state"
                    placeholder="State"
                    aria-label="State"
                    autoComplete="address-level1"
                    className="input-field"
                    value={formik.values.state}
                    onChange={onDeliveryFieldChange}
                    onBlur={formik.handleBlur}
                    readOnly={step !== 1}
                />
                <div>
                    <input
                        type="text"
                        name="postalCode"
                        placeholder="PIN Code *"
                        aria-label="PIN code"
                        autoComplete="postal-code"
                        className={`input-field ${formik.touched.postalCode && formik.errors.postalCode ? 'border-red-500' : ''}`}
                        value={formik.values.postalCode}
                        onChange={onDeliveryFieldChange}
                        onBlur={formik.handleBlur}
                        readOnly={step !== 1}
                    />
                    {formik.touched.postalCode && formik.errors.postalCode && (
                        <p className="text-error text-sm mt-1">{formik.errors.postalCode}</p>
                    )}
                </div>
            </div>

            {step === 1 && (
                <Button type="submit" disabled={formik.isSubmitting}>
                    Continue to Payment
                </Button>
            )}
        </form>
    </div>
);

export default ShippingStep;
