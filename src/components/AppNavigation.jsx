import { Compass, Home, MessageCircle, UserRound } from "lucide-react";
import "./AppNavigation.css";

const destinations = [
  { id: "feed", label: "Home", Icon: Home },
  { id: "explore", label: "Explore", Icon: Compass },
  { id: "chats", label: "Chats", Icon: MessageCircle },
  { id: "profile", label: "Profile", Icon: UserRound },
];

export default function AppNavigation({ activeTab, onNavigate }) {
  const selectedTab = ["public-profile", "history", "settings"].includes(activeTab) ? "profile" : activeTab;

  return (
    <nav className="chatly-primary-nav" aria-label="Main navigation">
      {destinations.map(({ id, label, Icon }) => {
        const active = selectedTab === id;
        return (
          <button
            key={id}
            type="button"
            className={`chatly-primary-nav-item${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            onClick={() => onNavigate(id)}
          >
            <span className="chatly-primary-nav-icon">
              <Icon size={20} strokeWidth={active ? 2.35 : 1.9} aria-hidden="true" />
            </span>
            <span className="chatly-primary-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
