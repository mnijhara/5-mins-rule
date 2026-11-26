export function BrandLogo({ showSubtitle = true, variant = 'dark' }: { showSubtitle?: boolean; variant?: 'light' | 'dark' }) {  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        viewBox="0 0 40 40"
        className="h-8 w-8 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="10" fill="#121417" stroke="#2A2F3A" strokeWidth="1.5" />
        <line
          x1="20"
          y1="8"
          x2="20"
          y2="32"
          stroke="#FACC15"
          strokeOpacity="0.4"
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />
        <rect x="8" y="16" width="2.6" height="8" rx="1.3" fill="#FACC15" fillOpacity="0.55" />
        <rect x="12.5" y="12" width="2.6" height="16" rx="1.3" fill="#FACC15" fillOpacity="0.85" />
        <rect x="17" y="9" width="2.6" height="22" rx="1.3" fill="#FACC15" />
        <rect x="20.4" y="9" width="2.6" height="22" rx="1.3" fill="#FACC15" fillOpacity="0.65" />
        <rect x="24.9" y="12" width="2.6" height="16" rx="1.3" fill="#FACC15" fillOpacity="0.4" />
        <rect x="29.4" y="16" width="2.6" height="8" rx="1.3" fill="#FACC15" fillOpacity="0.2" />
      </svg>
      <span className="flex flex-col text-left leading-none">
        <span className={`font-display text-xl sm:text-2xl font-bold uppercase tracking-wide ${variant === 'light' ? 'text-[#111318]' : 'text-[#F5F5F4]'}`}>
          Voice<span className={variant === 'light' ? 'text-[#1D4ED8]' : 'text-[#FACC15]'}>Mirror</span>
        </span>
        {showSubtitle && (
          <span className={`text-[10px] font-medium uppercase tracking-widest ${variant === 'light' ? 'text-stone-500' : 'text-[#9CA3AF]'}`}>
            The 5-Minute Mirror
          </span>
        )}
      </span>
    </span>
  );
}
