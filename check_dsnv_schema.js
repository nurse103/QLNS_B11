const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('dsnv')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in dsnv table:');
        console.log(Object.keys(data[0]).join(', '));
    } else {
        console.log('No data in dsnv table to check columns.');
    }
}

checkSchema();
