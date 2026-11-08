import { Compass, Home, MessageCircle, Search, UserRound, Bell } from "lucide-react";
import "./AppNavigation.css";

const destinations = [
  { id: "feed", label: "Home", Icon: Home },
  { id: "search", label: "Search", Icon: Search },
  { id: "explore", label: "Explore", Icon: Compass },
  { id: "chats", label: "Chats", Icon: MessageCircle },
  { id: "notifications", label: "Alerts", Icon: Bell },
  { id: "profile", label: "Profile", Icon: UserRound },
];

export default function AppNavigation({ activeTab, onNavigate, unreadCount = 0 }) {
  const selectedTab = activeTab === "public-profile" ? "profile" : activeTab;

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
            aria-label={id === "notifications" && unreadCount > 0 ? `Notifications, ${unreadCount} unread` : label}
            onClick={() => onNavigate(id)}
          >
            <span className="chatly-primary-nav-icon">
              <Icon size={20} strokeWidth={active ? 2.35 : 1.9} aria-hidden="true" />
              {id === "notifications" && unreadCount > 0 && (
                <span className="chatly-primary-nav-badge" aria-hidden="true">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span className="chatly-primary-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
