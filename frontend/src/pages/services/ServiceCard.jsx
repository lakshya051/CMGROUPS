import React from 'react';
import Button from '../../components/ui/Button';
import {
    Wrench, Monitor, Cpu, CheckCircle, Clock, ArrowRight,
    Printer, HardDrive, Settings, Zap, Wifi, Smartphone, PcCase,
} from 'lucide-react';

const iconMap = {
    Wrench: Wrench, Monitor: Monitor, Cpu: Cpu, Printer: Printer,
    HardDrive: HardDrive, Settings: Settings, Wifi: Wifi, Smartphone: Smartphone,
    PcCase: PcCase, Zap: Zap,
};

export function getServiceIcon(iconName) {
    const Comp = iconMap[iconName] || Wrench;
    return <Comp size={32} />;
}

const ServiceCard = ({ service, onBook }) => {
    return (
        <div
            className="group bg-surface border border-border-default rounded-xl p-6 hover:border-trust/40 hover:shadow-lg transition-all duration-300 flex flex-col"
        >
            <div className="w-14 h-14 rounded-xl bg-trust/10 text-trust flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-trust/20 transition-all duration-300">
                {getServiceIcon(service.icon)}
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-1">{service.title}</h3>
            <p className="text-text-muted text-sm mb-2 flex-1">{service.description}</p>
            {service.sellerName && (
                <p className="text-xs text-text-muted mb-3">Sold by: <span className="font-semibold text-trust">{service.sellerName}</span></p>
            )}

            <ul className="space-y-2 mb-5">
                {service.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-text-secondary">
                        <CheckCircle size={14} className="text-success flex-shrink-0" />
                        {feat}
                    </li>
                ))}
            </ul>

            <div className="border-t border-border-default pt-4 mt-auto">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-xs text-text-muted">Base Charge</p>
                        <p className="text-xl font-bold text-text-primary">{service.price}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-text-muted">Est. time</p>
                        <div className="flex items-center gap-1 text-sm font-medium text-text-secondary">
                            <Clock size={12} />
                            {service.estTime || '1–3 hrs'}
                        </div>
                    </div>
                </div>
                <Button
                    onClick={() => onBook(service)}
                    className="w-full flex items-center justify-center gap-2"
                >
                    Book Now <ArrowRight size={16} />
                </Button>
            </div>
        </div>
    );
};

export default ServiceCard;
