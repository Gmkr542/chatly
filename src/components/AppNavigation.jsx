import { Compass, Home, MessageCircle, UserRound } from "lucide-react";
import "./AppNavigation.css";

const destinations = [
  { id: "feed", label: "Home", Icon: Home },
  { id: "explore", label: "Explore", Icon: Compass },
  { id: "chats", label: "Chats", Icon: MessageCircle },
  { id: "profile", label: "Profile", Icon: UserRound },
];

export default function AppNavigation({ activeTab, profile, profileMenuOpen, onToggleProfileMenu, onNavigate }) {
  const selectedTab = ["public-profile", "history", "settings"].includes(activeTab) ? "profile" : activeTab;

  return (
    <nav className="chatly-primary-nav" aria-label="Main navigation">
      {destinations.map(({ id, label, Icon }) => {
        const active = selectedTab === id;
        return (
          {id === "profile" ? (
            <div className="global-profile-menu chatly-primary-nav-profile" key={id}>
              <button type="button" className={`chatly-primary-nav-item global-profile-trigger${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} aria-label="Open navigation menu" title="Account navigation" aria-expanded={profileMenuOpen} aria-haspopup="true" onClick={onToggleProfileMenu}>
                <span className="chatly-primary-nav-icon global-profile-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.classList.add("avatar-image-failed"); e.currentTarget.parentElement.dataset.avatarFallback = (profile?.display_name || "C").slice(0,1).toUpperCase(); }} onLoad={e => { e.currentTarget.style.display = ""; e.currentTarget.parentElement.classList.remove("avatar-image-failed"); delete e.currentTarget.parentElement.dataset.avatarFallback; }}/> : (profile?.display_name || "C").slice(0,1).toUpperCase()}</span>
                <span className="chatly-primary-nav-label">Profile</span>
              </button>
            </div>
          ) : (
            <button key={id} type="button" className={`chatly-primary-nav-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} aria-label={label} onClick={() => onNavigate(id)}>
              <span className="chatly-primary-nav-icon"><Icon size={20} strokeWidth={active ? 2.35 : 1.9} aria-hidden="true" /></span>
              <span className="chatly-primary-nav-label">{label}</span>
            </button>
          )}
        );
      })}
    </nav>
  );
}
