import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create admin client (uses SUPABASE_SERVICE_ROLE_KEY from env)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Create manager record in database
    const { data: managerData, error: dbError } = await supabaseAdmin
      .from('managers')
      .insert([
        {
          user_id: authData.user.id,
          email: email,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dbError) {
      // If database insert fails, delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: dbError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      manager: managerData,
    });
  } catch (error) {
    console.error('Error creating manager:', error);
    return NextResponse.json(
      { error: 'Failed to create manager account' },
      { status: 500 }
    );
  }
}
