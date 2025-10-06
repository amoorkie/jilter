'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Specialization, SPECIALIZATION_LABELS } from '@/lib/types/employment';

interface SpecializationTabsProps {
  onSpecializationChange: (specialization: Specialization) => void;
  loading: boolean;
}

const SPECIALIZATIONS: Specialization[] = [
  'frontend', 
  'backend', 
  'fullstack', 
  'mobile', 
  'devops',
  'ui_designer',
  'ux_designer',
  'product_designer',
  'graphic_designer'
];

export default function SpecializationTabs({ onSpecializationChange, loading }: SpecializationTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const activeSpecialization = (searchParams.get('specialization') as Specialization) || 'frontend';

  const handleSpecializationChange = (specialization: Specialization) => {
    // Обновляем URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('specialization', specialization);
    router.replace(`?${params.toString()}`);
    
    // Триггерим изменение
    onSpecializationChange(specialization);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex space-x-2">
          {SPECIALIZATIONS.map((specialization) => (
            <button
              key={specialization}
              onClick={() => handleSpecializationChange(specialization)}
              disabled={loading}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeSpecialization === specialization
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {SPECIALIZATION_LABELS[specialization]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
