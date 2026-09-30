/**
 * Photographs are hotlinked from Unsplash (free licence, no attribution required; credits below).
 * Swap any of these for the college's own photography by editing this file or by setting an image in the CMS.
 */
const u = (id: string) => `https://images.unsplash.com/photo-${id}`;
export const PHOTO = {
  campus: u("1638636199555-5085c5f4fc56"),        // university building with fountain (Jolame Chirwa)
  campusAerial: u("1638636214032-581196ffd400"),  // aerial view of campus (Jolame Chirwa)
  walkway: u("1583100524290-599c9ac2bf21"),       // students walking near building (Azzedine Rouichi)
  brick: u("1785190095920-302ea67de2e0"),         // modern brick architecture (Kame BGCREATIONS)
  hill: u("1785190095889-86bb13040624"),          // building complex on green hillside (Kame BGCREATIONS)
  graduateRed: u("1686213011624-8578b598ef0f"),   // graduate holding certificate (Divaris Shirichena)
  graduate: u("1709811240710-cff5f04deb44"),      // graduate in cap and gown (LOLA AZIZADA)
  graduateGown: u("1594750852563-5ed8e0421d40"),  // graduate in academic gown (Nqobile Vundla)
  library: u("1567536894065-1d8a627a9561"),       // student with bookshelf (Oladimeji Odunsi)
  studying: u("1567537146932-6f80e0b71a00"),      // student at table (Oladimeji Odunsi)
  portraitWoman: u("1611877247362-93a1536ad38e"), // student portrait (MacClusky Gbekle)
  laptopMan: u("1620829813573-7c9e1877706f"),     // student with laptop (Kojo Kwarteng)
  portraitMan: u("1620829813795-9855fe1ff0e3"),   // student portrait (Kojo Kwarteng)
  benchLaptops: u("1655720348590-c739c860beed"),  // students with laptops (Iwaria Inc.)
  teacher: u("1632215861513-130b66fe97f4"),       // teacher with pupils (Emmanuel Ikwuegbu)
  classroom: u("1473649085228-583485e6e4d7"),     // pupils in classroom (Doug Linstedt)
  pupils: u("1567057419565-4349c49d8a04"),        // pupils in a room (Annie Spratt)
  writing: u("1567057420215-0afa9aa9253a"),       // pupils writing (Annie Spratt)
} as const;
export type PhotoKey = keyof typeof PHOTO;

/** Sized, compressed delivery via Unsplash's image CDN parameters. */
export const sized = (url: string, w: number, q = 70) => (url.includes("images.unsplash.com") ? `${url}?auto=format&fit=crop&w=${w}&q=${q}` : url);
