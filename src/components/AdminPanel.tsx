import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, UserPlus, Users, Trash2, Edit3, RefreshCw, AlertCircle } from 'lucide-react';
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

      if (editingId) {
        const student = students.find(s => s.id === editingId);
        if (!student) throw new Error('Student not found');

        if (photo) {
          const fileExt = photo.name.split('.').pop();
          const fileName = `${student.coupon_number}-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('student-photos')
            .upload(fileName, photo);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('student-photos')
            .getPublicUrl(fileName);

          photoUrl = publicUrl;
        } else {
          photoUrl = student.photo_url;
        }

        const { error: updateError } = await supabase
          .from('students')
          .update({
            name,
            phone,
            photo_url: photoUrl
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        setSuccess('Student updated successfully!');
        setEditingId(null);
      } else {
        const nextCouponNumber = getNextCouponNumber();
        if (!nextCouponNumber) {
          setError('No coupon numbers available!');
          setLoading(false);
          return;
        }

        if (!photo) throw new Error('Photo required');

        const fileExt = photo.name.split('.').pop();
        const fileName = `${nextCouponNumber}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('student-photos')
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from('students')
          .insert({
            coupon_number: nextCouponNumber,
            name,
            phone,
            photo_url: publicUrl
          });

        if (insertError) throw insertError;
        setSuccess(`Student added successfully! Coupon #${nextCouponNumber}`);
      }

      setName('');
      setPhone('');
      setPhoto(null);
      setPhotoPreview(null);
      loadStudents();
    } catch (err) {
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
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('Student deleted successfully!');
      loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete student');
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
          won_at: null
        })
        .eq('is_winner', true);

      if (error) throw error;

      setSuccess('Lucky Draw restarted! All winners cleared. Ready for a new round!');
      setShowRestartConfirm(false);
      loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart draw');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-orange-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 border-2 border-purple-400 mb-8">
          <div className="flex items-center gap-3 mb-6 justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-10 h-10 text-yellow-400" />
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                ADMIN PANEL
              </h2>
            </div>

            {students.some(s => s.is_winner) && (
              <button
                onClick={() => setShowRestartConfirm(true)}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className="w-5 h-5" />
                Restart Draw
              </button>
            )}
          </div>

          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-900 to-orange-900 rounded-xl border-2 border-yellow-400">
            <p className="text-lg font-bold text-yellow-200">
              Students Registered: {students.length} / 31
            </p>
            {students.length < 31 && (
              <p className="text-sm text-yellow-300 mt-1">
                Next Coupon Number: #{getNextCouponNumber()}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="bg-gray-950 rounded-2xl p-6 border-2 border-purple-400 mb-6">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Edit Student' : 'Add New Student'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-yellow-300 mb-2">
                  Student Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-purple-400 rounded-lg text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter student name"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-yellow-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-purple-400 rounded-lg text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter phone number"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-yellow-300 mb-2">
                Student Photo {editingId ? '(Optional - leave empty to keep current)' : '(Required)'}
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 rounded-lg cursor-pointer transition-all font-bold text-white">
                  <Upload className="w-5 h-5" />
                  <span>Choose Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                {photoPreview && (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-lg object-cover border-2 border-yellow-400"
                    />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-900/50 border-2 border-red-400 text-red-200 rounded-lg mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-900/50 border-2 border-green-400 text-green-200 rounded-lg mb-6">
                {success}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || students.length >= 31}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-gray-900 font-bold rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
              >
                <UserPlus className="w-5 h-5" />
                {loading ? 'Saving...' : editingId ? 'Update Student' : 'Add Student'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 border-2 border-purple-400">
          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300 mb-6">
            Registered Students
          </h3>

          {students.length === 0 ? (
            <p className="text-gray-400 text-lg text-center py-12">No students registered yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-purple-400 hover:border-yellow-400 transition-colors"
                >
                  <div className="relative mb-4">
                    <img
                      src={student.photo_url}
                      alt={student.name}
                      className="w-full h-32 rounded-lg object-cover border-2 border-yellow-300"
                    />
                    {student.is_winner && (
                      <div className="absolute top-2 right-2 px-3 py-1 bg-yellow-400 text-gray-900 text-xs font-black rounded-full">
                        WINNER
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-bold text-yellow-300 text-lg">#{student.coupon_number}</p>
                    <p className="text-gray-200 font-semibold">{student.name}</p>
                    <p className="text-gray-400 text-sm">{student.phone}</p>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEdit(student)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all text-sm disabled:opacity-50"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all text-sm disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
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
          <div className="bg-gray-900 border-4 border-yellow-400 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-black text-yellow-300 mb-4">Restart Lucky Draw?</h3>
            <p className="text-gray-300 mb-6">
              This will reset the spin count and clear all winner statuses. Student data will be preserved. Are you sure?
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleRestart}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
              >
                Yes, Restart
              </button>
              <button
                onClick={() => setShowRestartConfirm(false)}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
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
