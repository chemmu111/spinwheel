import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, UserPlus, Users, Trash2, Edit3, RefreshCw, AlertCircle, Check, X } from 'lucide-react';
import type { Student } from '../lib/types';

export function AdminPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('coupon_number', { ascending: true });

    if (error) {
      console.error('Error loading students:', error);
    } else {
      setStudents(data || []);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getNextCouponNumber = () => {
    if (students.length === 0) return 101;
    const usedNumbers = students.map(s => s.coupon_number);
    for (let i = 101; i <= 131; i++) {
      if (!usedNumbers.includes(i)) {
        return i;
      }
    }
    return null;
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !phone) {
      setError('Name and phone are required!');
      return;
    }

    if (!editingId && !photo) {
      setError('Photo is required for new students!');
      return;
    }

    if (!editingId && students.length >= 31) {
      setError('Maximum 31 students allowed!');
      return;
    }

    setLoading(true);

    try {
      let photoUrl = photoPreview;

      const getFileExt = (file: File) => {
        const name = file.name;
        const lastDot = name.lastIndexOf('.');
        return lastDot === -1 ? 'jpg' : name.substring(lastDot + 1);
      };

      if (editingId) {
        // Edit Mode - No count check needed
        const student = students.find(s => s.id === editingId);
        if (!student) throw new Error('Student not found');

        if (photo) {
          const fileExt = getFileExt(photo);
          const fileName = `photos/${Date.now()}-${student.coupon_number}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('students')
            .upload(fileName, photo, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from('students')
            .getPublicUrl(fileName);

          photoUrl = data.publicUrl;
        } else {
          photoUrl = student.photo_url;
        }

        const { error: updateError } = await supabase
          .from('students')
          .update({
            name,
            phone,
            photo_url: photoUrl
          } as any)
          .eq('id', editingId);

        if (updateError) throw updateError;
        setSuccess('Student updated successfully!');
        setEditingId(null);
      } else {
        // Add Mode - Check count first
        const { count, error: countError } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        if (count !== null && count >= 31) {
          setError('Maximum 31 students allowed!');
          setLoading(false);
          return;
        }

        const nextCouponNumber = getNextCouponNumber();
        if (!nextCouponNumber) {
          setError('No coupon numbers available!');
          setLoading(false);
          return;
        }

        if (!photo) throw new Error('Photo required');

        const fileExt = getFileExt(photo);
        const fileName = `photos/${Date.now()}-${nextCouponNumber}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('students')
          .upload(fileName, photo, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('students')
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from('students')
          .insert({
            coupon_number: nextCouponNumber,
            name,
            phone,
            photo_url: data.publicUrl
          } as any);

        if (insertError) throw insertError;
        setSuccess(`Student added! Coupon #${nextCouponNumber}`);
      }

      setName('');
      setPhone('');
      setPhoto(null);
      setPhotoPreview(null);
      loadStudents();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save student');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setName(student.name);
    setPhone(student.phone);
    setPhotoPreview(student.photo_url);
    setPhoto(null);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPhoto(null);
    setPhotoPreview(null);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('Student deleted!');
      loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          is_winner: false,
          won_at: null,
          win_spin_number: null
        } as any)
        .eq('is_winner', true);

      if (error) throw error;

      setSuccess('Draw restarted! All winners cleared.');
      setShowRestartConfirm(false);
      loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-orange-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gray-900/70 backdrop-blur-md rounded-xl shadow-xl p-6 border border-purple-400/30 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-yellow-400" />
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                ADMIN
              </h2>
            </div>

            {students.some(s => s.is_winner) && (
              <button
                onClick={() => setShowRestartConfirm(true)}
                disabled={loading}
                className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-lg transition-all transform hover:shadow-lg active:scale-95 disabled:opacity-50 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Restart
              </button>
            )}
          </div>

          <div className="mb-4 p-3 bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg border border-yellow-400/50">
            <p className="text-sm font-bold text-yellow-200">
              Registered: {students.length} / 31
            </p>
            {students.length < 31 && (
              <p className="text-xs text-yellow-300 mt-1">
                Next Coupon: #{getNextCouponNumber()}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="bg-gray-950 rounded-lg p-4 border border-purple-400/30">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingId ? 'Edit Student' : 'Add Student'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-yellow-300 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-purple-400/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter name"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-yellow-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-purple-400/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter phone"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-yellow-300 mb-1">
                Photo {editingId && '(Optional)'}
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 rounded-lg cursor-pointer transition-all font-semibold text-white text-sm">
                  <Upload className="w-4 h-4" />
                  Choose
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-yellow-400/50"
                  />
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-400/50 text-red-200 rounded-lg mb-4 flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-900/50 border border-green-400/50 text-green-200 rounded-lg mb-4 flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {success}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || (!editingId && students.length >= 31)}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-gray-900 font-bold rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:shadow-lg active:scale-95 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                {loading ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all text-sm"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-gray-900/70 backdrop-blur-md rounded-xl shadow-xl p-6 border border-purple-400/30">
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300 mb-4">
            Students
          </h3>

          {students.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">No students yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col p-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-purple-400/30 hover:border-yellow-400/50 transition-colors"
                >
                  <div className="relative mb-2">
                    <img
                      src={student.photo_url}
                      alt={student.name}
                      className="w-full h-24 rounded-lg object-cover border border-yellow-300/50"
                    />
                    {student.is_winner && (
                      <div className="absolute top-1 right-1 px-2 py-1 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full">
                        ✓
                      </div>
                    )}
                  </div>

                  <div className="flex-1 mb-2">
                    <p className="font-bold text-yellow-300 text-sm">#{student.coupon_number}</p>
                    <p className="text-gray-200 font-semibold text-sm truncate">{student.name}</p>
                    <p className="text-gray-400 text-xs">{student.phone}</p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(student)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs disabled:opacity-50 transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded text-xs disabled:opacity-50 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border-2 border-yellow-400 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-yellow-300 mb-3">Restart Draw?</h3>
            <p className="text-gray-300 text-sm mb-4">
              This will clear all winners. Student data will be preserved. Continue?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRestart}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 text-sm"
              >
                Yes
              </button>
              <button
                onClick={() => setShowRestartConfirm(false)}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
