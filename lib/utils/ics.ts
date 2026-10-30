// Generate file kalender .ics dari jadwal posting
export type Slot = { channel: string; datetime: string; label: string };

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function buildIcs(slots: Slot[], title: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PromoAgent AI//ID"];
  slots.forEach((s, i) => {
    const start = new Date(s.datetime);
    const end = new Date(start.getTime() + 30 * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:promoagent-${i}-${start.getTime()}@promoagent`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${s.channel}: ${s.label}`,
      `DESCRIPTION:${title.replace(/\n/g, " ")}`,
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function download(filename: string, content: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
