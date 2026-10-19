import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usersApi } from '../../api/users';
import { Trash2 } from 'lucide-react';
import api from '../../lib/api';

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await usersApi.list();
    setUsers(res.data.results);
  };

  const deleteDemoData = async () => {
    if (confirm('Are you sure you want to delete all demo data?')) {
      await api.post('/api/demo-data/delete/');
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <Button onClick={deleteDemoData} variant="outline" className="text-brand-red">
          <Trash2 className="w-4 h-4 ml-2" /> حذف بيانات الديمو
        </Button>
      </div>
      <Card className="p-6">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-right p-3">اسم المستخدم</th>
              <th className="text-right p-3">الاسم الكامل</th>
              <th className="text-right p-3">الدور</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t">
                <td className="p-3">{user.username}</td>
                <td className="p-3">{user.full_name}</td>
                <td className="p-3">{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
