import { supabase } from './supabaseClient'

export const getFriendSummary = async () => {
  const { data, error } = await supabase.rpc('get_friend_summary')
  if (error) throw error
  return data || []
}

export const searchUserByEmail = async (email) => {
  const { data, error } = await supabase.rpc('search_user_by_email', { p_email: email })
  if (error) throw error
  return data?.[0] || null
}

export const createFriendCode = async () => {
  const { data, error } = await supabase.rpc('create_friend_code')
  if (error) throw error
  return data
}

export const acceptFriendCode = async (code) => {
  const { error } = await supabase.rpc('accept_friend_code', { p_code: code })
  if (error) throw error
}

export const createFriendRequest = async (friendId) => {
  const { error } = await supabase.rpc('create_friend_request', { p_friend_id: friendId })
  if (error) throw error
}

export const respondFriendRequest = async (requestId, accept) => {
  const { error } = await supabase.rpc('respond_friend_request', { p_request_id: requestId, p_accept: accept })
  if (error) throw error
}

export const createFriendInvite = async (email) => {
  const { error } = await supabase.rpc('create_friend_invite', { p_email: email })
  if (error) throw error
}

export const acceptFriendInvite = async (inviteId) => {
  const { error } = await supabase.rpc('accept_friend_invite', { p_invite_id: inviteId })
  if (error) throw error
}
