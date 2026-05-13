const perks = [
    { text: 'Curated shopping with trusted sellers' },
    { text: 'Courses and learning in one place' },
    { text: 'Book tech services when you need help' },
];

export default function AuthPageLayout({ headline, subheadline, children }) {
    return (
        <div className="min-h-screen safe-screen relative overflow-hidden bg-auth-bg text-text-primary flex flex-col">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute -top-[40%] -right-[20%] h-[min(100vw,56rem)] w-[min(100vw,56rem)] rounded-full bg-primary/[0.22] blur-[120px]" />
                <div className="absolute -bottom-[35%] -left-[25%] h-[min(90vw,48rem)] w-[min(90vw,48rem)] rounded-full bg-secondary/[0.28] blur-[110px]" />
                <div className="absolute top-[20%] left-[30%] h-64 w-64 rounded-full bg-trust/15 blur-[90px]" />
            </div>
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.35]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                }}
                aria-hidden
            />

            <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-stretch lg:gap-16 xl:gap-24">
                    <div className="hidden flex-1 flex-col justify-center lg:flex">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/45">
                            SHOPTIFY
                        </p>
                        <h2 className="mt-4 font-heading text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl">
                            {headline}
                        </h2>
                        <p className="mt-5 max-w-md text-lg leading-relaxed text-white/60">{subheadline}</p>
                        <ul className="mt-10 space-y-4">
                            {perks.map(({ text }) => (
                                <li key={text} className="flex items-start gap-3 text-sm text-white/55">
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/90 to-secondary/90 text-[10px] font-bold text-white shadow-md shadow-primary/20">
                                        ✓
                                    </span>
                                    <span className="pt-0.5 leading-snug">{text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex w-full flex-col justify-center lg:max-w-[440px] lg:flex-none">
                        <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/90 to-secondary/90 shadow-lg shadow-primary/30">
                                <span className="font-heading text-xl font-black text-white">S</span>
                            </div>
                            <p className="font-heading text-2xl font-bold tracking-tight text-white">
                                Shopt<span className="text-trust">ify</span>
                            </p>
                            <div className="h-1 w-14 rounded-full bg-gradient-to-r from-primary via-secondary to-trust opacity-90" />
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] sm:p-10">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
