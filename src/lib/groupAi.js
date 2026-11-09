import { supabase } from "./supabase";

/**
 * Records only the signed-in member's explicit choice. Missing rows remain opt-out.
 */
export async function setGroupAIConsent(conversationId, userId, consented) {
  if (!supabase) throw new Error("Chatly is not connected to Supabase.");
  const { error } = await supabase.from("group_ai_consents").upsert({
    conversation_id: conversationId,
    user_id: userId,
    consented: Boolean(consented),
    updated_at: new Date().toISOString(),
  }, { onConflict: "conversation_id,user_id" });
  if (error) throw error;
}

export async function getGroupAIConsentState(conversationId) {
  if (!supabase) throw new Error("Chatly is not connected to Supabase.");
  const [{ data: members, error: memberError }, { data: consents, error: consentError }] = await Promise.all([
    supabase.from("group_conversation_members").select("user_id").eq("conversation_id", conversationId),
    supabase.from("group_ai_consents").select("user_id,consented").eq("conversation_id", conversationId),
  ]);
  if (memberError) throw memberError;
  if (consentError) throw consentError;
  const consentByUser = new Map((consents || []).map(row => [row.user_id, row.consented === true]));
  const memberIds = (members || []).map(row => row.user_id);
  return {
    memberIds,
    consents: memberIds.map(userId => ({ userId, consented: consentByUser.get(userId) === true })),
    allConsented: memberIds.length > 0 && memberIds.every(userId => consentByUser.get(userId) === true),
  };
}

export async function requestGroupAIInsights(conversationId) {
  if (!supabase) throw new Error("Chatly is not connected to Supabase.");
  const { data, error } = await supabase.functions.invoke("group-ai-insights", {
    body: { conversationId },
  });
  if (error) throw new Error(error.message || "Group AI could not run.");
  if (data?.error) throw new Error(data.error);
  return data;
}
