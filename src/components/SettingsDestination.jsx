import { useEffect, useState } from "react";
import { ArrowLeft, UserRound, ShieldCheck, Bell, Palette, MessageCircle, CircleHelp, Info, LogOut, Trash2, ChevronRight, Sun, Moon, Monitor, Type, KeyRound, Mail, UserCog, Check, Search, X } from "lucide-react";
import "./SettingsDestination.css";
import { SETTINGS_PREFERENCE_DEFAULTS, normalizeSettingsPreferences, updateSettingsPreference } from "../lib/settingsPreferences.js";

const groups = [
  { label: "YOUR ACCOUNT", items: [{ id: "account", title: "Account", detail: "Personal information and sign-in", Icon: UserRound }] },
  { label: "PREFERENCES", items: [
    { id: "privacy", title: "Privacy & security", detail: "Read receipts and account privacy", Icon: ShieldCheck },
    { id: "notifications", title: "Notifications", detail: "Choose what you want to be notified about", Icon: Bell },
    { id: "appearance", title: "Appearance", detail: "Theme and text preferences", Icon: Palette },
    { id: "chats", title: "Chats", detail: "Message and media preferences", Icon: MessageCircle },
  ]},
  { label: "MORE", items: [
    { id: "help", title: "Help & support", detail: "Get help or report a problem", Icon: CircleHelp },
    { id: "about", title: "About Chatly", detail: "App information and policies", Icon: Info },
  ]},
];

function Toggle({ title, detail, checked, onChange, disabled = false }) {
  return <label className="st-pref-row"><span><strong>{title}</strong><small>{detail}</small></span><input type="checkbox" checked={Boolean(checked)} disabled={disabled} onChange={e => onChange(e.target.checked)} /></label>;
}

