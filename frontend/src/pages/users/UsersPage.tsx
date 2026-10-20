import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usersApi } from '../../api/users';
import { Trash2, Plus, UserCog } from 'lucide-react';
import api from '../../lib/api';
import { UserFormModal } from '../../components/users/UserFormModal';

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await usersApi.list();
    setUsers(res.data.results);
  };

  const deleteDemoData = async () => {
    if (confirm('هل أنت مطموع من حذف بيانات الديمو؟')) {
      await api.post('/api/demo-data/delete/');
      fetchUsers();
    }
  };

  const deleteUser = async (id: string) => {
    if (confirm('هل أنت مطموع من حذف هذا المستخدم؟')) {
      await usersApi.delete(id);
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <div className="flex gap-2">
          <Button onClick={() => { setEditUser(null); setFormOpen(true); }} variant="secondary">
            <Plus className="w-4 h-4 ml-2" /> إضافة مستخدم
          </Button>
          <Button onClick={deleteDemoData} variant="outline" className="text-brand-red">
            <Trash2 className="w-4 h-4 ml-2" /> حذف بيانات الديمو
          </Button>
        </div>
      </div>
      <Card className="p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-right p-3">اسم المستخدم</th>
              <th className="text-right p-3">الاسم الكامل</th>
              <th className="text-right p-3">الدور</th>
              <th className="text-right p-3">actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t">
                <td className="p-3">{user.username}</td>
                <td className="p-3">{user.full_name}</td>
                <td className="p-3">{user.role}</td>
                <td className="p-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditUser(user); setFormOpen(true); }}>
                    <UserCog className="w-4 h-4 ml-2" /> الصلاحيات
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteUser(user.id)} className="text-brand-red">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchUsers}
        user={editUser}
      />
    </div>
  );
}