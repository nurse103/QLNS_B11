
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema(table) {
    console.log(`--- Schema for ${table} ---`);
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

    if (error) {
        console.error(`Error fetching ${table}:`, error);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log(`No data in ${table} to infer columns.`);
        // Try to get columns even if no data
        const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: table });
        if (colError) {
            console.log('Could not get columns via RPC either.');
        } else {
            console.log('Columns via RPC:', cols);
        }
    }
}

async function run() {
    await checkSchema('qua_trinh_cong_tac');
    await checkSchema('qua_trinh_dao_tao');
}

run();
