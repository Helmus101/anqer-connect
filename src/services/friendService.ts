import { supabase } from '../lib/supabase'

export const sendFriendRequest = async (email: string) => {
    const { data, error } = await supabase.rpc('send_friend_request', { target_email: email })
    if (error) throw error
    return data // { success: boolean, message: string }
}

export const acceptFriendRequest = async (requestId: string) => {
    const { data, error } = await supabase.rpc('accept_friend_request', { request_id: requestId })
    if (error) throw error
    return data
}

export const getFriendRequests = async () => {
    // UPDATED: Use RPC to securely fetch requests with emails
    const { data, error } = await supabase.rpc('get_pending_requests')

    if (error) throw error
    return data
}

export const getFriends = async () => {
    // UPDATED: Use RPC to securely fetch friends with emails
    const { data, error } = await supabase.rpc('get_my_friends')

    if (error) throw error
    return data
}

export const searchNetwork = async (query: string) => {
    const { data, error } = await supabase.rpc('search_network', { search_query: query })
    if (error) throw error
    return data // Array of { contact_id, contact_name, ..., is_own_contact }
}
