import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eghxnyzdnahwmpziwanz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnaHhueXpkbmFod21weml3YW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NDk2MzgsImV4cCI6MjA4NDEyNTYzOH0.VEKpQcEVuyRmJoA4olnAQKTYMfTYQdNL21ZZOq6agME';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    const { data, error } = await supabase.from('qua_trinh_dao_tao').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('No data found in qua_trinh_dao_tao to check columns.');
    }
}

checkSchema();
