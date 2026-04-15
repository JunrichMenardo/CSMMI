const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('Add this to your .env.local:');
  console.error('SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>');
  console.error('\nFind it in Supabase Dashboard → Settings → API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedUser() {
  try {
    const email = 'admin@csmmi.com';
    const password = 'Admin@123456';

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);

    if (userExists) {
      console.log('✅ User already exists:', email);
      console.log('✅ Password: Admin@123456');
      return;
    }

    // Create new user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin User',
      },
    });

    if (error) {
      console.error('❌ Error creating user:', error.message);
      process.exit(1);
    }

    console.log('✅ Test account created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('\n✨ You can now login to the app!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seedUser();
