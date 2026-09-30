import type { Metadata } from "next";
import { PageHead } from "../../../components/PageHead";
import { Photo } from "../../../components/Photo";
import { PHOTO } from "../../../lib/images";

export const metadata: Metadata = { title: "Photo gallery", description: "Life at Kogi State College of Education, Ankpa.", alternates: { canonical: "/gallery" } };
const ITEMS: [keyof typeof PHOTO, string][] = [
  ["campus", "University campus building and grounds"], ["walkway", "Students walking between buildings"], ["graduate", "A graduate in cap and gown"],
  ["library", "A student reading beside a bookshelf"], ["teacher", "A teacher with her class"], ["benchLaptops", "Students working together on laptops"],
  ["classroom", "Pupils in a classroom"], ["graduateRed", "A graduate holding her certificate"], ["campusAerial", "Aerial view of a campus"],
];

export default function Gallery() {
  return (
    <>
      <PageHead title="Photo gallery" crumbs={[["Campus"], ["Photo gallery"]]} lead="Moments from campus, classrooms and graduation." />
      <div className="container section"><div className="gallery">{ITEMS.map(([k, alt]) => <Photo key={k} src={PHOTO[k]} alt={alt} w={700} />)}</div></div>
    </>
  );
}
