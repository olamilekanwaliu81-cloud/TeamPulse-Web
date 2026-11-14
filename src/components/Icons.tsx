const P: Record<string, React.ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></>),
  team: (<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M17 14c2.5 0 4.5 2 4.5 4.5" /></>),
  profile: (<><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c0-4 3.4-7 7.5-7s7.5 3 7.5 7" /></>),
  checkins: (<><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>),
  signups: (<><circle cx="10" cy="8" r="3.4" /><path d="M3.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" /><path d="M19 8v6M16 11h6" /></>),
  bell: (<><path d="M6 17h12l-1.5-2V10.5a4.5 4.5 0 10-9 0V15z" /><path d="M10 20a2 2 0 004 0" /></>),
};

export function Icon({ name }: { name: keyof typeof P }) {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}
