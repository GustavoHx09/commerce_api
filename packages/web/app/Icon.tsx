const paths = {
  chart: 'M3 3v18h18 M7 14l4-4 4 3 6-8 M17 5h4v4',
  bag: 'M6 7h12l2 14H4L6 7Z M9 8V6a3 3 0 0 1 6 0v2',
  wallet:
    'M20 8V5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7 M20 12h-5v5h5 M17 14.5h.01',
  box: 'm12 3 9 5-9 5-9-5 9-5Z M3 8v9l9 5 9-5V8 M12 13v9 M7.5 5.5l9 5',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  plus: 'M12 5v14 M5 12h14',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z m-4 9 3 3 5-5',
  mail: 'M3 5h18v14H3V5Z m0 1 9 7 9-7',
  lock: 'M5 10h14v11H5V10Z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  eyeOff:
    'm3 3 18 18 M10.6 5.1 12 5c6 0 10 7 10 7a20 20 0 0 1-3 3.6 M6.5 6.5A24 24 0 0 0 2 12s4 7 10 7a12 12 0 0 0 5-1.3 M10 10a3 3 0 0 0 4 4',
  refresh:
    'M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 13 2l1 4 M4 12l1 4a8 8 0 0 0 13 2',
  alert: 'm12 3 10 18H2L12 3Z M12 9v5 M12 17h.01',
  check: 'm5 12 4 4L19 6',
  calendar: 'M4 5h16v16H4V5Z M8 3v4 M16 3v4 M4 10h16',
  external:
    'M14 4h6v6 M20 4 11 13 M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
};

export default function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name: keyof typeof paths;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  );
}
