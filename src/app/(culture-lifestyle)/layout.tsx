"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function CultureLayout({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Jika tidak ada tiket masuk, tendang ke halaman auth
        router.push('/auth');
      } else {
        setIsAuthorized(true);
      }
    };
    
    checkUser();
  }, [router]);

  // Tampilkan layar loading keren saat memverifikasi
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-gray-500 tracking-widest text-sm">VERIFYING CLEARANCE...</p>
      </div>
    );
  }

  // Jika lolos, render Sidebar dan konten halamannya
  return (
    <div className="flex bg-gray-50 dark:bg-[#121212] min-h-screen">
      <Sidebar />
      <main className="flex-1 w-full overflow-x-hidden p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}