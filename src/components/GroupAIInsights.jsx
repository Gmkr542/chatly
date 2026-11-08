import React, { useCallback, useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, Circle, LoaderCircle, LockKeyhole, Sparkles, X } from "lucide-react";
import { getGroupAIConsentState, requestGroupAIInsights, setGroupAIConsent } from "../lib/groupAi";
import "./GroupAIInsights.css";

export default function GroupAIInsights({ group, session, onClose }) {
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setState(await getGroupAIConsentState(group.id));
    } catch (err) {
      setError(err.message || "Could not load group AI consent.");
    } finally {
      setLoading(false);
    }
  }, [group.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const myConsent = state?.consents.find(item => item.userId === session.user.id)?.consented === true;
  const updateConsent = async checked => {
    setSaving(true);
    setError("");
    try {
      await setGroupAIConsent(group.id, session.user.id, checked);
      setResult(null);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not update your consent.");
    } finally {
      setSaving(false);
    }
  };

  const runInsights = async () => {
    if (!state?.allConsented || running) return;
    setRunning(true);
    setError("");
    setResult(null);
    try {
      setResult(await requestGroupAIInsights(group.id));
    } catch (err) {
      setError(err.message || "Group AI could not run.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="group-ai-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget && !saving && !running) onClose?.();
    }}>
      <section className="group-ai-dialog" role="dialog" aria-modal="true" aria-labelledby="group-ai-title">
        <header className="group-ai-header">
          <span className="group-ai-icon"><BrainCircuit size={20}/></span>
          <div><h2 id="group-ai-title">Group AI insights</h2><p>{group.name || "Group conversation"}</p></div>
          <button type="button" aria-label="Close group AI insights" onClick={onClose} disabled={saving || running}><X size={18}/></button>
        </header>
        <div className="group-ai-privacy"><LockKeyhole size={17}/><p>AI is off until every current member opts in. When requested, the latest 80 messages are sent to the configured AI provider. Results are not saved by Chatly.</p></div>
        <section className="group-ai-consent">
          <h3>Your consent</h3>
          <label className="group-ai-toggle">
            <input type="checkbox" checked={myConsent} disabled={loading || saving || !state?.memberIds.includes(session.user.id)}
              onChange={event => updateConsent(event.target.checked)}/>
            <span><strong>Allow AI analysis for this group</strong><small>You can turn this off at any time. New members must opt in separately.</small></span>
          </label>
        </section>
        <section className="group-ai-members">
          <h3>Member consent</h3>
          {loading ? <p className="group-ai-muted"><LoaderCircle className="group-ai-spin" size={15}/> Checking consent…</p> : state?.consents.map(member => (
            <div className="group-ai-member" key={member.userId}>
              <span>{member.userId === session.user.id ? "You" : `Member · ${member.userId.slice(0, 8)}`}</span>
              <span className={member.consented ? "is-consented" : "is-pending"}>{member.consented ? <><CheckCircle2 size={14}/> Opted in</> : <><Circle size={14}/> Not opted in</>}</span>
            </div>
          ))}
        </section>
        <button type="button" className="group-ai-run" disabled={!state?.allConsented || loading || running || saving}
          onClick={runInsights}>{running ? <><LoaderCircle className="group-ai-spin" size={16}/> Analysing…</> : <><Sparkles size={16}/> Generate insights</>}</button>
        {!state?.allConsented && !loading && <p className="group-ai-muted">Waiting for every group member to opt in. Chatly cannot enable consent for someone else.</p>}
        {error && <p className="group-ai-error" role="alert">{error}</p>}
        {result && <div className="group-ai-result" aria-live="polite">
          <h3>Conversation summary</h3><p>{result.summary}</p>
          {!!result.topics?.length && <><h4>Topics</h4><ul>{result.topics.map((topic, index) => <li key={index}>{topic}</li>)}</ul></>}
          {!!result.action_items?.length && <><h4>Action items</h4><ul>{result.action_items.map((item, index) => <li key={index}>{item.task}{item.owner ? ` — ${item.owner}` : ""}</li>)}</ul></>}
          {!!result.unanswered_questions?.length && <><h4>Unanswered questions</h4><ul>{result.unanswered_questions.map((question, index) => <li key={index}>{question}</li>)}</ul></>}
          <small>Based on {result.message_count} recent messages · Not saved</small>
        </div>}
      </section>
    </div>
  );
}
