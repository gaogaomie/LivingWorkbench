import { useEffect, useState } from "react";
import { ANNOUNCE_EVENT } from "../services/announcement-events";

interface Announcement {
  message: string;
  urgent: boolean;
}

export function AccessibleAnnouncer() {
  const [announcement, setAnnouncement] = useState<Announcement>({ message: "", urgent: false });

  useEffect(() => {
    const handleAnnouncement = (event: Event) => {
      setAnnouncement((event as CustomEvent<Announcement>).detail);
    };
    window.addEventListener(ANNOUNCE_EVENT, handleAnnouncement);
    return () => window.removeEventListener(ANNOUNCE_EVENT, handleAnnouncement);
  }, []);

  return (
    <div
      className="sr-only"
      role={announcement.urgent ? "alert" : "status"}
      aria-live={announcement.urgent ? "assertive" : "polite"}
      aria-atomic="true"
    >
      {announcement.message}
    </div>
  );
}
