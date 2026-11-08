import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, LoaderCircle, Search, Shield, UserPlus, Users, X, LogOut, UserMinus } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./GroupManagementDialog.css";

function memberName(person) {
  return person?.display_name || person?.username || "Chatly member";
}

function MemberAvatar({ person }) {
  return (
    <span className="group-management-avatar">
      {person?.avatar_url ? <img src={person.avatar_url} alt="" /> : memberName(person).slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function GroupManagementDialog({ group, session, people = [], onClose, onUpdated }) {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const peopleById = useMemo(() => new Map(people.map(person => [person.id, person])), [people]);
  const currentMembership = members.find(member => member.user_id === session.user.id);
  const currentRole = currentMembership?.role;
  const canManage = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("group_conversation_members")
      .select("user_id,role,joined_at")
      .eq("conversation_id", group.id)
      .order("joined_at", { ascending: true });
    if (loadError) {
      setError(loadError.message || "Could not load group members.");
      setMembers([]);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  }, [group.id]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data, error: loadError } = await supabase
        .from("group_conversation_members")
        .select("user_id,role,joined_at")
        .eq("conversation_id", group.id)
        .order("joined_at", { ascending: true });
      if (!alive) return;
      if (loadError) {
        setError(loadError.message || "Could not load group members.");
        setMembers([]);
      } else {
        setMembers(data || []);
      }
      setLoading(false);
    };
    load();
    return () => { alive = false; };
  }, [group.id]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !busy) onClose?.();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [busy, onClose]);

  const runAction = async (action, memberId = null, role = null) => {
    if (busy) return;
    setBusy(action + ":" + (memberId || "self"));
    setError("");
    setNotice("");
    const { error: actionError } = await supabase.rpc("manage_group_member", {
      p_conversation_id: group.id,
      p_action: action,
      p_member_id: memberId,
      p_role: role,
    });
    if (actionError) {
      setError(actionError.message || "That group change could not be completed.");
      setBusy("");
      return;
    }
    if (action === "remove" && !memberId) {
      setNotice("You left the group.");
      onUpdated?.({ left: true, groupId: group.id });
      onClose?.();
      return;
    }
    await loadMembers();
    setNotice(action === "add" ? "Member added." : action === "role" ? "Member role updated." : "Member removed.");
    setBusy("");
    onUpdated?.({ groupId: group.id });
  };

  const memberIds = new Set(members.map(member => member.user_id));
  const candidates = people
    .filter(person => person?.id && !memberIds.has(person.id) && person.id !== session.user.id)
    .filter(person => {
      const normalized = query.trim().toLocaleLowerCase();
      return !normalized || [person.display_name, person.username].filter(Boolean)
        .some(value => value.toLocaleLowerCase().includes(normalized));
    })
    .sort((a, b) => memberName(a).localeCompare(memberName(b)));

  const visibleMembers = members.filter(member => {
    const person = peopleById.get(member.user_id);
    const normalized = memberQuery.trim().toLocaleLowerCase();
    return !normalized || [memberName(person), person?.username || ""]
      .some(value => value.toLocaleLowerCase().includes(normalized));
  });

  const removeMember = member => {
    const person = peopleById.get(member.user_id);
    if (!window.confirm(member.user_id === session.user.id
      ? "Leave this group? You will stop receiving its messages."
      : `Remove ${memberName(person)} from this group?`)) return;
    runAction("remove", member.user_id === session.user.id ? null : member.user_id);
  };

  return (
    <div className="group-management-backdrop" role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose?.(); }}>
      <section className="group-management-dialog" role="dialog" aria-modal="true"
        aria-labelledby="group-management-title" aria-describedby="group-management-description">
        <header className="group-management-header">
          <span className="group-management-icon"><Users size={20} /></span>
          <div>
            <h2 id="group-management-title">{group.name || "Group details"}</h2>
            <p id="group-management-description">{group.description || "Manage members and group roles."}</p>
          </div>
          <button type="button" aria-label="Close group details" onClick={onClose} disabled={!!busy}><X size={18} /></button>
        </header>

        <div className="group-management-summary">
          <strong>{members.length} {members.length === 1 ? "member" : "members"}</strong>
          {currentRole && <span>Your role: <b>{currentRole}</b></span>}
        </div>

        <section className="group-management-section" aria-labelledby="group-members-heading">
          <div className="group-management-section-title">
            <h3 id="group-members-heading">Members</h3>
            <span>{members.length}</span>
          </div>
          <label className="group-management-search">
            <Search size={15} />
            <input value={memberQuery} onChange={event => setMemberQuery(event.target.value)}
              placeholder="Find a member" aria-label="Find a group member" />
          </label>
          {loading ? <div className="group-management-loading" role="status"><LoaderCircle size={17} className="spin" /> Loading members…</div> : (
            <div className="group-management-member-list">
              {visibleMembers.map(member => {
                const person = peopleById.get(member.user_id);
                const isSelf = member.user_id === session.user.id;
                const isProtected = member.role === "owner" || (currentRole === "admin" && member.role === "admin");
                const actionBusy = busy.endsWith(":" + member.user_id);
                return (
                  <div className="group-management-member" key={member.user_id}>
                    <MemberAvatar person={person} />
                    <div className="group-management-member-copy">
                      <strong>{memberName(person)}{isSelf ? " (You)" : ""}</strong>
                      <small>{person?.username ? "@" + person.username : "Chatly member"}</small>
                    </div>
                    <span className={`group-management-role role-${member.role}`}>
                      {member.role === "owner" ? <Crown size={12} /> : member.role === "admin" ? <Shield size={12} /> : null}
                      {member.role}
                    </span>
                    {canManage && !isSelf && member.role !== "owner" && (
                      <div className="group-management-member-actions">
                        {isOwner && <button type="button" title={member.role === "admin" ? "Make member" : "Make admin"}
                          aria-label={member.role === "admin" ? `Make ${memberName(person)} a member` : `Make ${memberName(person)} an admin`}
                          disabled={!!busy || loading}
                          onClick={() => runAction("role", member.user_id, member.role === "admin" ? "member" : "admin")}>
                          {member.role === "admin" ? <Users size={15} /> : <Shield size={15} />}
                        </button>}
                        <button type="button" title="Remove member" aria-label={`Remove ${memberName(person)}`}
                          disabled={!!busy || loading || isProtected || actionBusy}
                          onClick={() => removeMember(member)}><UserMinus size={15} /></button>
                      </div>
                    )}
                    {isSelf && !isOwner && <button type="button" className="group-management-leave"
                      disabled={!!busy} onClick={() => removeMember(member)}><LogOut size={14} /> Leave</button>}
                  </div>
                );
              })}
              {!visibleMembers.length && <p className="group-management-empty">No members match that search.</p>}
            </div>
          )}
        </section>

        {canManage && (
          <section className="group-management-section group-management-add" aria-labelledby="group-add-heading">
            <div className="group-management-section-title">
              <h3 id="group-add-heading">Add people</h3>
            </div>
            <label className="group-management-search">
              <Search size={15} />
              <input value={query} onChange={event => setQuery(event.target.value)}
                placeholder="Search Chatly members" aria-label="Search people to add" />
            </label>
            <div className="group-management-candidates">
              {candidates.slice(0, 8).map(person => (
                <div className="group-management-candidate" key={person.id}>
                  <MemberAvatar person={person} />
                  <div className="group-management-member-copy">
                    <strong>{memberName(person)}</strong>
                    <small>{person.username ? "@" + person.username : "Chatly member"}</small>
                  </div>
                  <button type="button" aria-label={`Add ${memberName(person)}`} title="Add member"
                    disabled={!!busy} onClick={() => runAction("add", person.id)}><UserPlus size={15} /></button>
                </div>
              ))}
              {!candidates.length && <p className="group-management-empty">No other people found.</p>}
            </div>
          </section>
        )}

        {error && <p className="group-management-error" role="alert">{error}</p>}
        {notice && <p className="group-management-notice" role="status">{notice}</p>}
        {isOwner && <p className="group-management-owner-note">Transfer ownership before leaving this group.</p>}
        <footer className="group-management-footer">
          <button type="button" onClick={onClose} disabled={!!busy}>Done</button>
        </footer>
      </section>
    </div>
  );
}
