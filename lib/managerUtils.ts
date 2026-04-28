import { supabase } from './supabase';

export type UserRole = 'admin' | 'manager';

export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const { data, error } = await supabase
      .from('managers')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !data) return 'admin';
    return 'manager';
  } catch (error) {
    return 'admin';
  }
}

export async function isUserManager(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('managers')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) return false;
    return !!data;
  } catch (error) {
    return false;
  }
}

export async function getManagerId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('managers')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) return null;
    return data?.id || null;
  } catch (error) {
    return null;
  }
}

export async function createManagerRequest(
  managerId: string,
  requestType: string,
  entityType: string,
  actionData: any,
  entityId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('manager_requests').insert([
      {
        manager_id: managerId,
        request_type: requestType,
        entity_type: entityType,
        entity_id: entityId,
        action_data: actionData,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('Error creating request:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error creating manager request:', error);
    return false;
  }
}
