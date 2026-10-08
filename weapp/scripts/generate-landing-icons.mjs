import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('weapp/images/icons');

const icons = {
  arrowRight: {
    color: '#C1A268',
    paths: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'
  },
  loader: {
    color: '#C1A268',
    paths: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>'
  },
  leaf: {
    color: '#C1A268',
    paths: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 2.48 19 2c1 2 2 4.18 2 8 0 5.5-4.5 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>'
  },
  chevronDown: {
    color: '#2A4B3C',
    opacity: 0.9,
    paths: '<path d="m6 9 6 6 6-6"/>'
  },
  timer: {
    color: '#2A4B3C',
    paths: '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>'
  },
  bookOpen: {
    color: '#2A4B3C',
    paths: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'
  },
  barChart3: {
    color: '#2A4B3C',
    paths: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'
  },
  moon: {
    color: '#F9F7F2',
    paths: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
  },
  wind: {
    color: '#2A4B3C',
    opacity: 0.06,
    size: 192,
    paths: '<path d="M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>'
  },
  shield: {
    color: '#2A4B3C',
    opacity: 0.62,
    paths: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'
  },
  coffee: {
    color: '#2A4B3C',
    opacity: 0.62,
    paths: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>'
  },
  github: {
    color: '#2A4B3C',
    opacity: 0.62,
    paths: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>'
  },
  tabCalendar: {
    file: 'tab-calendar.png',
    color: '#868C88',
    paths: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'
  },
  tabCalendarSelected: {
    file: 'tab-calendar-selected.png',
    color: '#FFFFFF',
    paths: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'
  },
  tabBookOpen: {
    file: 'tab-bookOpen.png',
    color: '#868C88',
    paths: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'
  },
  tabBookOpenSelected: {
    file: 'tab-bookOpen-selected.png',
    color: '#FFFFFF',
    paths: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'
  },
  tabLibrary: {
    file: 'tab-library.png',
    color: '#868C88',
    paths: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>'
  },
  tabLibrarySelected: {
    file: 'tab-library-selected.png',
    color: '#FFFFFF',
    paths: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>'
  },
  poseChevronLeft: {
    file: 'pose-chevron-left.png',
    color: '#78716C',
    paths: '<path d="m15 18-6-6 6-6"/>'
  },
  poseChevronRight: {
    file: 'pose-chevron-right.png',
    color: '#78716C',
    paths: '<path d="m9 18 6-6-6-6"/>'
  },
  tabUser: {
    file: 'tab-user.png',
    color: '#868C88',
    paths: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>'
  },
  tabUserSelected: {
    file: 'tab-user-selected.png',
    color: '#FFFFFF',
    paths: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>'
  },
  formCamera: {
    file: 'form-camera.png',
    color: '#FFFFFF',
    paths: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'
  },
  formExpand: {
    file: 'form-expand.png',
    color: '#FFFFFF',
    paths: '<path d="m15 15 6 6"/><path d="M21 16v5h-5"/><path d="m15 9 6-6"/><path d="M21 8V3h-5"/><path d="M9 15l-6 6"/><path d="M3 16v5h5"/><path d="m9 9-6-6"/><path d="M3 8V3h5"/>'
  },
  practiceVolume: {
    file: 'practice-volume.png',
    color: '#4A7A44',
    paths: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'
  },
  practiceVolumeSelected: {
    file: 'practice-volume-selected.png',
    color: '#FFFFFF',
    paths: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'
  },
  profileSettings: {
    file: 'profile-settings.png',
    color: '#68716C',
    paths: '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>'
  },
  profileUser: {
    file: 'profile-user.png',
    color: '#FFFFFF',
    paths: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  },
  profileUserMuted: {
    file: 'profile-user-muted.png',
    color: '#868C88',
    paths: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  },
  profileCamera: {
    file: 'profile-camera.png',
    color: '#FFFFFF',
    paths: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'
  },
  profileCalendar: {
    file: 'profile-calendar.png',
    color: '#2D5A27',
    paths: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'
  },
  journalCloud: {
    file: 'journal-cloud.png',
    color: '#FFFFFF',
    paths: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>'
  },
  journalMessage: {
    file: 'journal-message.png',
    color: '#FFFFFF',
    paths: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>'
  },
  journalPencil: {
    file: 'journal-pencil.png',
    color: '#FFFFFF',
    paths: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>'
  },
  journalPlus: {
    file: 'journal-plus.png',
    color: '#FFFFFF',
    paths: '<path d="M12 5v14M5 12h14"/>'
  }
};

fs.mkdirSync(outDir, { recursive: true });

for (const [name, icon] of Object.entries(icons)) {
  const size = icon.size ?? 96;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${icon.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="${icon.opacity ?? 1}">${icon.paths}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, icon.file || `landing-${name}.png`));
}

console.log(`Generated ${Object.keys(icons).length} landing icons in ${outDir}`);
