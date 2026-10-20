import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { usersApi } from '../../api/users';

export function UserFormModal({ open, onClose, onSuccess, user }: any) {
  const { register, handleSubmit, reset, setValue } = useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      Object.keys(user).forEach(key => setValue(key, user[key]));
    } else {
      reset();
    }
  }, [user, setValue, reset]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      if (user) {
        await usersApi.update(user.id, data);
      } else {
        await usersApi.create(data);
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={user ? 'تعديل مستخدم' : 'إضافة مستخدم'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
        <Input label="اسم المستخدم" {...register('username', { required: true })} />
        <Input label="الاسم الكامل" {...register('full_name', { required: true })} />
        <Input label="البريد الإلكتروني" type="email" {...register('email')} />
        <Input label="رقم الهاتف" {...register('phone')} />

        {!user && <Input label="كلمة المرور" type="password" {...register('password', { required: true })} />}

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={loading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  );
}
