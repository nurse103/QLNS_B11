import { supabase } from './supabaseClient';
import { NCKH } from '../types';

export const getNCKH = async (page = 1, pageSize = 10, searchTerm = '', status = '', level = '') => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('nckh')
    .select(`
      *,
      dsnv (
        ho_va_ten
      )
    `, { count: 'exact' });

  if (searchTerm) {
    query = query.or(`ten_de_tai.ilike.%${searchTerm}%,cap_quan_ly.ilike.%${searchTerm}%,ket_qua.ilike.%${searchTerm}%,vai_tro.ilike.%${searchTerm}%`);
  }

  if (status) {
    query = query.eq('trang_thai', status);
  }

  if (level) {
    query = query.eq('cap_quan_ly', level);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  // Fetch counts for stats (filtered but not paginated)
  let statsQuery = supabase.from('nckh').select('*', { count: 'exact', head: true });
  if (searchTerm) statsQuery = statsQuery.or(`ten_de_tai.ilike.%${searchTerm}%,cap_quan_ly.ilike.%${searchTerm}%`);
  if (status) statsQuery = statsQuery.eq('trang_thai', status);
  if (level) statsQuery = statsQuery.eq('cap_quan_ly', level);

  const { count: ongoingCount } = await supabase.from('nckh').select('*', { count: 'exact', head: true }).eq('trang_thai', 'Đang thực hiện');
  const { count: completedCount } = await supabase.from('nckh').select('*', { count: 'exact', head: true }).eq('trang_thai', 'Đã nghiệm thu');
  const { count: globalTotal } = await supabase.from('nckh').select('*', { count: 'exact', head: true });

  return {
    data: data.map(item => ({
      ...item,
      ho_va_ten: item.dsnv?.ho_va_ten
    })) as NCKH[],
    totalCount: count || 0,
    stats: {
        total: globalTotal || 0,
        ongoing: ongoingCount || 0,
        completed: completedCount || 0
    }
  };
};

export const createNCKH = async (nckh: Partial<NCKH>, userId: string) => {
  const { ho_va_ten, ...submitData } = nckh;
  
  const { data, error } = await supabase
    .from('nckh')
    .insert([{ ...submitData, created_by: userId }])
    .select()
    .single();

  if (error) throw error;
  return data as NCKH;
};

export const updateNCKH = async (id: string, nckh: Partial<NCKH>) => {
  const { ho_va_ten, dsnv, ...updateData } = nckh as any;
  const { data, error } = await supabase
    .from('nckh')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NCKH;
};

export const deleteNCKH = async (id: string) => {
  const { error } = await supabase
    .from('nckh')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const uploadNCKHFiles = async (files: File[]) => {
  const uploadPromises = files.map(async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('file_nckh')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('file_nckh')
      .getPublicUrl(filePath);

    return publicUrl;
  });

  return Promise.all(uploadPromises);
};
