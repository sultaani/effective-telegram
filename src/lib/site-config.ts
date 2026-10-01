/** Contact details and social links shown in the footer. Sourced from the college's current website; confirm before launch. */
export const SITE = {
  name: "Kogi State College of Education",
  place: "Ankpa",
  email: "info@kscoeankpa.edu.ng",
  phone: "09032194940",
  address: "Ankpa, Kogi State, Nigeria",
  provost: { title: "Provost", name: "Dr. Paul Femi FASHAGBA" },
  socials: [
    { name: "Facebook", href: "https://www.facebook.com/kscoeankpa/", path: "M13 22v-8h3l1-4h-4V8c0-1 .4-2 2-2h2V2.2C16.6 2.1 15.5 2 14.3 2 11.6 2 9 3.7 9 7v3H6v4h3v8h4Z" },
  ] as { name: string; href: string; path: string }[],
};
