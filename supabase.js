const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://gogvhfxzhaflytkhinld.supabase.co', 'sb_publishable_IPD9yqGqatkh5bboNytovw_S7WhcMHp');

module.exports = supabase;