export default function SettingsDestination({ onBack = () => {}, onSubpageChange = () => {}, theme = "system", setTheme, fontSize, setFontSize, fontFamily, setFontFamily, setNotice, notice, session, accountEmail, setAccountEmail, supabase, password, setPassword, setNewPassword, chatPrefs, setChatPrefs, setEditProfileOpen }) {
  const [view, setView] = useState("home");
  const [settingsQuery, setSettingsQuery] = useState("");
  const [serverPrivateProfile, setServerPrivateProfile] = useState(false);
  const [privacyDraft, setPrivacyDraft] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [incomingFollowRequests, setIncomingFollowRequests] = useState([]);
  const [followRequestBusy, setFollowRequestBusy] = useState("");
  useEffect(() => {
    if (view === "home") return undefined;
    window.history.pushState({ chatlySettingsSubpage: view }, "");
    const handlePopState = () => {
      setView("home");
      onSubpageChange(false);
      setMessage("");
      setNotice("");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [view, onSubpageChange, setNotice]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailAttempted, setEmailAttempted] = useState(false);
  const [emailResultType, setEmailResultType] = useState("");
  const [emailDirty, setEmailDirty] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutSaving, setLogoutSaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [resetDialog, setResetDialog] = useState("");

  const [message, setMessage] = useState("");
  useEffect(() => { if (!logoutOpen && !resetDialog) return undefined; const onKeyDown = event => { if (event.key === "Escape") { if (logoutOpen) { setLogoutOpen(false); setLogoutError(""); } if (resetDialog) setResetDialog(""); } }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [logoutOpen, resetDialog]);
  const title = groups.flatMap(group => group.items).find(item => item.id === view)?.title || "Settings";
  const preferenceDefaults = SETTINGS_PREFERENCE_DEFAULTS;
  const safePrefs = normalizeSettingsPreferences(chatPrefs);
  const pref = (key, value) => setChatPrefs(current => updateSettingsPreference(current, key, value));
  const back = () => { if (view !== "home") window.history.back(); };

  useEffect(() => {
    if (view !== "privacy" || !session?.user?.id || !supabase) return undefined;
    let active = true;
    async function loadPrivacy() {
      setPrivacyLoading(true);
      setPrivacyMessage("");
      try {
        const [profileResult, requestResult] = await Promise.all([
          supabase.from("profiles").select("is_private").eq("id", session.user.id).single(),
          supabase.from("follow_requests").select("requester_id,created_at").eq("target_id", session.user.id).order("created_at", { ascending: false }).limit(50)
        ]);
        if (profileResult.error) throw profileResult.error;
        if (requestResult.error) throw requestResult.error;
        const requesterIds = (requestResult.data || []).map(row => row.requester_id);
        const peopleResult = requesterIds.length
          ? await supabase.from("profiles").select("id,display_name,username,avatar_url").in("id", requesterIds)
          : { data: [], error: null };
        if (peopleResult.error) throw peopleResult.error;
        if (!active) return;
        const people = new Map((peopleResult.data || []).map(person => [person.id, person]));
        setServerPrivateProfile(!!profileResult.data?.is_private);
        setPrivacyDraft(!!profileResult.data?.is_private);
        setIncomingFollowRequests((requestResult.data || []).map(request => ({
          ...request,
          person: people.get(request.requester_id) || { id: request.requester_id, display_name: "Chatly member" }
        })));
      } catch (error) {
        if (active) setPrivacyMessage(error?.message || "Privacy settings could not be loaded. Apply the latest database migration and try again.");
      } finally {
        if (active) setPrivacyLoading(false);
      }
    }
    loadPrivacy();
    return () => { active = false; };
  }, [view, session?.user?.id, supabase]);

  async function updateServerPrivacy(nextValue) {
    if (!session?.user?.id || privacySaving) return;
    setPrivacySaving(true);
    setPrivacyMessage("");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ is_private: Boolean(nextValue) })
        .eq("id", session.user.id)
        .select("is_private")
        .single();
      if (error) throw error;
      setServerPrivateProfile(!!data.is_private);
      setPrivacyDraft(!!data.is_private);
      setPrivacyMessage(data.is_private ? "Private profile enabled. Only approved followers can view your posts." : "Your profile is public. Anyone signed in can view your posts.");
    } catch (error) {
      setPrivacyMessage(error?.message || "Could not update account privacy.");
    } finally {
      setPrivacySaving(false);
    }
  }

  async function respondToFollowRequest(requesterId, accept) {
    if (!requesterId || followRequestBusy) return;
    setFollowRequestBusy(requesterId);
    setPrivacyMessage("");
    try {
      const { error } = await supabase.rpc("respond_to_follow_request", {
        p_requester_id: requesterId,
        p_accept: Boolean(accept)
      });
      if (error) throw error;
      setIncomingFollowRequests(current => current.filter(item => item.requester_id !== requesterId));
      setPrivacyMessage(accept ? "Follow request approved." : "Follow request declined.");
    } catch (error) {
      setPrivacyMessage(error?.message || "Could not update follow request.");
    } finally {
      setFollowRequestBusy("");
    }
  }

  function detailContent() {
    if (view === "account") return <>
      <section className="st-card"><h2>PERSONAL INFORMATION</h2>
        <button className="st-detail-row" onClick={() => { setEditProfileOpen(true); setNotice(""); }}><UserCog/><span><strong>Edit profile</strong><small>Display name, username, photo and bio</small></span><ChevronRight/></button>
        <button className="st-detail-row" onClick={() => { if (emailOpen && emailDirty && !window.confirm("Discard your unsaved email change?")) return; setEmailOpen(v => !v); if (emailOpen) { setEmailDirty(false); setEmailAttempted(false); } }}><Mail/><span><strong>Email address</strong><small>{session?.user?.email || "Manage your sign-in email"} · {session?.user?.email_confirmed_at ? "Verified" : session?.user?.email_confirmed_at === null ? "Unverified" : "Verification status unavailable"}</small></span><ChevronRight/></button>
        {emailOpen && <form className="st-inline-form" onSubmit={async e => { e.preventDefault(); setEmailAttempted(true); setNotice(""); setEmailResultType(""); setEmailSaving(true); try { const { error } = await supabase.auth.updateUser({ email: accountEmail.trim() }); setEmailResultType(error ? "error" : "success"); setNotice(error ? error.message : "Email update requested. Check your inbox to confirm."); } catch (error) { setEmailResultType("error"); setNotice(error.message || "Could not request email update."); } finally { setEmailSaving(false); } }}><label>New email address<input type="email" autoComplete="email" value={accountEmail} onChange={e => { setAccountEmail(e.target.value); setEmailDirty(true); }} placeholder="name@example.com" aria-describedby="st-email-hint" aria-invalid={emailAttempted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim())} required/><small id="st-email-hint" className="st-password-hint">A confirmation email may be required before the address changes. {emailAttempted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim()) ? "Enter a valid email address." : ""}</small></label><button disabled={emailSaving || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim()) || accountEmail.trim().toLowerCase() === session?.user?.email?.toLowerCase()}>{emailSaving ? "Requesting…" : "Update email"}</button></form>}
      </section>
      <section className="st-card"><h2>SECURITY & SIGN-IN</h2>
        <button className="st-detail-row" onClick={() => { if (passwordOpen && (password.length > 0 || passwordConfirm.length > 0) && !window.confirm("Discard your unsaved password change?")) return; setPasswordOpen(v => !v); if (passwordOpen) { setPassword(""); setPasswordConfirm(""); setPasswordVisible(false); } }}><KeyRound/><span><strong>Change password</strong><small>Choose a new password</small></span><ChevronRight/></button>
        {passwordOpen && <form className="st-inline-form" onSubmit={async e => { e.preventDefault(); setNotice(""); setPasswordSaving(true); try { await setNewPassword(e); } catch (error) { setNotice(error?.message || "Could not update password. Please try again."); } finally { setPasswordSaving(false); } }}><label>New password<input type={passwordVisible ? "text" : "password"} autoComplete="new-password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required/><button type="button" className="st-reset-button" onClick={() => setPasswordVisible(v => !v)} aria-pressed={passwordVisible}>{passwordVisible ? "Hide password" : "Show password"}</button><small className="st-password-hint" aria-live="polite">{password.length === 0 ? "Use at least 6 characters." : password.length < 6 ? `${6 - password.length} more character${6-password.length===1?"":"s"} needed.` : /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) ? "Password meets the length and character mix suggestions." : "Consider mixing uppercase, lowercase, and numbers for a stronger password."}</small></label><label>Confirm new password<input type={passwordVisible ? "text" : "password"} autoComplete="new-password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Re-enter new password" aria-describedby="st-password-match" required/><small id="st-password-match" className="st-password-hint" aria-live="polite">{passwordConfirm.length === 0 ? "Enter the password again to confirm." : password === passwordConfirm ? "Passwords match." : "Passwords do not match."}</small><button disabled={passwordSaving || password.length < 6 || password !== passwordConfirm}><span aria-live="polite">{passwordSaving ? "Updating…" : "Update password"}</span></button></label></form>}
        <button className="st-detail-row" onClick={() => setLogoutOpen(true)}><LogOut/><span><strong>Log out</strong><small>Sign out of this device</small></span><ChevronRight/></button>
      </section>
      <section className="st-card st-danger"><h2>ACCOUNT MANAGEMENT</h2><div className="st-detail-row st-unavailable" aria-disabled="true"><Trash2/><span><strong>Delete account</strong><small>Account deletion is not available yet. Contact support for account assistance.</small></span><span className="st-unavailable-label">Unavailable</span></div></section>
      {notice && <p className={`st-message ${emailResultType === "error" ? "is-error" : emailResultType === "success" ? "is-success" : ""}`} role="status" aria-live="polite">{notice}</p>}
    </>;
    if (view === "privacy") return <>
      <section className="st-card">
        <h2>ACCOUNT PRIVACY</h2>
        <Toggle title="Private profile" detail="Only approved followers can view your posts, comments and likes." checked={privacyDraft} disabled={privacyLoading || privacySaving} onChange={setPrivacyDraft}/>
        <div className="st-privacy-save-row"><span className="st-note">{privacyDraft !== serverPrivateProfile ? "You have an unsaved privacy change." : "Your privacy setting is up to date."}</span><button type="button" className="st-privacy-save" disabled={privacyLoading || privacySaving || privacyDraft === serverPrivateProfile} onClick={() => updateServerPrivacy(privacyDraft)}>{privacySaving ? "Saving…" : "Save privacy settings"}</button></div>
        {privacyLoading && <p className="st-note" role="status">Loading privacy settings…</p>}
        {privacySaving && <p className="st-note" role="status">Saving privacy setting…</p>}
        <p className="st-note">Public accounts remain discoverable. Existing followers are preserved when you switch to private.</p>
        {privacyMessage && <p className="st-message" role="status" aria-live="polite">{privacyMessage}</p>}
      </section>
      <section className="st-card">
        <h2>FOLLOW REQUESTS ({incomingFollowRequests.length})</h2>
        {privacyLoading ? <p className="st-note">Loading requests…</p> : incomingFollowRequests.length ? incomingFollowRequests.map(request => <div className="st-follow-request" key={request.requester_id}>
          <span><strong>{request.person.display_name || "Chatly member"}</strong><small>{request.person.username ? "@" + request.person.username : "Wants to follow you"}</small></span>
          <button type="button" disabled={!!followRequestBusy} onClick={() => respondToFollowRequest(request.requester_id, true)}>{followRequestBusy === request.requester_id ? "…" : "Accept"}</button>
          <button type="button" className="st-follow-reject" disabled={!!followRequestBusy} onClick={() => respondToFollowRequest(request.requester_id, false)}>Decline</button>
        </div>) : <p className="st-note">No pending follow requests.</p>}
      </section>
      <section className="st-card">
        <h2>MESSAGING PRIVACY</h2>
        <Toggle title="Read receipts" detail="Let people know when you have read their messages" checked={safePrefs.readReceipts} onChange={v => pref("readReceipts", v)}/>
        <Toggle title="Message requests" detail="Allow messages from people outside your connections" checked={safePrefs.messageRequests} onChange={v => pref("messageRequests", v)}/>
        <p className="st-note">Messaging preferences are saved on this device.</p>
      </section>
    </>;
    if (view === "notifications") return <><section className="st-card"><h2>MESSAGES</h2><Toggle title="Message alerts" detail="Show in-app alerts when new messages arrive" checked={safePrefs.messageAlerts} onChange={v => pref("messageAlerts", v)}/></section><section className="st-card"><h2>COMMUNITY ACTIVITY</h2><Toggle title="Activity alerts" detail="Get alerts about activity on your account" checked={safePrefs.activityAlerts} onChange={v => pref("activityAlerts", v)}/><Toggle title="Likes" detail="When someone likes your posts" checked={safePrefs.likesAlerts} onChange={v => pref("likesAlerts", v)}/><Toggle title="Comments" detail="When someone comments on your posts" checked={safePrefs.commentAlerts} onChange={v => pref("commentAlerts", v)}/><Toggle title="Mentions" detail="When someone mentions you" checked={safePrefs.mentionAlerts} onChange={v => pref("mentionAlerts", v)}/><p className="st-note">Preferences are saved on this device. They do not grant browser or operating-system notification permission.</p><button type="button" className="st-reset-button" onClick={() => setResetDialog("notifications")}>Reset notification preferences</button>{message && <p className="st-message" role="status" aria-live="polite">{message}</p>}</section></>;
    if (view === "chats") return <><section className="st-card"><h2>COMPOSING MESSAGES</h2><Toggle title="Enter to send" detail="Press Enter to send; use Shift + Enter for a new line" checked={safePrefs.enterToSend} onChange={v => pref("enterToSend", v)}/></section><section className="st-card"><h2>MEDIA</h2><Toggle title="Media previews" detail="Show previews for shared media when available" checked={safePrefs.mediaPreview} onChange={v => pref("mediaPreview", v)}/><Toggle title="Auto-load media" detail="Load shared images and videos automatically on this device" checked={safePrefs.autoDownloadMedia} onChange={v => pref("autoDownloadMedia", v)}/><p className="st-note">Media preferences affect this device only. Your mobile data or Wi-Fi usage may vary.</p><button type="button" className="st-reset-button" onClick={() => setResetDialog("chats")}>Reset chat preferences</button>{message && <p className="st-message" role="status" aria-live="polite">{message}</p>}</section></>;
    if (view === "appearance") return <>
      <section className="st-card"><h2>THEME</h2><div className="st-theme-options">{[{id:"light",label:"Light",Icon:Sun},{id:"dark",label:"Dark",Icon:Moon},{id:"system",label:"System",Icon:Monitor}].map(({id,label,Icon}) => <button key={id} className={theme === id ? "selected" : ""} aria-pressed={theme === id} onClick={() => setTheme(id)}><Icon/><span>{label}</span>{theme === id && <Check/>}</button>)}</div></section>
      <section className="st-card"><h2>TEXT & PREVIEW</h2><div className="st-choice"><span><Type/>Text size</span><div>{["small","medium","large"].map(v => <button key={v} className={fontSize === v ? "selected" : ""} aria-pressed={fontSize === v} onClick={() => setFontSize(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div></div><div className="st-choice"><span>Font style</span><div>{[{id:"system",label:"System"},{id:"sans",label:"Sans"},{id:"serif",label:"Serif"}].map(v => <button key={v.id} className={fontFamily === v.id ? "selected" : ""} aria-pressed={fontFamily === v.id} onClick={() => setFontFamily(v.id)}>{v.label}</button>)}</div></div><div className={`st-appearance-preview font-${fontSize} family-${fontFamily}`} aria-live="polite"><strong>Chatly preview</strong><p>This is how text will appear across your app.</p><small>Changes are saved automatically on this device.</small></div><button type="button" className="st-reset-button" onClick={() => { setFontSize("medium"); setFontFamily("system"); setTheme("system"); }}>Restore default appearance</button></section>
    </>;
    if (view === "help") return <section className="st-card"><h2>HOW CAN WE HELP?</h2><div className="st-info"><CircleHelp/><span><strong>Chatly support</strong><p>For account, messaging, or technical issues, contact the Chatly project support team.</p></span></div><div className="st-detail-row st-unavailable" aria-disabled="true"><span><strong>Report a problem</strong><small>Problem reporting is not connected yet. No report will be sent from this screen.</small></span><span className="st-unavailable-label">Unavailable</span></div></section>;
    if (view === "about") return <section className="st-card"><h2>APP INFORMATION</h2><div className="st-info"><span className="st-logo">c</span><span><strong>Chatly</strong><p>Connect, share, and chat with your community.</p><small>Version 1.0.0</small></span></div><div className="st-detail-row st-unavailable" aria-disabled="true"><span><strong>Privacy policy & terms</strong><small>Policy documents have not been published yet.</small></span><span className="st-unavailable-label">Unavailable</span></div></section>;
    return null;
  }

  return <section className="destination-page settings-page app-settings-destination-page st-settings">
    {view === "home" ? <>
      <header className="st-intro"><div className="st-home-heading"><button type="button" className="st-global-back" aria-label="Back to feed" title="Back" onClick={onBack}><ArrowLeft/></button><div><span>PERSONALIZE YOUR EXPERIENCE</span><h1>Settings</h1></div></div><p>Make Chatly feel like yours.</p></header>
      <section className="st-account-summary" aria-label="Signed-in account">
        <span className="st-account-avatar" aria-hidden="true">{(session?.user?.user_metadata?.display_name || session?.user?.email || "C").slice(0, 1).toUpperCase()}</span>
        <span className="st-account-copy"><strong>{session?.user?.user_metadata?.display_name || "Your Chatly account"}</strong><small>{session?.user?.email || "Account details"}</small></span>
        <button type="button" onClick={() => { setView("account"); onSubpageChange(true); setNotice(""); }} aria-label="Manage account">Manage <ChevronRight/></button>
      </section>
      <div className="st-search-wrap" id="st-settings-results"><label className="st-search"><Search aria-hidden="true"/><span className="sr-only">Search settings</span><input type="search" value={settingsQuery} onChange={e => setSettingsQuery(e.target.value)} placeholder="Search settings, privacy, notifications…" aria-label="Search settings" aria-controls="st-settings-results"/></label>{settingsQuery && <button type="button" className="st-search-clear" onClick={() => setSettingsQuery("")} aria-label="Clear settings search"><X aria-hidden="true"/> Clear</button>}</div><p className="st-search-count" hidden={!settingsQuery.trim()} role="status" aria-live="polite">{settingsQuery.trim() ? `${groups.flatMap(group => group.items).filter(item => `${item.title} ${item.detail} ${({privacy:"security visibility private profile follow requests",notifications:"alerts push likes comments mentions",appearance:"display color font theme",chats:"messages media typing downloads",account:"login password email profile username",help:"support contact report problem",about:"version app policies"}[item.id] || "")}`.toLowerCase().includes(settingsQuery.trim().toLowerCase())).length} matching settings` : " "}</p>
      {groups.map(group => { const matches = group.items.filter(item => `${item.title} ${item.detail} ${({privacy:"security visibility",notifications:"alerts push",appearance:"display color font",chats:"messages media typing",account:"login password email",help:"support contact",about:"version app"}[item.id] || "")}`.toLowerCase().includes(settingsQuery.trim().toLowerCase())); return matches.length ? <section className="st-group" key={group.label}><h2>{group.label}</h2><div className="st-nav-card">{matches.map(({id,title,detail,Icon}) => <button key={id} className="st-nav-row" aria-label={`${title}: ${detail}`} onClick={() => { setView(id); setSettingsQuery(""); onSubpageChange(true); setNotice(""); setMessage(""); }}><span className="st-icon"><Icon/></span><span className="st-nav-copy"><strong>{title}</strong><small>{detail}</small></span><ChevronRight className="st-chevron"/></button>)}</div></section> : null; })}
      {settingsQuery.trim() && !groups.some(group => group.items.some(item => `${item.title} ${item.detail} ${item.id} ${({privacy:"security visibility",notifications:"alerts push",appearance:"display color font",chats:"messages media typing",account:"login password email",help:"support contact",about:"version app"}[item.id] || "")}`.toLowerCase().includes(settingsQuery.trim().toLowerCase()))) && <p className="st-note" role="status">No settings match “{settingsQuery}”. Try another search.</p>}
      
    </> : <><header className="st-subheader"><button type="button" aria-label="Back to settings" title="Back to settings" onClick={back}><ArrowLeft/></button><div><span>SETTINGS</span><h1>{title}</h1></div></header>{detailContent()}</>}
    {resetDialog && <div className="st-overlay" onClick={e => { if (e.target === e.currentTarget) setResetDialog(""); }}><section className="st-dialog" role="alertdialog" aria-modal="true" aria-labelledby="st-reset-title"><h2 id="st-reset-title">Reset {resetDialog === "notifications" ? "notification" : "chat"} preferences?</h2><p>{resetDialog === "notifications" ? "All notification toggles will return to their default settings." : "Message preferences will return to their default settings."} This change applies to this device.</p><footer><button type="button" autoFocus className="st-secondary" onClick={() => setResetDialog("")}>Cancel</button><button type="button" onClick={() => { if (resetDialog === "notifications") { setChatPrefs(current => ({ ...current, messageAlerts: true, activityAlerts: true, likesAlerts: true, commentAlerts: true, mentionAlerts: true })); setMessage("Notification preferences restored to defaults."); } else { setChatPrefs(current => ({ ...current, enterToSend: false, mediaPreview: true, autoDownloadMedia: true })); setMessage("Chat preferences restored to defaults."); } setResetDialog(""); }}>Reset preferences</button></footer></section></div>}
    {logoutOpen && <div className="st-overlay" onClick={e => { if (e.target === e.currentTarget) setLogoutOpen(false); }}><section className="st-dialog" role="alertdialog" aria-modal="true" aria-labelledby="st-logout-title"><h2 id="st-logout-title">Log out of Chatly?</h2><p>You will need to sign in again to access your account.</p>{logoutError && <p className="st-message is-error" role="alert">{logoutError}</p>}<footer><button autoFocus className="st-secondary" disabled={logoutSaving} onClick={() => { setLogoutOpen(false); setLogoutError(""); }}>Cancel</button><button disabled={logoutSaving} onClick={async () => { setLogoutSaving(true); setLogoutError(""); try { const { error } = await supabase.auth.signOut(); if (error) throw error; setLogoutOpen(false); } catch (error) { setLogoutError(error?.message || "Could not log out. Please try again."); } finally { setLogoutSaving(false); } }}>{logoutSaving ? "Logging out…" : "Log out"}</button></footer></section></div>}
    
  </section>;
}
