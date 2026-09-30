/** Site navigation. Structure follows the Federal University Lokoja website (About / Academics / Admissions / Student /
 *  Research / Campus / TETFund / Support Services / News), adapted to KCOE. Leaf pages are CMS "page" items keyed by slug. */
export interface NavLeaf { label: string; href: string; external?: boolean }
export interface NavGroup { heading?: string; items: NavLeaf[] }
export interface NavSection { label: string; href?: string; groups?: NavGroup[] }

export const SCHOOL_LINKS: NavLeaf[] = [
  { label: "Arts and Social Sciences", href: "/schools/arts-and-social-sciences" },
  { label: "Education", href: "/schools/education" },
  { label: "Languages", href: "/schools/languages" },
  { label: "Science Education", href: "/schools/science-education" },
  { label: "Vocation and Technical Education", href: "/schools/vocation-and-technical-education" },
];

export const NAV: NavSection[] = [
  { label: "Home", href: "/" },
  { label: "About", groups: [
    { heading: "Central Administration", items: [{ label: "Governing Council", href: "/governing-council" }, { label: "Principal Officers", href: "/about/leadership" }] },
    { items: [
      { label: "Vision and Mission", href: "/vision-and-mission" }, { label: "Our History and Traditions", href: "/history-and-traditions" },
      { label: "The Provost's Welcome", href: "/provost-welcome" }, { label: "Our Location", href: "/our-location" }, { label: "Ankpa at a Glance", href: "/ankpa-at-a-glance" },
    ] },
  ] },
  { label: "Academics", groups: [
    { heading: "Schools", items: SCHOOL_LINKS },
    { heading: "Study", items: [{ label: "All Programmes", href: "/programmes" }, { label: "Academic Calendar", href: "/academic-calendar" }, { label: "College Library", href: "/library" }, { label: "eLearning", href: "https://kscoeankpa.olearn.sch.ng", external: true }] },
  ] },
  { label: "Admissions", groups: [
    { items: [
      { label: "General Requirements", href: "/admissions" }, { label: "NCE Programmes", href: "/nce-programmes" }, { label: "Degree Programme", href: "/degree-programme" },
      { label: "Post-Degree Diploma", href: "/pde-programme" }, { label: "How to Apply", href: "/how-to-apply" }, { label: "Frequently Asked Questions", href: "/faq" },
    ] },
  ] },
  { label: "Student", groups: [
    { heading: "Portal", items: [{ label: "Student Portal", href: "/portal/login" }, { label: "eLearning (LMS)", href: "https://kscoeankpa.olearn.sch.ng", external: true }, { label: "Course Registration", href: "/portal/student/registration" }] },
    { heading: "Student life", items: [{ label: "Student Affairs", href: "/student-affairs" }, { label: "Health Services", href: "/health-services" }, { label: "Sports and Recreation", href: "/sports" }] },
  ] },
  { label: "Research", groups: [
    { items: [{ label: "Research and Publications", href: "/research-and-publications" }, { label: "Centres and Units", href: "/centres-and-units" }, { label: "Teaching Practice", href: "/teaching-practice" }] },
  ] },
  { label: "Campus", groups: [
    { items: [{ label: "Our Location", href: "/our-location" }, { label: "Facilities", href: "/facilities" }, { label: "Photo Gallery", href: "/gallery" }] },
  ] },
  { label: "TETFund", groups: [
    { heading: "Special Intervention", items: [{ label: "High Impact Intervention", href: "/tetfund-high-impact" }] },
    { heading: "Annual Intervention", items: [{ label: "Institution-Based Research", href: "/tetfund-institution-based-research" }, { label: "Physical Infrastructure and Programme Upgrade", href: "/tetfund-infrastructure" }] },
  ] },
  { label: "Support Services", groups: [
    { items: [
      { label: "Bursary", href: "/bursary" }, { label: "Registry", href: "/registry" }, { label: "ICT Directorate", href: "/ict-directorate" }, { label: "Student Affairs", href: "/student-affairs" },
      { label: "Works and Maintenance", href: "/works-and-maintenance" }, { label: "Security", href: "/security" }, { label: "Servicom", href: "/servicom" },
    ] },
  ] },
  { label: "News", groups: [{ items: [{ label: "Latest News", href: "/news" }, { label: "Events", href: "/events" }, { label: "Announcements", href: "/news#announcements" }] }] },
];

export const UTILITY: NavLeaf[] = [
  { label: "Student Portal", href: "/portal/login" }, { label: "Staff Portal", href: "/portal/login" },
  { label: "Photo Gallery", href: "/gallery" }, { label: "Downloads", href: "/downloads" }, { label: "Contact Us", href: "/contact" },
];

/** Finds the nav section that lists a path, for the "In this section" sidebar. */
export function sectionFor(path: string): { title: string; items: NavLeaf[] } | null {
  for (const s of NAV) {
    const items = (s.groups ?? []).flatMap((g) => g.items);
    if (items.some((i) => i.href === path)) return { title: s.label, items: items.filter((i) => !i.external) };
  }
  return null;
}
